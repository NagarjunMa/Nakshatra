# Security Phase 4: Identity, Privacy, and Organization Roles

This phase establishes the application controls for session invalidation, account privacy, data retention, and least-privilege B2B access. Supabase dashboard and hosting-provider settings remain deployment responsibilities and must be verified separately.

## Session Controls

- Every protected server page and API request validates the Supabase token and calls `is_current_session_active()`.
- The RPC binds the JWT `session_id` to a live row in `auth.sessions`. A revoked session therefore stops working immediately in Nakshatra even if its signed access token has not expired.
- `/account` lets a user revoke every other session through Supabase Auth's `others` sign-out scope.
- Account deletion uses global sign-out after public access has been revoked and the deletion request has been persisted.

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

1. The user types `DELETE` in `/account`.
2. `request_account_deletion()` unpublishes portfolios, disables public snapshots, revokes Full View grants, closes active requests, and schedules deletion after 24 hours.
3. The user is signed out globally. They can sign in again during the recovery window and cancel; canceled portfolios remain unpublished.
4. An organization owner must transfer ownership when other active members would otherwise be left without an owner.
5. `npm run privacy:process-deletions` claims due work, removes `photos` and `horoscopes` objects through the Storage API, anonymizes submitted-request PII, deletes direct candidate records and empty organizations, then deletes the Supabase Auth user.
6. The worker retains a non-identifying completion receipt for 30 days. Failed work is retried after one hour without logging user IDs, paths, or provider errors.

Run the worker only in an isolated trusted environment:

```bash
read -rsp "Supabase service-role key: " SUPABASE_SERVICE_ROLE_KEY && echo
export SUPABASE_SERVICE_ROLE_KEY
node --env-file=.env.local scripts/process-account-deletions.mjs
unset SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must not appear in `.env.example`, browser code, Vercel client variables, logs, or GitHub Actions.

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
- Run `npm run test:db:local` for session binding, the role matrix, deletion transitions, export isolation, and retention behavior.
- Run unit, build, and browser suites before release.
- Verify provider settings and backup evidence manually for each environment; application tests cannot prove control-plane configuration.
