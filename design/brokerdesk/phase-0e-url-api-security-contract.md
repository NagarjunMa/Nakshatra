# BrokerDesk Phase 0E — URL, API, and Security Contract

Status: Approved baseline for Phase 0F; no route or production security change is authorized  
Depends on: Phase 0C state contract and Phase 0D database/authorization architecture  
Scope: Browser URLs, application APIs, identifiers, sessions, tokens, rate limits, network controls, response projections, and abuse testing for the B2C and BrokerDesk surfaces.

## 1. Outcomes

This contract ensures that:

1. One Nakshatra account can use customer and BrokerDesk surfaces safely.
2. Customers see a unified Introduction history across all of their brokers.
3. Each broker sees only its agency's customer relationships and Introduction routes.
4. Changing a URL, request body, cursor, header, or object identifier never grants access.
5. B2C and BrokerDesk reuse one authentication, portfolio, consent, verification, and disclosure foundation.
6. URLs remain readable for less technical users without carrying names, phone numbers, email addresses, caste/community data, or other personal information.
7. Every sensitive command is authorized again at the server and database boundary.

## 2. URL design principles

- Page URLs are navigation addresses, not permissions.
- Use separate customer-case and broker-route public references for the same Introduction.
- Never place internal database UUIDs, customer names, emails, phone numbers, organization names, or decision states in URLs.
- Use opaque, random, nonsequential public references with at least 128 bits of entropy.
- Type prefixes improve validation and operational clarity without revealing private data.
- Do not accept organization or customer identity from query parameters when it can be derived from an authorized resource.
- Query parameters are limited to allowlisted filters, cursors, and display state.
- Every protected page performs authoritative server-side authorization before loading private data.
- Unauthorized and nonexistent object references produce indistinguishable object-level responses.
- Canonical hosts and normalized paths prevent host-header, alternate-origin, and path-confusion problems.

Recommended public reference examples:

| Resource | Example shape | Surface |
|---|---|---|
| Broker workspace | `wrk_` + random base58/base32 value | BrokerDesk only |
| Agency customer relationship | `bcr_` + random value | That agency only |
| Broker Introduction route | `bir_` + random value | That agency only |
| Customer Introduction case | `inc_` + unrelated random value | Involved customers only |
| Customer-safe report | `rpt_` + random value | Authorized customer and creating agency projections |
| Task | `tsk_` + random value | Owning agency only |

The prefix is validated before a database call. The random portion is generated with a cryptographically secure generator. Public references are never derived from internal UUIDs, timestamps, emails, phone numbers, or one another.

## 3. Browser route map

### 3.1 Shared and public routes

| URL | Purpose | Access |
|---|---|---|
| `/` | Nakshatra product entry | Public |
| `/login` | Shared authentication | Public; signed-in users are redirected by server state |
| `/signup` | Shared account creation | Public |
| `/brokerdesk` | BrokerDesk gateway: resume onboarding, choose workspace, or open workspace | Authenticated broker/member |
| `/brokerdesk/onboarding` | Broker/business onboarding | Authenticated; server-owned onboarding state |
| `/join/customer` | Customer invitation bootstrap | Public shell; token exchange required |
| `/join/team` | Agency employee invitation bootstrap | Public shell; token exchange required |
| `/p/[shareToken]` | Existing B2C published portfolio | Existing B2C capability policy |
| `/verify/[token]` | Existing verification link | Existing compatibility route; reviewed during token migration |
| `/privacy`, `/terms`, `/about` | Policy/information | Public |

`/login` and `/signup` may accept a signed, allowlisted product intent such as customer or BrokerDesk. Client input never assigns a role, membership, organization, or onboarding completion.

### 3.2 Customer routes

| URL | Purpose |
|---|---|
| `/dashboard` | Unified customer home and actions |
| `/portfolio` | Current portfolio status and preview |
| `/portfolio/edit` | Edit customer-owned draft |
| `/introductions` | All Introductions from all brokers, grouped by counterpart |
| `/introductions/[caseRef]` | Customer-safe combined Introduction detail |
| `/brokers` | Private list of the customer's broker relationships |
| `/access` | Active disclosure grants and privacy controls |
| `/account` | Account, sessions, export, deletion, security |

Existing `/edit`, `/preview`, and `/approved-preview` may remain during migration and later redirect to canonical customer routes. Redirects must preserve only allowlisted display state and never carry private fields.

The customer URL contains the pair-level `inc_...` reference. It never contains a broker-route ID in the page path. Route selection happens using an authorized route reference supplied inside the customer projection.

### 3.3 BrokerDesk routes

| URL | Purpose |
|---|---|
| `/brokerdesk/w/[workspaceRef]/dashboard` | “What should I work on now?” |
| `/brokerdesk/w/[workspaceRef]/customers` | Customer list and filters |
| `/brokerdesk/w/[workspaceRef]/customers/[relationshipRef]` | One agency-customer relationship |
| `/brokerdesk/w/[workspaceRef]/customers/[relationshipRef]/suggestions` | Private, bounded potential matches |
| `/brokerdesk/w/[workspaceRef]/introductions` | Agency Introduction queue |
| `/brokerdesk/w/[workspaceRef]/introductions/new` | Send-Introduction workflow |
| `/brokerdesk/w/[workspaceRef]/introductions/[routeRef]` | One agency route and its own timeline |
| `/brokerdesk/w/[workspaceRef]/tasks` | Actionable tasks |
| `/brokerdesk/w/[workspaceRef]/settings` | Business and workspace settings |
| `/brokerdesk/w/[workspaceRef]/settings/team` | Members, roles, assignments |
| `/brokerdesk/w/[workspaceRef]/settings/verification` | Business verification |
| `/brokerdesk/w/[workspaceRef]/settings/imports` | Customer import batches |

The broker URL uses `wrk_...`, `bcr_...`, and `bir_...` references. It never exposes `inc_...`, another agency's route reference, or internal candidate IDs.

The workspace reference is explicit because one account may belong to several organizations. It is still re-authorized on every request; an “active workspace” cookie or UI selection is only a convenience and is not trusted.

## 4. Invitation and notification links

### Broker/customer/team invitations

New BrokerDesk invitations should use a fragment token where platform/browser support is adequate:

```text
https://app.example.com/join/customer#token=<high-entropy-token>
https://app.example.com/join/team#token=<high-entropy-token>
```

The fragment is exchanged by same-origin code for a short-lived, HttpOnly, Secure, SameSite cookie and then removed from browser history. This reduces token exposure in server, CDN, proxy, analytics, and referrer logs.

If an accessibility or compatibility fallback places the token in the path/query, the first request must redact logs, apply `Referrer-Policy: no-referrer`, exchange once, and redirect immediately to a clean URL. Link scanners must not consume the invitation merely by issuing a GET.

### Ordinary Introduction notifications

An authenticated Introduction email may link directly to `/introductions/inc_...`. The opaque reference is not a capability. A forwarded link reveals no data because the receiving account must be an authorized case participant. Emails contain no private portfolio, contact details, or static biodata attachment.

### Return destinations

Authentication accepts only a server-allowlisted relative destination. Reject absolute URLs, protocol-relative values, encoded alternate schemes, control characters, duplicate parameters, and destinations outside the appropriate product surface. Store sensitive continuation state server-side rather than in query strings.

## 5. Application/API boundary

BrokerDesk browser code does not query private Supabase tables or RPCs directly. The required path is:

```text
Browser or Server Component
        → Next.js route/Data Access Layer
        → domain service
        → repository
        → narrowly granted database command/projection
        → private workflow tables
```

This follows the existing route-handler → service → repository → database pattern. Server-rendered pages may call the same services directly, but they do not bypass authorization or return larger projections.

BrokerDesk does not expose generic CRUD, arbitrary PostgREST filters, GraphQL access to workflow tables, arbitrary sort columns, or client-selectable response fields. Commands express business intent and the server derives tenant and actor context.

New endpoints are versioned under `/api/v1`. Existing B2C `/api/*` routes remain until a planned compatibility migration.

## 6. API contract conventions

### Request requirements

- HTTPS only in every nonlocal environment.
- Authenticated session cookie for protected endpoints.
- Valid live backing session, not JWT presence alone.
- `Origin` and Fetch Metadata checks for cookie-authenticated mutations.
- Session-bound CSRF nonce header for mutations as defense in depth.
- `Content-Type: application/json` for JSON commands; reject unexpected/safelisted mutation content types.
- Strict bounded schema validation; unknown properties rejected for sensitive commands.
- Mandatory `Idempotency-Key` for create/send/decision/disclosure/import commands.
- `If-Match` with the last projection version for state-dependent commands.
- Body and field-length limits before parsing.
- Correlation/request ID generated or normalized by the server.

Never accept `user_id`, `organization_id`, `candidate_id`, role, capability, ownership, verification result, grant state, price, or audit actor as authoritative body fields.

### Response requirements

Every private response uses:

```text
Cache-Control: private, no-store
Pragma: no-cache
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

State projections include an opaque version/ETag. Commands return the minimal updated projection or an accepted job reference. Do not echo the submitted payload.

Recommended error envelope:

```json
{
  "code": "INTRODUCTION_STATE_CHANGED",
  "message": "This introduction changed. Refresh and try again.",
  "requestId": "req_..."
}
```

Error policy:

| Situation | HTTP status | Disclosure rule |
|---|---:|---|
| Missing/invalid/revoked session | 401 | Safe session guidance |
| Collection/function forbidden | 403 | Only when no object existence is implied |
| Missing or unauthorized object reference | 404 | Same body and similar processing path |
| Invalid bounded input | 400 | Field-safe errors; no database details |
| Stale version/invalid transition/idempotency conflict | 409 | Customer/broker-safe state message |
| Oversized request | 413 | No parser/storage processing |
| Rate limited | 429 | `Retry-After`; no quota internals |
| Dependency unavailable where safety cannot be proved | 503 | Fail closed for mutations |

Never return SQL codes/messages, stack traces, policy names, internal UUIDs, storage keys, competitor information, or raw vendor responses.

## 7. Customer API surface

All object resolution begins with the authenticated customer's candidate ownership/delegation and Introduction participation.

| Method and path | Purpose | Important rules |
|---|---|---|
| `GET /api/v1/customer/home` | Action summary | Bounded counts and next actions only |
| `GET /api/v1/customer/introductions?state=&cursor=` | Unified list | Opaque cursor; grouped by counterpart; no agency-private data |
| `GET /api/v1/customer/introductions/[caseRef]` | Combined detail | Participant authorization; current permitted portfolio projection |
| `POST /api/v1/customer/introductions/[caseRef]/interest` | Show interest and select route | Body contains eligible customer-visible `routeRef`; idempotency and version required |
| `POST /api/v1/customer/introductions/[caseRef]/reject` | Reject person for the round | Explicit confirmation; applies at person level |
| `POST /api/v1/customer/introductions/[caseRef]/block` | Never show again | Fresh authentication; strong confirmation |
| `POST /api/v1/customer/introductions/[caseRef]/unblock` | Reverse block if policy permits | Fresh authentication; audited; no broker action |
| `POST /api/v1/customer/introductions/[caseRef]/retry-requests` | Ask for an eligible retry | Cannot override cooling/block/privacy restrictions |
| `POST /api/v1/customer/introductions/[caseRef]/reports/[reportRef]/confirm` | Confirm broker-recorded response | Report must concern current customer and visible route |
| `POST /api/v1/customer/introductions/[caseRef]/reports/[reportRef]/correct` | Correct broker report | Creates provenance; never rewrites history |
| `POST /api/v1/customer/introductions/[caseRef]/contact-approvals` | Approve named disclosure bundle | Mutual interest is not sufficient by itself |
| `POST /api/v1/customer/introductions/[caseRef]/contact-revocations` | Revoke future access | Immediate authorization re-evaluation |
| `GET /api/v1/customer/brokers` | Private relationships | Only the customer's relationships |
| `POST /api/v1/customer/broker-invitations/exchange` | Exchange invitation token | Neutral response, token hash, audience binding |

The customer detail response may include multiple broker route choices because the customer owns this decision. Each route object contains only customer-relevant broker identity, sent date, expiry, own selection/response provenance, and allowed actions.

## 8. BrokerDesk API surface

Every path starts with an authorized workspace reference. Every resource is then resolved within that workspace and current member assignment.

### Workspace and onboarding

| Method and path | Purpose |
|---|---|
| `GET /api/v1/brokerdesk/bootstrap` | Workspaces and onboarding next step |
| `POST /api/v1/brokerdesk/workspaces` | Create business-onboarding workspace |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/onboarding` | Current onboarding projection |
| `PUT /api/v1/brokerdesk/workspaces/[workspaceRef]/business-profile` | Validated business details |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/verification-checks` | Start an allowed verification |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/verification-documents` | Request controlled upload session |

### Dashboard and customers

| Method and path | Purpose |
|---|---|
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/dashboard` | Action widgets only |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/customers?state=&cursor=` | Assigned/authorized customer list |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/customers/[relationshipRef]` | One relationship projection |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/customer-invitations` | Invite customer without enumeration |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/customers/[relationshipRef]/suggestions?cursor=` | Bounded explainable matches within agency scope |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/imports` | Create validated staged import |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/imports/[importRef]` | Batch progress and row-safe errors |

### Introductions

| Method and path | Purpose | Important rules |
|---|---|---|
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions?state=&cursor=` | Agency route queue | Own routes only; no pair/competitor counts |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions` | Create a route draft | Two authorized relationship refs; idempotent |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions/[routeRef]` | Own route detail | Never returns customer case ref |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions/[routeRef]/send` | Send route | Atomic hidden-pair correlation; same broker response for first/later route |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions/[routeRef]/response-reports` | Record phone/WhatsApp/in-person response | Route-scoped report only |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions/[routeRef]/retry-requests` | Ask for retry | Does not override person-level restrictions |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/introductions/[routeRef]/close` | Close own route | Closing is not deletion or rejection |

### Tasks, renewals, and team

| Method and path | Purpose |
|---|---|
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/tasks?state=&cursor=` | Authorized task queue |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/tasks/[taskRef]/complete` | Complete assigned task |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/tasks/[taskRef]/reopen` | Reopen when policy permits |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/renewals?cursor=` | Renewal actions |
| `GET /api/v1/brokerdesk/workspaces/[workspaceRef]/team` | Authorized member projection |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/team-invitations` | Invite employee; step-up required |
| `PUT /api/v1/brokerdesk/workspaces/[workspaceRef]/team/[memberRef]/access` | Replace capability/scope assignment; step-up required |
| `POST /api/v1/brokerdesk/workspaces/[workspaceRef]/team/[memberRef]/suspend` | Immediate access removal; step-up required |

Command endpoints are intentionally explicit. There is no generic `PATCH introduction` endpoint that accepts arbitrary state, organization, customer, contact, or audit fields.

## 9. Pagination, filters, and search

- Use keyset pagination, not client-controlled offsets for large or sensitive collections.
- Cursors are opaque, authenticated (HMAC or encrypted), expiring, and bound to actor, workspace, endpoint, filters, sort, and last row.
- Reject cursor reuse with changed filters/workspace rather than decoding client-controlled fields into a query.
- Allowlist filter values and sort orders.
- Cap page size server-side; do not return a caller-requested unlimited result.
- Search requires a minimum normalized length, bounded tokens, debouncing, per-user/workspace limits, and an authorized candidate scope.
- Never expose global customer existence, exact total database counts, or sequential navigation.
- Matching suggestions use a separate bounded service described in Phase 0D; no arbitrary query language or export endpoint.

## 10. Session and step-up policy

Reuse Supabase authentication and the existing authoritative live-session perimeter. Proxy/middleware may make an optimistic redirect, but pages, APIs, database commands, Storage, and Realtime independently require current authorization.

Recommended policy:

- Rotate/refresh session tokens using the existing server integration.
- Revoke all live access immediately after session termination, member suspension, mandate revocation, account disablement, or security incident.
- Do not store authorization truth only in a long-lived JWT; re-read high-impact membership/capability/mandate state.
- Require MFA for agency owners/admins before team, verification, export, billing, or access-policy administration.
- Require fresh authentication for permanent blocks/unblocks, contact disclosure approval where risk warrants it, bulk export, account deletion, business-document viewing, team privilege changes, and recovery changes.
- Record session ID and authentication assurance in sensitive audit events without storing tokens.
- Use Secure, HttpOnly, SameSite cookies with the narrowest practical path/domain and no cross-subdomain sharing unless explicitly required.
- Defend concurrent-session revocation using the existing live-session table, not only cookie expiry.

UI role checks only control presentation. Route handlers, services, database functions, RLS, and Storage policies enforce access independently.

## 11. CSRF, CORS, and browser controls

For cookie-authenticated mutations:

1. Require exact canonical `Origin`.
2. Reject cross-site Fetch Metadata (`Sec-Fetch-Site`) and unexpected navigation modes.
3. Require a session-bound CSRF nonce in a custom header.
4. Accept only intended methods/content types.
5. Keep SameSite cookies enabled.
6. Re-authorize the object and command after CSRF validation.

CORS is same-origin by default. No wildcard origin, reflected arbitrary origin, or credentialed cross-origin access. If a future mobile or partner API is required, create a separate bearer-token audience and gateway contract rather than weakening browser CORS.

Production browser headers include a nonce/hash-based Content Security Policy, HSTS, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, restrictive `Permissions-Policy`, `Referrer-Policy: no-referrer`, and resource-appropriate cross-origin policies. Third-party verification/payment origins are narrowly allowlisted per route, not globally.

## 12. Token contract

All invitation, verification-management, password/recovery, upload, download, and webhook tokens have:

- cryptographically random value appropriate to the threat;
- token type and version;
- subject and intended audience;
- purpose and permitted action;
- issued, expiry, consumed, and revoked timestamps;
- single-use/replay policy;
- server-side keyed hash, never plaintext token storage;
- constant-time comparison where application comparison is required;
- key version and rotation support.

Recommended starting lifetimes:

| Token/use | Lifetime | Replay policy |
|---|---:|---|
| Customer/team invitation | 7 days | Exchange once; issue short pending-claim session |
| Pending claim cookie | 30 minutes | Bound to browser session and intended account |
| Fresh-auth proof | 10 minutes | Narrow action/purpose; one completion |
| Upload authorization | 5 minutes | One object key, size/type/checksum policy |
| Private download URL | 1–5 minutes | Viewer/object/purpose bound where supported |
| Pagination cursor | 15 minutes | Read-only; actor/filter bound |
| Webhook replay window | 5 minutes | Unique provider event ID plus timestamp/signature |

Ordinary object references such as `inc_...` and `bir_...` are not tokens and do not expire merely because they appear in a URL.

## 13. Rate-limit and abuse controls

Use three layers:

1. CDN/WAF/network burst and bot controls.
2. Application limits based on authenticated user/session, trusted network hint, device/risk signal, workspace, resource, and action.
3. Atomic database quotas for sensitive business commands and idempotency.

The current database-backed `consume_api_rate_limit` and fail-closed service are reusable. Before BrokerDesk, improve anonymous network pseudonyms: trust forwarding headers only from configured infrastructure, normalize IPv4/IPv6, and use a rotating keyed HMAC rather than an unkeyed deterministic hash of IP/user-agent.

Initial limits are configuration, not hardcoded business truth. Recommended launch baseline:

| Action | Burst limit | Sustained/workspace limit | Additional control |
|---|---:|---:|---|
| Login/signup/verification start | 5 per 10 min per network+identifier | 20 per day per identifier | Neutral enumeration response; progressive delay |
| Invitation token exchange | 10 per 10 min per network | 5 failures per token | Revoke/lock suspicious token |
| Customer Introduction list/detail | 120 per min per user | 1,000 per day per user | Small pages, no-store |
| Customer decision/retry/contact approval | 10 per 10 min per user | 5 per hour per case | Idempotency, version, risk check |
| Broker customer/Introduction list | 120 per min per member | 600 per min per workspace | Cursor/page cap |
| Matching suggestions | 30 per min per member | 300 per hour per workspace | Result cap, audit, no export |
| Create/send Introduction | 20 per min per member | 100 per hour per member; 500 per day per verified workspace | Idempotency, anomaly/spam review |
| Record response/task action | 30 per min per member | 1,000 per day per member | Assignment scope |
| Customer invitation | 20 per hour per member | 500 per day per verified workspace | Neutral recipient response |
| Import batch | 5 per hour per workspace | 1,000 rows and 10 MB per batch initially | Async validation, malware scan |
| Verification/business document upload | 10 per hour per member | Configured storage quota | Step-up, type/size/checksum |
| Contact/private document view | 30 per hour per user | Resource-specific anomaly threshold | Reauthorize each access, audit |
| Export | 2 per day per user/workspace | One active job | Step-up, encrypted expiring result |

Limits are lower for unverified or newly created organizations and may rise after verification and observed legitimate use. Never communicate thresholds that help an attacker tune harvesting. Return `Retry-After`; do not return competitor, account-existence, or internal risk details.

Mutations fail closed if the authoritative limiter is unavailable. Low-risk reads may use a deliberately designed degraded local/edge limit, but must never bypass authorization or broaden data.

## 14. File upload, storage, and download

- Browser requests an upload authorization for one declared purpose and object.
- Server validates actor, workspace/customer relationship, current state, size, allowed MIME/extension, quota, and checksum requirements.
- Object key is random and server-selected; never derived from user filename or URL input.
- Upload lands in quarantine/private storage.
- Worker verifies actual file signature, scans malware, re-encodes images, strips EXIF/location metadata, and rejects active content/polyglots where possible.
- Only a clean immutable object reference is attached to business data.
- Downloads require current authorization every time and use a very short signed URL or an audited streaming proxy.
- Responses force the correct content type, safe disposition/filename, `nosniff`, no-store, and no referrer.
- Business verification, horoscope, financial, and private family documents use separate purposes/buckets/policies.

Email notifications do not attach these files.

## 15. Webhooks and external services

Webhook endpoints are separate from browser endpoints and require:

- raw-body signature verification using the provider's documented scheme;
- timestamp/replay-window validation;
- unique event ID idempotency;
- constant-time signature comparison;
- strict payload schema and size limit;
- provider/account/environment binding;
- fast `2xx/202` acknowledgement after durable receipt;
- asynchronous processing with current-state revalidation;
- no trust in success/status fields without matching an internally created transaction.

Do not authorize webhooks by IP alone. Redact payloads from logs. Rotate webhook secrets and support overlapping key versions.

Outbound requests use allowlisted HTTPS hosts and fixed provider base URLs. Never fetch a client-submitted URL, follow unbounded redirects, or expose internal network/metadata endpoints. Apply timeouts, response-size limits, certificate validation, retry budgets, circuit breaking, and egress monitoring.

## 16. Network and deployment boundaries

- CDN/WAF and DDoS protection in front of the application.
- TLS 1.2+ with modern configuration, HSTS, canonical HTTPS redirects, and automated certificate rotation.
- Origin access restricted so attackers cannot bypass edge controls where hosting permits.
- Production database access restricted to required application/administrative paths; pool connections with least-privilege roles.
- Separate production, staging, preview, and development databases, storage, keys, OAuth/webhook credentials, email domains, and analytics.
- Service-role credentials only in server/worker secret storage; never `NEXT_PUBLIC_*`, browser bundles, logs, or preview artifacts.
- Database backups encrypted, restore-tested, access-audited, and retained on an approved schedule.
- Administrative consoles protected with SSO/MFA, least privilege, and auditable access.
- Dependency, secret, container/host, and infrastructure scanning in CI and release gates.
- Email sending configured with SPF, DKIM, DMARC, bounce/complaint handling, and per-workspace abuse monitoring.

## 17. Realtime and notifications

MVP should prefer server-rendered/refetched queues and narrowly scoped polling over broad Realtime subscriptions to sensitive base tables. This keeps cross-agency projection logic in one audited path.

If Realtime is introduced later:

- subscribe only to user/organization-specific safe notification projections;
- authorize subscription and every row/payload;
- never publish base Introduction, participant, report, or grant rows;
- remove access immediately after session/member/assignment/mandate revocation;
- use opaque references and generic event hints such as “queue changed,” followed by an authorized refetch;
- test channel names, presence, connection errors, and counts for side-channel leakage.

Notifications are outbox-driven and contain minimal information. The application is the source of truth; delivery success never changes the Introduction decision state.

## 18. Observability and audit

Generate a server request ID and domain command ID. Audit sensitive commands with actor user, session, organization where applicable, capability, resource internal reference, outcome, reason code, assurance level, trusted network pseudonym, and timestamp.

Separate:

- security audit events;
- immutable Introduction domain events;
- operational application logs;
- product analytics;
- agency notes.

Do not log tokens, cookies, authorization headers, invitation URLs, emails, phone numbers, contact bundles, document contents/keys, portfolio JSON, horoscope data, decrypted notes, SQL parameters containing personal data, or raw vendor payloads.

Alerts should cover authorization-denial spikes, identifier scanning, invitation abuse, abnormal matching/profile access, mass downloads, rapid Introduction sends, role escalation, business-verification anomalies, disabled-member activity, webhook failures/replays, and service-role use from unexpected paths.

## 19. Caching and indexing controls

- Customer, broker, access, account, verification, task, and private document responses are `private, no-store`.
- Do not place sensitive projections in shared/CDN caches, Next.js static output, prefetch manifests, service-worker caches, or browser persistent storage.
- Disable search-engine indexing for authenticated/product routes using headers and route metadata; do not rely on `robots.txt` for confidentiality.
- Avoid putting sensitive state into HTML data attributes, client telemetry, page titles, Open Graph images, or notification previews.
- Public B2C portfolio caching must be scoped to the existing sanitized public snapshot and token lifecycle, never the customer/private approved projection.

## 20. API inventory and change management

Maintain a machine-readable endpoint inventory during implementation containing owner, audience, authentication, capability, resource scope, input/output schema, data class, rate-limit action, idempotency, step-up requirement, and audit event.

- Version externally consumed contracts.
- Additive response changes must not expose new properties without projection/security review.
- Remove deprecated routes only after usage review and a migration window.
- Unknown routes/methods return generic responses.
- Disable unused HTTP methods and automatic directory/index listings.
- Security review is required for every new identifier-bearing endpoint and every new exported response property.

## 21. Threat and abuse test matrix

The implementation release suite must include:

### Object/function/property authorization

- Replace each `wrk_`, `bcr_`, `bir_`, `inc_`, `rpt_`, `tsk_`, import, member, document, grant, and cursor reference with another tenant/user's valid reference.
- Use a broker route in a customer endpoint and a customer case in a broker endpoint.
- Change nested workspace while keeping a valid child reference.
- Add forbidden body fields such as organization, role, owner, selected route, state, verification, contact, or audit actor.
- Call owner/admin actions as broker agent, viewer, suspended member, unassigned employee, expired mandate, and deleted session.

### Cross-agency privacy

- Confirm Broker A cannot infer Broker B through list totals, pagination length, matching results, error messages, send latency, task changes, notifications, email content, realtime/presence, reports, retry outcomes, exports, audit views, or support views.
- Confirm same-direction and reverse-direction concurrent sends return the same broker-safe semantics.
- Confirm customer sees the correct combined history without agency-private notes or staff details.

### Authentication/session/browser

- Missing, malformed, expired, revoked, replayed, and cross-environment sessions.
- CSRF through forms, fetch, iframe, redirects, alternate subdomains, missing/forged Origin, and manipulated forwarding headers.
- Open redirects, host-header poisoning, path normalization/encoding, duplicate query parameters, and cached authenticated pages.
- Session/member/mandate revocation during a live page and immediately before a command.

### Tokens and replay

- Brute force, token substitution by type/audience, replay after exchange/consumption, expiry boundaries, secret rotation, link forwarding, scanner GETs, and token leakage into logs/referrers/analytics.
- Reuse an idempotency key with identical and different bodies, actors, workspaces, and endpoints.

### Concurrency and business logic

- Parallel sends, decisions, route selection changes, rejection versus contact release, expiry versus response, retry versus cooling, profile privacy update versus view, and member suspension versus send.
- Verify rejection/block/revocation wins every disclosure race.

### Resource consumption and injection

- Oversized/chunked/compressed bodies, excessive JSON depth/keys, multipart bombs, archive bombs, malformed images/documents, MIME mismatch, Unicode/confusable input, SQL/meta-character input, and spreadsheet formula injection in imports/exports.
- Rate-limit bypass by IP/header/session/workspace/token rotation, parallel requests, alternate endpoints, and direct Data API calls.
- Cursor/filter complexity, broad search scraping, expensive match combinations, and notification/email amplification.

### Infrastructure and integrations

- Direct origin bypass, permissive CORS/CSP, public bucket/object listing, stale signed URLs, environment/key crossover, webhook forgery/replay, SSRF/redirect/DNS rebinding, dependency compromise, backup access, and secret exposure.

This matrix maps directly to the current OWASP API risks: object, property, and function authorization; authentication; resource consumption; sensitive business-flow abuse; SSRF; misconfiguration; inventory; and unsafe third-party API consumption.

## 22. Existing code reuse and required evolution

Reuse:

- shared Supabase SSR session integration;
- optimistic proxy plus authoritative page/API/database live-session checks;
- `requireSameOrigin`, bounded JSON/multipart readers, Zod validation;
- route → service → repository pattern;
- database-backed rate limiter and fail-closed mutation behaviour;
- signed/fresh-auth cookie patterns;
- webhook raw-body HMAC, event hash, and idempotent processing patterns;
- fixed `search_path`, explicit function grants, private schema, RLS and Storage policies.

Evolve before BrokerDesk release:

- add `/brokerdesk` paths to optimistic routing while retaining authoritative checks;
- create separate customer/broker DTOs and identifier validators;
- replace object-level 403 differences with uniform nonexistence semantics where appropriate;
- require unknown-property rejection, idempotency, and row-version contracts on commands;
- use keyed network pseudonyms and trusted proxy configuration for rate limits;
- add multi-dimensional rate limits and business-flow quotas;
- avoid direct private Supabase reads from BrokerDesk clients;
- introduce CSP/headers and a session-bound CSRF nonce;
- redact URL tokens and sensitive structured log fields centrally;
- add endpoint inventory and adversarial multi-identity authorization tests.

## 23. Deferred scenarios and safe API behaviour

### Customers select different brokers

Customer APIs return `representation_alignment_pending` with simple guidance. Broker APIs return only their own neutral actionable state. No contact endpoint may succeed, and no API reveals the other broker.

### Direct B2C and broker routes exist for the same pair

The customer projection may later combine source types. MVP BrokerDesk endpoints never return or act on the B2C route. The unresolved combined decision remains fail closed for disclosure.

### Cross-agency settlement

No endpoint exists for competitor discovery, ownership claims, commission negotiation, or cross-agency messaging. Immutable route attribution is retained privately for a later approved policy.

## 24. Decisions requiring confirmation

Recommended defaults:

1. **URL family:** keep the existing customer `/dashboard` and add `/introductions`; use `/brokerdesk/w/[workspaceRef]/...` for agencies.
2. **Public references:** type-prefixed cryptographically random 128-bit values, separate for customer cases and broker routes.
3. **BrokerDesk client data:** application routes/services only; no direct browser access to private Supabase tables/RPCs.
4. **MFA:** mandatory for organization owners/admins and step-up actions; strongly encouraged for agents.
5. **Realtime:** do not use broad realtime workflow subscriptions in MVP; use authorized refetch/polling and in-app notifications.
6. **Invitation links:** fragment token exchange where practical, with a clean-URL compatibility fallback.
7. **API versioning:** new BrokerDesk and combined customer endpoints begin at `/api/v1`; existing B2C routes migrate separately.
8. **Rate limits:** adopt the launch baseline as configurable policy and tune using verified legitimate traffic and abuse evidence.

## 25. Phase 0E acceptance criteria

Phase 0E is ready for approval when:

- customer, broker, public, invitation, and compatibility URL families are accepted;
- every resource type has a surface-specific opaque identifier and server resolution rule;
- customer and broker API projections cannot be confused or joined by a browser;
- every command has authentication, live-session, authorization, validation, rate-limit, idempotency, concurrency, audit, and safe-error requirements;
- token, return URL, CSRF, CORS, cookie, header, cache, file, webhook, and network policies are accepted;
- rate limits address user, network, workspace, resource, action, and business-flow abuse;
- B2C compatibility and migration boundaries are clear;
- cross-agency leakage tests cover content and side channels;
- deferred representation scenarios remain unable to release contacts;
- an endpoint inventory and adversarial multi-identity test suite are mandatory implementation deliverables.

## 26. Primary references

- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/)
- [Next.js authentication and authorization guidance](https://nextjs.org/docs/app/guides/authentication)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database-function security and privileges](https://supabase.com/docs/guides/database/functions)
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)
