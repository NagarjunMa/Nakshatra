# BrokerDesk Phase 1 — Implementation Plan

Status: Approved implementation baseline; Phase 2 authorized on 2026-09-08  
Depends on: Approved Phase 0A–0E contracts and reviewed Phase 0F wireframes  
Repository review date: 2026-09-08

## 1. Outcome

Phase 1 converts the approved product, workflow, database, URL, API, security, and wireframe contracts into an ordered engineering delivery plan.

The most important implementation decision is explicit:

> Nakshatra's existing B2C dashboard remains the only customer workspace. Broker-originated Introductions are added to that workspace; no BrokerDesk customer portal, duplicate account, duplicate portfolio, or duplicate privacy system will be created.

Phase 1 is planning only. It does not authorize migrations, application code, production configuration, external messages, or a Linear write.

## 2. Repository findings

The current implementation provides a credible foundation rather than a prototype that must be replaced.

| Existing capability | Current implementation | Phase 1 decision |
|---|---|---|
| Authentication | Supabase SSR authentication, password and Google flows, verified signup, live-session RPC checks | Reuse. Add an allowlisted product intent for BrokerDesk onboarding; never let signup input assign a role or organization. |
| Customer home | `/dashboard` server page plus `dashboard-client.tsx` | Preserve as the customer home and visual baseline. Refactor only at feature boundaries needed for safe extension. |
| Portfolio source of truth | `portfolios`, `candidates`, structured detail tables, atomic draft save, publication transactions | Reuse. One customer-owned current published portfolio serves B2C and broker Introductions. |
| Portfolio presentation | Existing Nakshatra type, spacing, cards, disclosure language, template renderer | Reuse for customer pages. BrokerDesk uses the same design family with a denser operational layout. |
| Direct B2C interest | `interest_requests`, repository/service, dashboard inbox, decision route | Keep operational and distinct from broker routes in the data model. Present it beside broker Introductions in one customer workspace. |
| Private access | Existing reveal-grant lifecycle, approved snapshots, access history and controls | Generalize through compatibility migrations; do not build a second BrokerDesk grant system. |
| Identity verification | Didit invitation/session/webhook services and worker patterns | Reuse for people. Add a separate organization/business-verification domain rather than overloading person verification. |
| Media and horoscope | Private storage, owner previews, access-controlled viewing | Reuse through portfolio projections; do not copy documents into an Introduction. |
| API protection | Same-origin validation, live-session validation, Zod contracts, database rate limiter, safe API errors | Reuse and strengthen for `/api/v1` contracts, idempotency, row versions, trusted proxy handling, and multi-dimensional quotas. |
| Database protection | RLS, fixed-function patterns, atomic RPCs, live-session perimeter, database tests | Reuse the approach. New workflow tables live in `app_private` and are command/projection-only. |
| Test pipeline | ESLint, TypeScript, Vitest, coverage gates, pgTAP/Supabase verification, build and Playwright | Extend at every vertical slice; security tests are blocking, not deferred to final QA. |

### 2.1 Important constraint in the current customer UI

`src/app/dashboard/dashboard-client.tsx` currently owns portfolio editing, media, horoscope, direct interests, access controls, share-link lifecycle, and verification in one large client component. Adding Introduction state, broker selection, timelines, reminders, and contact approvals directly to it would create unsafe coupling.

The implementation will first extract reusable presentation boundaries while keeping the current page, content, and behaviour stable. Server-side feature services remain the source of data. Extraction must not create duplicate fetching or business rules in React components.

### 2.2 Existing authorization risks to correct before BrokerDesk data is exposed

- Candidate ownership must be based on the customer or an explicit customer-authorized delegate, not candidate creator or agency operator status.
- `current_organization_id` cannot represent multiple private agency relationships.
- `can_manage_portfolio` must not allow an agency to mutate a customer-owned portfolio or disclose sections outside a mandate.
- Existing organization roles are too broad for assigned-customer access.
- Existing `broker_clients.notes` cannot remain plaintext on a relationship row.
- Existing public IDs and share tokens must not be reused as BrokerDesk workflow identifiers.

These corrections are release prerequisites. Compatibility behaviour for the current B2C owner must be covered by regression tests before changing policies.

## 3. Customer experience: extend, do not replace

### 3.1 Customer information architecture

The authenticated customer workspace uses:

| Page | Responsibility |
|---|---|
| `/dashboard` | Existing customer home: portfolio status, actions requiring attention, broker Introduction preview, direct interests, access status, verification, and safe shortcuts |
| `/portfolio` | Customer-owned portfolio summary and publication status |
| `/portfolio/edit` | Existing portfolio editor, reached initially through compatibility redirects from `/edit` |
| `/introductions` | All customer-visible relationship opportunities, clearly separated by source |
| `/introductions/[caseRef]` | Pair-level broker Introduction history using `inc_...`; never a broker route ID in the page URL |
| `/brokers` | The customer's private agency relationships, mandates, renewal dates, and relationship controls |
| `/access` | Active private-access grants, contact disclosure, history, and revocation controls |
| `/account` | Existing account, session, export, deletion, and security controls |

The first release may keep existing `/edit`, `/preview`, and access controls in their current locations while canonical pages are introduced incrementally. Redirects are compatibility work, not a launch dependency.

### 3.2 Dashboard composition

The existing dashboard shown in the approved screenshot remains recognizable. It evolves in this order:

1. Keep the Nakshatra header, portfolio-status message, share action, cards, typography, colors, and portfolio controls.
2. Add one plain-language **Needs your attention** summary. It may total actions, but it must not collapse different domain states into one database object.
3. Add **Introductions through brokers**, showing counterpart, responding agency options visible to that customer, remaining time, and the next safe action.
4. Retain the existing B2C inbox as **Direct interests** so interests arriving outside a broker remain available on the same dashboard.
5. Retain portfolio access, portfolio activity, verification, and privacy controls.
6. Move long operational lists to dedicated pages and show only a small actionable preview on the dashboard.

Customer wording distinguishes source without exposing private implementation vocabulary:

- “Through your broker” for an agency route.
- “Direct interest” for the existing public-link flow.
- “Choose how you want to continue” only when more than one eligible broker route exists.
- Never show `case`, `round`, `route`, internal state names, organization UUIDs, or another customer's private decision.

### 3.3 Unified presentation, separate domain truth

Broker Introductions and existing direct interests can appear in one visual action area, but they remain different server-side aggregates during the MVP:

- `interest_request` continues to run the existing B2C viewer-to-owner handshake.
- `introduction_case` / `round` / `route` runs the broker-mediated two-person workflow.
- A customer dashboard composition service returns separate typed collections and a safe action summary.
- React components render the collections; they do not translate one lifecycle into the other.
- The deferred same-pair B2C-plus-broker decision remains fail-closed. No automatic bridge or combined acceptance is inferred.

This delivers one coherent customer experience without prematurely forcing two different workflows into one table or state machine.

### 3.4 Planned UI component boundaries

The exact file names may change during implementation review, but the intended boundaries are:

```text
src/components/customer/
  CustomerAppShell
  CustomerNavigation
  CustomerActionSummary
  PortfolioStatusCard
  BrokerIntroductionPreview
  DirectInterestPreview
  AccessSummary

src/features/introductions/customer/
  IntroductionList
  IntroductionDetail
  BrokerRouteChoice
  CustomerDecisionPanel
  IntroductionTimeline
  ContactApprovalPanel
```

The existing `InterestInbox`, `AccessControls`, photo, horoscope, and verification components are extracted or wrapped for reuse. Their services and RPCs remain authoritative.

## 4. Application boundaries

BrokerDesk must not become one large feature directory. Organize application code by business domain:

| Domain | Owns |
|---|---|
| `organizations` | Business profile, onboarding progress, verification status |
| `organization-access` | Membership, capability, scope, assignment, mandate checks |
| `broker-relationships` | Invite, claim, consent, assignment, lifecycle, renewal reference |
| `customer-imports` | Staging, validation, duplicate-within-agency review, formula-safe export/errors, claim invitations |
| `introductions` | Pair case, round, agency route, participants, responses, customer decisions, contact approvals, timeline projections |
| `matching` | Bounded deterministic mutual-filter queries and explanation codes |
| `tasks` | Actionable follow-ups and operational queues |
| `renewals` | Agency-customer contract/renewal workflow |
| `notifications` | Outbox processing, templates, delivery attempts, reminder schedule |
| existing `portfolio`, `access`, `interest`, `identity-verification` | Continue as shared Nakshatra domains |

Every new HTTP flow follows:

```text
route handler -> schema/contract -> domain service -> repository -> narrow database RPC/projection
```

Route handlers authenticate, validate origin/session, apply rate limits, and translate domain outcomes. Services own application policy. Database commands own invariants, locking, authorization, idempotency, audit, and outbox creation. Browser code never reads BrokerDesk private tables directly.

## 5. Database delivery plan

Use multiple reviewable, forward-only migrations. Do not place the entire BrokerDesk schema and every policy in one migration.

### Migration group A — security foundation

- Create `app_private` if not already present with explicit default privileges.
- Add opaque public-reference generation/validation support with different prefixes and random spaces for customer cases, broker routes, relationships, workspaces, tasks, and imports.
- Add actor/scope helpers that require a live session.
- Correct candidate owner/delegate predicates while preserving B2C owner access.
- Introduce capability, scope, assignment, and mandate predicates.
- Add security tests before granting any new read path.

### Migration group B — organizations and agency relationships

- Add organization business profile, onboarding, verification check, and private verification-document metadata.
- Evolve `broker_clients` into the agency-customer relationship meaning, retaining a compatibility path if a physical rename is risky.
- Add invitation, claim, consent, assignment, mandate, lifecycle, and renewal attributes.
- Move agency notes to an encrypted, purpose- and retention-labelled private table.
- Enforce one relationship per `(organization_id, candidate_id)` without revealing relationships in other organizations.

### Migration group C — imports and invitations

- Add private import batch, staging row, validation result, and claim-invitation records.
- Store normalized values only where needed; sensitive exact lookup uses keyed blind indexes, not plain hashes.
- Do not create shareable customer profiles from unclaimed spreadsheet rows.
- Expire and delete unclaimed staged data according to the approved retention schedule.

### Migration group D — Introduction core

- Add hidden unordered `introduction_cases` and ordered candidate-pair uniqueness.
- Add rounds, agency-private routes, participants, response reports, person-level decisions, contact-bundle approvals, append-only events, command idempotency, tasks, and notification outbox.
- Enforce route organization/relationship consistency and 30-day independent expiry.
- Add send-time portfolio-version references for audit only; active views use the current published portfolio.
- Add explicit blocked, cooling, critical-profile-change, mandate-loss, and alignment-pending guards.

### Migration group E — access compatibility

- Generalize current reveal grants into the shared portfolio-access domain.
- Preserve existing B2C APIs and data while they migrate behind compatibility services/views.
- Require mutual confirmed interest, resolved representation, live mandates, and both bundle approvals before contact disclosure.
- Rejection, block, mandate loss, privacy reduction, revocation, or critical profile change atomically removes affected access.

### Migration group F — projections and command surface

- Add separate customer, broker, worker, and narrowly scoped support projections.
- Add command RPCs for create/send/respond/report/confirm/retry/close/select/approve/revoke/expire flows.
- Revoke direct Data API table access for private workflow data.
- Fix function `search_path`, ownership, execution grants, input limits, and returned columns.
- Add indexes only against required access patterns and verify query plans with realistic tenant sizes.

### Required indexes and constraints

At minimum, test and justify indexes for:

- hidden ordered candidate pair and current round;
- organization route state and expiry;
- organization relationship state, assignment, and renewal due date;
- customer participant state and last action time;
- task workspace, assignee, state, priority, and due date;
- outbox state and next attempt;
- idempotency actor/scope/command/key;
- import batch/state/row number;
- append-only timelines by aggregate and server timestamp.

Large lists use keyset pagination. No endpoint accepts arbitrary column names, joins, or unbounded filters.

## 6. Ordered vertical implementation slices

Each slice must be independently reviewable, tested, and disabled until its server-side entitlement is enabled. Database groundwork may land earlier, but no private data is exposed to a UI before its isolation suite passes.

### Slice 1 — safety foundation and compatibility tests

Deliver:

- multi-identity pgTAP fixture helpers;
- B2C owner-access regression suite;
- corrected candidate ownership/delegation and scoped agency authorization;
- private-schema/default-privilege baseline;
- opaque reference utilities;
- keyed trusted-network rate-limit subject design;
- endpoint inventory template and data-class annotations;
- server-enforced BrokerDesk feature entitlement.

Exit gate: Broker A, Broker B, Customer A, Customer B, unassigned employee, disabled employee, worker, and anonymous identities have proven allow/deny matrices with uniform inaccessible-object responses.

### Slice 2 — broker signup, organization onboarding, and RBAC

Deliver:

- reuse existing `/login` and `/signup` with signed/allowlisted BrokerDesk continuation intent;
- `/brokerdesk/onboarding` stages from Phase 0F;
- organization creation only through a command transaction;
- representative Didit identity verification reuse;
- business profile, registration-document upload/quarantine, verification review state;
- owner/admin/advisor/coordinator/viewer role presets implemented as capabilities plus scopes;
- employee invitations, assignment restrictions, session revocation, and audit.

Exit gate: client input cannot self-assign a role, organization, verified state, capability, or customer scope; disabled membership loses access immediately.

### Slice 3 — customer relationship, invite, claim, and 100-customer import

Deliver:

- broker customer list and relationship detail;
- manual invite and private staged CSV import;
- within-agency validation and duplicate review without cross-agency discovery;
- claim links and authenticated identity binding;
- customer consent and mandate activation;
- assignment to permitted employees;
- existing customers attach their canonical candidate/portfolio; new customers enter the same B2C portfolio flow.

Exit gate: a broker can stage 100 rows, correct failures, invite customers, and see only consented/claimed portfolio projections. A spreadsheet row alone never becomes a shareable portfolio.

### Slice 4 — Introduction core and broker send flow

Deliver:

- case/round/route schema and atomic commands;
- deterministic eligible-customer query within the agency's authorized relationships;
- broker customer record and potential-match screen;
- review-and-send screen using the current published portfolio projections;
- broker route detail/timeline;
- transactional event and notification-outbox creation;
- idempotent retry after browser/network failure.

Exit gate: either agency can independently send the same pair without seeing a duplicate, conflict, count, timing change, altered error, or competitor status. Customers receive both private routes in their combined projection.

### Slice 5 — existing customer dashboard integration

Deliver:

- extract stable customer shell/sections from the existing B2C dashboard;
- extend the dashboard composition service with separate broker Introduction and direct-interest projections;
- add `/introductions` and `/introductions/[caseRef]`;
- route selection, customer interest/rejection/no-response/retry requests, timeline, 30-day clocks, cooling, and permanent block;
- `/brokers` relationship visibility;
- loading, empty, partial-failure, expired, revoked, blocked, and alignment-pending states;
- responsive and keyboard/screen-reader coverage.

Exit gate: a customer uses one account and one familiar dashboard for B2C and every broker relationship. A customer can choose exactly one broker route; brokers cannot infer another route. Different-broker selection stops at `representation_alignment_pending` with no contacts released.

### Slice 6 — conventional follow-up, tasks, reminders, and expiry

Deliver:

- broker records phone, WhatsApp, or in-person response as a route-scoped report;
- customer confirm/correct flow;
- broker close and customer retry request without state deletion;
- action-only broker dashboard queues;
- day 7 customer reminder, day 15 broker task, day 25 final reminder, and day 30 expiry worker;
- notification retries, deduplication, dead-letter handling, and neutral broker wording.

Exit gate: expiration records `No response`, never rejection. Worker replays and concurrent UI actions are idempotent and cannot override rejection, block, privacy reduction, or customer authority.

### Slice 7 — controlled disclosure and full approved view

Deliver:

- shared portfolio access-grant migration with B2C regression coverage;
- mutual-interest gates;
- bilateral bundle approvals for individual and parent/family contacts;
- representation-alignment gate;
- short-lived authenticated private media/document access;
- access history and immediate revocation on controlling state changes.

Exit gate: no URL, route ID, stale grant, signed URL, broker action, worker replay, or concurrent request can disclose contacts before every controlling condition is true.

### Slice 8 — matching suggestions

Deliver:

- server-side mutual mandatory-filter query for assigned/authorized customers only;
- normalized age, height, location, marital, preference, and allowed horoscope criteria;
- explanation codes such as “matches age preference” rather than compatibility/desirability scores;
- exclusion for blocks, cooling, missing consent, expired mandate, paused/critical profiles, and already-active agency route;
- bounded result size, keyset pagination, and query-cost controls.

Exit gate: every suggestion is explainable, reproducible from approved inputs, scoped to the agency, and incapable of broad portfolio enumeration.

### Slice 9 — renewals and pilot hardening

Deliver:

- renewal queues and simple relationship renewal recording;
- accessibility and responsive audits;
- performance/query-plan verification at 1,000+ agency relationships and realistic route history;
- restore, retention, deletion, key-rotation, webhook, worker, and incident-response exercises;
- end-to-end pilot suite and operational runbooks.

Exit gate: all Phase 1 release gates in section 10 pass and the pilot can be enabled for explicitly verified workspaces without enabling BrokerDesk globally.

## 7. API and URL implementation rules

- New contracts use `/api/v1/customer/...` and `/api/v1/brokerdesk/workspaces/[workspaceRef]/...`.
- Existing B2C `/api/*` routes remain compatible until a separately tested migration.
- Customer page paths use `inc_...` pair references; broker paths use `bir_...` agency-route references.
- Workspace, relationship, route, case, task, import, and invitation reference types are not interchangeable.
- URL possession grants no data access. The server derives the actor and tenant from the verified session and authorized relationship.
- Mutating routes require same-origin/CSRF controls, strict JSON schemas that reject unknown keys, body-size limits, a rate-limit action, idempotency, expected row version, transactional audit, and a safe error map.
- Customer and broker DTOs are separately declared; do not serialize a common internal row and remove fields afterward.
- Sensitive reads use `Cache-Control: private, no-store`; tokens are removed from URLs through exchange/redirect before protected content renders.
- Email contains a sign-in/action link and safe summary, never a complete portfolio or private attachment.

## 8. Security and privacy workstream

Security is part of each slice. The following work cannot be postponed to a single final hardening sprint:

1. **Authorization:** object, property, function, tenant, assignment, mandate, and live-session checks at service, command, RLS, and storage boundaries.
2. **Isolation:** compare not only response data but status, error, latency class, counters, tasks, notifications, logs, and rate-limit behaviour for competitor leakage.
3. **Encryption:** envelope-encrypt C2/C3 fields with versioned keys outside the database and authenticated context. Use private randomized storage keys and short signed reads.
4. **Tokens:** store only keyed hashes; bind purpose, audience, subject, expiry, consumption, and key version; prevent link-scanner GET consumption.
5. **Rate limits:** trusted-edge network pseudonym plus user/session/workspace/resource/action quotas and atomic send/invite/export business-flow caps.
6. **Files:** quarantine, signature/MIME/size/checksum validation, malware scan, image re-encoding, EXIF removal, safe CSV handling, and retention cleanup.
7. **Network:** HTTPS/HSTS, strict origin/CORS/CSP controls, service-role isolation, fixed outbound provider hosts, timeouts, no user-controlled fetches, and environment-separated secrets.
8. **Logging:** structured IDs and reason codes without portfolio JSON, contacts, notes, documents, horoscope, tokens, cookies, SQL payloads, or provider bodies.
9. **Audit:** append-only actor/action/target/purpose/outcome events; sensitive reads and disclosure decisions are included.
10. **Recovery:** encrypted backups, restore tests, worker replay tests, notification reconciliation, revocation propagation, and documented key rotation.

## 9. Test plan

### 9.1 Database and authorization

- pgTAP tests for every table, function, view/projection, storage path, role, capability, scope, assignment, and mandate.
- A fixed multi-identity fixture matrix for Broker A, Broker B, both customers, same-agency employees, unauthorized employees, disabled members, support, worker, anonymous, and expired sessions.
- Identifier substitution across every opaque reference and nested resource.
- Direct Data API attempts against private workflow tables.
- Concurrency tests for duplicate sends, simultaneous decisions, broker selection changes, expiry, retry, revocation, and contact approval.
- Append-only audit/outbox enforcement and least-privilege function grants.

### 9.2 Unit and service

- State-transition tables from Phase 0C.
- Strict contract parsing and unknown-property rejection.
- Customer and broker DTO property allowlists.
- Dashboard composition without cross-domain state conversion.
- Matching normalization, mutual filtering, explanations, exclusions, and bounded queries.
- Reminder scheduling at boundary instants using server UTC.
- Encryption context/key-version and token-purpose tests without real secrets.

### 9.3 Route and component

- Authentication, same-origin/CSRF, rate limit, idempotency, row-version, and safe-error tests for each command.
- Existing B2C dashboard, interest, portfolio, media, horoscope, verification, and access tests remain green.
- Customer dashboard states with no broker, one broker, two brokers for one pair, expired routes, rejection cooling, permanent block, and alignment pending.
- Broker views prove neutral output when another agency has a route.
- Accessible names, focus order, keyboard operation, live status messages, reduced motion, zoom, and responsive layouts.

### 9.4 End-to-end and adversarial

- Broker setup through verified organization and invited employee.
- 100-row import through claim and completed portfolio.
- Broker A and Broker B independently send Customer A ↔ Customer B in both directions.
- Customers see every permitted route; each broker sees only its own history.
- Same broker selected, different brokers selected, no response, explicit rejection, retry, block, critical portfolio edit, mandate expiry, and contact disclosure.
- Token replay/substitution, cursor tampering, link forwarding, scanner requests, file polyglots, CSV formula injection, quota bypass, notification amplification, stale signed URLs, and worker replay.

## 10. Release gates

BrokerDesk remains disabled unless all applicable gates pass:

- Phase 0C transition tests and Phase 0D invariants are executable and green.
- Cross-agency content and side-channel isolation suite is green.
- Existing B2C regression suite is green.
- Database migrations apply from clean state and tested upgrade state; rollback/roll-forward response is documented.
- No browser bundle or response contains private schema rows, service credentials, internal UUIDs, storage keys, or competitor fields.
- All sensitive commands have rate-limit, idempotency, concurrency, audit, and safe-error coverage.
- Access and disclosure revocation is proven under concurrent requests.
- Retention schedule, deletion mapping, KMS ownership, backup/restore, incident response, and support-access policy are approved.
- Accessibility review meets WCAG 2.2 AA expectations for critical workflows.
- Performance tests show bounded dashboard, customer list, Introduction list, task queue, and matching queries at pilot scale.
- Product sign-off confirms simple English and no competitor disclosure in customer or broker notifications.

## 11. Rollout and observability

Roll out by verified workspace using server-side entitlements:

1. Local and CI environments with synthetic multi-agency fixtures.
2. Internal/staging exercise with no production personal data.
3. One verified pilot agency with restricted employee capabilities and monitored import volume.
4. A small cohort of verified agencies after isolation, support, and reminder behaviour is reviewed.
5. Gradual expansion based on error, denial, queue, delivery, performance, and support evidence.

Feature switches should separate onboarding/import, Introduction send, customer Introduction UI, response reporting, matching, and contact disclosure. A disabled switch must fail closed on the server; hiding a button is not a control.

Operational signals include:

- command success/failure by safe reason code;
- authorization denials and reference-scanning patterns;
- invite/send/export quota pressure;
- outbox age, retry, and dead-letter counts;
- overdue expiry/reminder tasks;
- access grants issued/revoked and revocation latency;
- query latency and result bounds by projection;
- import validation and claim conversion without logging row contents;
- business-verification and disabled-member anomalies.

Metrics use workspace-scoped or pseudonymous identifiers and must not create a cross-agency customer graph.

## 12. Expected repository areas

Likely existing areas to evolve:

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/dashboard-client.tsx`
- `src/app/globals.css`
- `src/components/auth/AuthForm.tsx`
- `src/features/portfolio/server/dashboard-view.service.ts`
- `src/features/access/**`
- `src/features/interest/**`
- `src/features/security/server/rate-limit.service.ts`
- `src/lib/auth.ts`
- `src/lib/api/**`
- `src/lib/supabase/**`
- `src/types/database.generated.ts` (generated, never manually treated as schema truth)
- `supabase/migrations/**`
- `supabase/tests/database/**`
- `tests/**`
- worker scripts under `scripts/**`

Likely new route and feature areas:

- `src/app/introductions/**`
- `src/app/brokers/**`
- `src/app/brokerdesk/**`
- `src/app/api/v1/customer/**`
- `src/app/api/v1/brokerdesk/**`
- `src/features/organizations/**`
- `src/features/organization-access/**`
- `src/features/broker-relationships/**`
- `src/features/customer-imports/**`
- `src/features/introductions/**`
- `src/features/matching/**`
- `src/features/tasks/**`
- `src/features/renewals/**`
- `src/features/notifications/**`
- `src/components/customer/**`
- `src/components/brokerdesk/**`

Before writing Next.js application code, read the installed Next.js 16 documentation under `node_modules/next/dist/docs/` for the relevant route, caching, server/client boundary, middleware/proxy, and security conventions as required by the repository instructions.

## 13. Decisions retained from earlier phases

- One customer identity and one customer-owned portfolio across B2C and all agencies.
- One hidden pair case, multiple independent private agency routes.
- No broker learns another broker's existence, identity, count, timestamps, response, selection, notes, or status.
- The customer sees their own permitted multi-route history.
- Exactly one broker route is selected by each customer for a broker-originated Introduction; no self-service option inside it.
- Each route remains active for 30 days; expiry means no response.
- Explicit rejection starts a recommended 90-day cooling period; permanent block remains customer-controlled.
- Different-broker selection remains safely paused; no automatic alignment or contact release.
- Active Introduction views use the current published portfolio; send-time version is audit evidence.
- Brokers may report conventional responses, but customer authority and person-level controls remain final.
- Direct B2C plus broker combined acceptance remains deferred and cannot release data through inference.

## 14. Questions that must be settled before their dependent slice

These do not block Slices 1–5 unless stated:

1. Representation-alignment resolution when the two customers choose different brokers — blocks automatic progression beyond the alignment-pending state and Slice 7 contact disclosure for that case.
2. Legal retention durations by data class and operating geography — blocks production import, verification-document retention, and general availability.
3. Business-verification reviewer/operations model and accepted documents by country — blocks production organization approval, not technical onboarding development.
4. Email/SMS/WhatsApp provider selection and consent requirements — blocks production delivery on that channel; the transactional outbox and email-safe template contract can still be built.
5. KMS/secrets and malware-scanning provider ownership — blocks storing production C2/C3 ciphertext and releasing uploaded documents from quarantine.
6. Whether renewals are simple broker-recorded dates or integrated billing — default for the MVP is broker-recorded dates; payment processing is out of scope unless separately approved.

## 15. Phase 1 acceptance criteria

Phase 1 is ready for approval when:

- the existing B2C dashboard is explicitly retained as the single customer interface;
- every approved Phase 0 workflow maps to an ordered vertical slice;
- migrations are sequenced so authorization and compatibility tests precede exposure;
- customer and broker URLs, DTOs, identifiers, and projections remain separate;
- direct B2C interests and broker Introductions share a dashboard without silently sharing a lifecycle;
- every slice contains security, privacy, accessibility, and test exit gates;
- the 100-customer day-one scenario, multi-broker same-pair scenario, conventional broker reporting, portfolio updates, expiry, cooling, blocking, and contact disclosure are covered;
- deferred decisions remain explicit and fail closed;
- rollout, operational monitoring, retention, recovery, and rollback responsibilities are identified;
- expected repository areas are clear enough to create durable implementation issues after approval.

After review and explicit implementation approval, create implementation issues in the Phoenix works / Nakshatra Linear project and copy the approved slices, security requirements, and acceptance criteria into those issues. Repository state must still be rechecked before each issue begins.
