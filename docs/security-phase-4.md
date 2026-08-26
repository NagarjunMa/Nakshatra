# Security Phase 4: Identity, Privacy, and Organization Roles

This phase establishes the application controls for session invalidation, account privacy, data retention, and least-privilege B2B access. Supabase dashboard and hosting-provider settings remain deployment responsibilities and must be verified separately.

## Session Controls

- Every protected server page and API request validates the Supabase token and calls `is_current_session_active()`.
- The RPC binds the JWT `session_id` to a live row in `auth.sessions`. A revoked session therefore stops working immediately in Nakshatra even if its signed access token has not expired.
- `/account` lets a user revoke every other session through Supabase Auth's `others` sign-out scope.
- Pending account deletion keeps the user's private session usable during the recovery window. The worker atomically revokes every Auth session only when it claims deletion for processing; the live-session predicate then denies any newly issued private session until completion.

Production Auth settings to verify in Supabase:

- Exact Site URL and redirect allowlist for production and approved preview domains.
- CAPTCHA on sign-up and other abuse-sensitive Auth entry points.
- Email confirmation enabled and OTP expiry kept short enough for the product's risk profile.
- Custom SMTP configured with the Nakshatra service account and verified sender domain.
- Refresh-token rotation enabled with a narrow reuse interval.
- One-hour access-token expiry unless measured product requirements justify a shorter value.
- Time-boxed sessions or inactivity timeout once Supabase plan support is selected.
- MFA required for Supabase organization and project administrators.

## Account Export and Deletion

`GET /api/account/export` returns a JSON export containing the requesting user's profile, portfolios, direct candidates, media inventory, horoscope inventory, organization memberships, requests submitted by that user, and their access history. Incoming requester PII is excluded.

Deletion is asynchronous:

1. The user requests deletion in `/account`. NAK-41 adds a separate fresh-auth proof before this action is released.
2. `request_account_deletion()` unpublishes portfolios, disables public snapshots, revokes Full View grants, closes active requests, and schedules deletion after 24 hours. Repeating a pending request returns the original deadline without moving it.
3. The private account remains usable while the request is `pending`. Cancellation is available only while the request remains `pending` or retryable `failed`; canceled portfolios remain unpublished.
4. An organization owner must transfer ownership when other active members would otherwise be left without an owner.
5. `npm run privacy:process-deletions` atomically claims due work, sets a 30-minute lease token, freezes account access, and revokes Auth sessions. An expired lease is reclaimed with a new token; no worker can mutate a claim it no longer owns.
6. The worker performs this exact order: initial `photos`/`horoscopes` Storage cleanup, database cleanup/anonymization, final Storage sweep, Supabase Auth deletion, then a non-identifying completion receipt retained for 30 days. Pre-Auth failures receive a one-hour retry; post-Auth receipt failures exit non-zero and resume only receipt completion after lease expiry.

Run the worker only in an isolated trusted environment:

```bash
read -rsp "Supabase service-role key: " SUPABASE_SERVICE_ROLE_KEY && echo
export SUPABASE_SERVICE_ROLE_KEY
node --env-file=.env.local scripts/process-account-deletions.mjs
unset SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must not appear in `.env.example`, browser code, Vercel client variables, logs, or GitHub Actions.

### Production schedule and monitoring

Run the worker at least hourly before enabling account deletion in production. A 15-minute schedule gives prompt stale-lease recovery while remaining well below the 30-minute lease:

```cron
*/15 * * * * node --env-file=/secure/nakshatra.env /app/scripts/process-account-deletions.mjs
```

The scheduler must use an isolated trusted runtime with the service-role key injected by its secret manager. Alert on every non-zero worker exit, any processing lease older than 30 minutes, repeated failed attempts, and receipt-persistence failures. Alert payloads may contain the categorical stage/error and deployment/request correlation ID, never a user ID, session ID, Storage path, JWT, provider response, or service-role credential.

## Retention Schedule

| Data class | Period | Action |
|---|---:|---|
| API rate-limit counters | 2 days | Delete |
| Anonymous viewer sessions | 90 days | Delete |
| Portfolio views and events | 395 days | Delete |
| Closed/rejected requester contact data | 180 days | Anonymize |
| Access audit events | 730 days | Delete |
| Completed deletion receipts | 30 days | Delete |
| Database backups | 30-day target | Provider-managed |

Run application retention with the same temporary service-role procedure:

```bash
node --env-file=.env.local scripts/run-data-retention.mjs
```

Backup retention and deletion propagation must be configured and evidenced in the hosting provider. Restores must preserve the deletion queue so erased subjects are not silently reintroduced.

## Organization Role Matrix

| Capability | Owner | Admin | Editor | Broker agent | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Read organization and membership roster | Yes | Yes | Yes | Yes | Yes |
| Read private candidate and portfolio rows | Yes | Yes | Yes | Yes | No |
| Update organization settings | Yes | Yes | No | No | No |
| Delete organization | Yes | No | No | No | No |
| Manage non-owner memberships | Yes | Yes | No | No | No |
| Grant or remove owner role | Yes | No | No | No | No |
| Manage candidates and portfolios | Yes | Yes | Yes | Yes | No |
| Manage matchmaker profile | Yes | Yes | No | Yes | No |
| Manage broker clients | Yes | Yes | Yes | Yes | No |
| Manage lead claims | Yes | Yes | No | Yes | No |
| Read organization billing | Yes | Yes | No | No | No |

Organizations are created only through `create_organization_with_owner()`, which inserts the organization and first owner in one transaction. A deferred database invariant prevents any existing organization from ending a transaction without an active owner.

## Requester Consent

The interested-request form must continue to state its purpose before submission: the supplied identity, contact, family context, and message are used to request controlled portfolio access and are shown to the portfolio owner. Closed or rejected request PII is anonymized after 180 days. A requester can include their own submitted requests in account export and remove them through account deletion.

## Verification

- Generate schema types with `npm run db:types` after every migration and commit the result.
- Run `npm run test:db:local` for session binding, the role matrix, deletion state transitions, leases, processing lock, worker receipts, export isolation, and retention behavior.
- Run unit, build, and browser suites before release.
- Verify provider settings and backup evidence manually for each environment; application tests cannot prove control-plane configuration.
