# BrokerDesk Phase 2 — Implementation Progress

Status: Slice 1 merged; Slice 2 onboarding foundation merged and security completion in progress
Started: 2026-09-08  
Approved plan: [Phase 1 Implementation Plan](./phase-1-implementation-plan.md)

## Tracking approach

The user has opted out of Linear updates for this work. Decisions, changed files, verification results, risks, and deviations are recorded here, in the master plan, and in associated GitHub pull requests. The safety foundation merged through PR #40, the capability foundation merged through PR #41, and the first Slice 2 onboarding unit merged through PR #42. Related implementation units now remain on one local feature branch with local checkpoint commits; a pull request and merge happen only at a deliberate, reviewable checkpoint instead of after every small phase.

## Repository preparation

- Original checkout: reconciled with the latest remote state; obsolete landing-page edits and duplicate authentication CSS were intentionally excluded.
- Integration branch: `security/nak-68-brokerdesk-safety-foundation`.
- Pull request: [#40 — BrokerDesk safety foundation](https://github.com/NagarjunMa/Nakshatra/pull/40).
- Merge: squash commit `22faf86` on `main` after all required checks passed.
- Completed branch and isolated phase worktree: removed after clean-state, tree-equivalence, and patch-equivalence verification.
- Capability pull request: [#41 — BrokerDesk capability foundation](https://github.com/NagarjunMa/Nakshatra/pull/41), squash-merged as `32e5b62`.
- Onboarding pull request: [#42 — Private BrokerDesk onboarding](https://github.com/NagarjunMa/Nakshatra/pull/42), squash-merged as `44b5641` after all three required checks passed.
- Current branch: `feat/nak-68-brokerdesk-slice-2-completion`, created directly from synchronized `main` at `ac5026a` after the merged onboarding and identity-verification operations commits.

## Latest-main baseline

| Check | Result |
|---|---|
| Dependency install | Passed (`npm ci`) |
| ESLint | Passed with one existing `@next/next/no-img-element` warning in `src/app/p/[token]/opengraph-image.tsx` |
| TypeScript | Passed |
| Full unit and integration test suite | Passed: 68 files, 421 tests |
| Feature coverage policy | Passed: 29 mapper, service, and contract files at 80% or higher per metric |
| Production build | Passed with non-secret build-only Supabase placeholders |
| Dependency audit before remediation | Failed: 6 advisories — 3 moderate, 2 high, 1 critical |
| Dependency audit after remediation | Passed: 0 known vulnerabilities |
| Static database fixture check | Passed |
| Executable database/pgTAP suite | Passed in PR CI after clean migration replay |

## Slice 1 changes implemented

### Dependency security

- Next.js and matching ESLint config updated from `16.3.1` to `16.3.4`.
- Sharp updated from `0.35.3` to `0.35.4`.
- Vitest and its coverage provider updated from `4.1.10` to `4.1.11`.
- Transitive `js-yaml` resolved to its patched version through the lockfile.
- No unrelated major-version upgrades were taken.

### Customer ownership boundary

- Added `20260908000000_separate_candidate_ownership_from_agency_access.sql`.
- `owns_candidate` now requires the authenticated user to be `primary_owner_user_id`.
- `created_by` and `current_organization_id` are audit/legacy attribution only and confer no ownership.
- `can_manage_portfolio` no longer grants management through organization membership or `owner_organization_id`.
- The live-session requirement remains inside both security-definer predicates.
- Direct organization-operator policies were removed from customer candidate and portfolio tables.
- Future broker access will use narrow consent-, capability-, assignment-, and mandate-aware projections.

### Private defaults and opaque references

- Future `app_private` tables, sequences, and functions receive fail-closed default privileges.
- Added a private public-reference generator using 128 bits of database randomness.
- Allowed reference types are workspace `wrk_`, broker/customer relationship `bcr_`, broker route `bir_`, customer Introduction case `inc_`, task `tsk_`, import `imp_`, and invitation `inv_`.
- Added strict application schemas that prevent reference types from being substituted.
- Branded the application reference types so accidental cross-type use is also rejected by TypeScript.

### Rate-limit identity hardening

- Replaced the unkeyed deterministic IP/user-agent digest with HMAC-SHA-256 using a dedicated server-only secret.
- Production forwarding headers are ignored unless the deployment is verified as Vercel or explicitly configured behind Cloudflare.
- Invalid network hints normalize to a neutral value instead of being persisted or trusted.
- User-agent input is bounded before hashing.
- Production fails closed with a `503` when the HMAC key is unavailable.
- Added tests for keyed rotation, spoofed forwarding headers, stable 64-character database input, and missing-key failure.
- Added trusted Vercel and explicitly configured Cloudflare address normalization coverage, including bracketed IPv6 input.

### Multi-agency tests

- Added `brokerdesk_ownership_boundary.test.sql` with Customer A, Customer B, Broker A, Broker B, and a suspended employee.
- Both customers are represented in both agency relationship tables.
- Each broker sees only its own agency relationships.
- Neither broker directly reads or mutates customer candidate or portfolio rows.
- Updated the former RBAC expectation that incorrectly required a broker-agent candidate mutation to persist.

## Database verification outcome

Docker and Podman remain unavailable on the local host, so executable database validation ran in PR CI. CI replayed all migrations from a clean database and ran the full pgTAP suite successfully. The first run correctly exposed two fixture-contract mismatches; both were fixed before merge, and the rerun passed all required checks.

## Ownership-predicate impact review

All current callers of `owns_candidate` and `can_manage_portfolio` were reviewed after changing them to customer-owner-only predicates. Their surviving uses protect customer-controlled publication, media, horoscope, snapshot, reveal-grant, interest-decision, verification, and dashboard-draft operations. None requires implicit agency ownership. BrokerDesk access will therefore be added as explicit, narrower projections and commands instead of widening these predicates again.

## Next executable steps

1. Add audited access-replacement and immediate-suspension commands using opaque member references and atomic AAL2 proof consumption.
2. Generalize the existing Didit lifecycle for an organization representative without creating a hidden customer candidate or a duplicate verification workflow.
3. Keep document upload and organization activation unavailable until retention, KMS, malware scanning, and reviewer authorization are implemented and approved.

## Slice 2 completion decisions

- A broker representative must not be represented by a synthetic `candidate`. Candidate identity remains customer/portfolio identity.
- Representative verification must reuse the existing Didit provider lifecycle, webhook handling, retry controls, and audit model through an explicit verification-subject abstraction.
- Account-deletion reauthentication remains deletion-only. BrokerDesk privilege changes require a separate purpose-bound proof tied to the actor, fresh Supabase session, workspace, action, expiry, and one-time consumption.
- Team invitation, access replacement, suspension, verification management, export, and future billing/recovery actions cannot share an unscoped bearer proof.
- BrokerDesk team commands must re-evaluate live membership, role capability, workspace state, and target restrictions inside the same database transaction that consumes the proof.
- Browser onboarding end-to-end coverage is already present and passed 20 desktop/mobile checks in PR #42; it is not an outstanding Slice 2 task.

## Privileged fresh-authentication foundation implemented

- Added an independent private challenge store for BrokerDesk privilege changes; it does not broaden or reuse the account-deletion challenge table.
- Bound every challenge and proof to the authenticated actor, opaque workspace reference, exact allowlisted action, initiating session, newer verified session, ten-minute expiry, and one-time consumption.
- Added database authorization mapping for `team_invite`, `team_access_replace`, `team_suspend`, and `verification_manage`; only active owner/admin member-access presets with the corresponding capability may start or complete a challenge.
- Kept proof consumption private and ungranted. A later audited command must call it with its internally resolved organization and exact action inside the command transaction.
- Added an independent rate-limit bucket and independent server-only HMAC secret. Raw proofs are never stored; only SHA-256 hashes reach the private database table.
- Added the versioned reauthentication-start endpoint with same-origin enforcement, bounded/strict JSON, live-session validation, verified-account email derivation, safe OAuth/OTP callback, uniform inaccessible-workspace handling, and no caller-selected identity.
- Scoped the HttpOnly proof cookie to the exact workspace API path and signed its workspace/action payload. Changing a URL cannot change the signed scope or database authorization.
- Hardened the shared authentication callback so reserved reauthentication callbacks require their matching signed transaction; a stale deletion cookie can no longer turn an ordinary sign-in callback into deletion reauthentication.
- Added application and adversarial pgTAP coverage for cross-workspace actors, same-session rejection, action substitution, replay, and immediate membership suspension.
- This is a fresh-authentication prerequisite, not the complete MFA release gate. No privileged team or verification mutation is exposed yet; owner/admin MFA enrollment and assurance-level enforcement remain required before those commands become active.

## Current local verification for Slice 2 completion branch

| Check | Result |
|---|---|
| Static database fixture contract | Passed |
| ESLint | Passed with the existing Open Graph `<img>` warning only |
| TypeScript | Passed |
| Full application suite | Passed: 89 files, 514 tests |
| Feature coverage policy | Passed |
| Production build | Passed; new versioned route included |
| Dependency audit | Passed: 0 known vulnerabilities |
| New executable pgTAP suites | Authored with 70 assertions across fresh-auth/MFA, team projection, and employee invitations; local replay unavailable without Docker/Podman and deferred to the combined checkpoint PR CI |

## Opaque team projection implemented

- Added immutable server-generated `mbr_` references for organization members; internal membership, user, and organization UUIDs are omitted from the BrokerDesk team response.
- Disabled the legacy generic membership read/insert/update/delete RLS paths for matchmaker agencies while preserving the established family/platform organization behavior.
- Added an owner/admin-only database projection that works during onboarding, returns the same unavailable shape for malformed, missing, cross-agency, advisor, and unauthorized requests, and omits removed members.
- Limited the projection to the employee name, verified account email when present, safe role preset, membership status, simple customer-access label/count, joined time, and current-user flag.
- New employees remain at `none` customer access until explicit assignments exist; suspended employees remain visible to authorized owners/admins with a clear suspended status.
- Added a no-store, independently rate-limited versioned team-read endpoint and registered it in the machine-readable endpoint inventory.
- Added application tests plus an adversarial pgTAP suite covering reference generation/immutability, UUID omission, direct-table bypass attempts, cross-agency substitution, advisor enumeration, and suspended-member projection.

## BrokerDesk MFA assurance gate implemented

- Changed the privilege flow to two stages: a fresh conventional sign-in creates only signed, HttpOnly MFA-pending state; it can no longer issue a privileged action proof.
- Added a focused `/brokerdesk/security/mfa` experience using simple language and the existing Nakshatra visual system. Brokers may enroll a TOTP authenticator or verify an existing one; setup secrets remain browser-only.
- Added a same-origin, strict and bounded `POST /api/v1/brokerdesk/reauth/complete` endpoint with its own database rate-limit bucket. Its workspace, action, challenge, and next destination come only from signed or server-derived state.
- PostgreSQL now requires the live JWT to be `aal2` both when storing the hashed one-time proof and when a future command consumes it. A later downgrade to `aal1` blocks consumption even if the cookie is present.
- Missing or tampered pending state, cross-origin requests, action injection, and AAL1 completion fail closed. Privileged mutations remain unavailable until they atomically consume this proof and write their audit event.
- Enabled local Supabase TOTP enrollment and verification while leaving phone MFA disabled.

## BrokerDesk employee invitation and acceptance implemented

- Added an operational owner/admin team-settings page using the existing minimal team projection and simple role/customer-access language.
- Creating an invitation requires the exact `team_invite` AAL2 proof. PostgreSQL consumes the proof, rechecks actor and target-role restrictions, enforces idempotency and quotas, creates the private invitation, and writes its audit event in one transaction.
- Owners may invite Admin, Broker, Coordinator, or View-only employees; admins cannot create another admin; nobody can invite another owner or their own account.
- Invitation credentials use an independent server-only key so an identical idempotent retry recreates the same link without persisting plaintext. The private database stores only token and normalized-email hashes plus a masked email hint.
- Links use `/join/team#token=...`. Same-origin code removes the fragment from browser history and exchanges it into a signed, exact-path, 15-minute HttpOnly cookie. GET requests and link scanners cannot accept an invitation.
- Acceptance requires a live Nakshatra session with the same verified email, creates the employee in the existing membership/RBAC source of truth, and gives zero customer assignments by default.
- Tokens expire after seven days, work once, return neutral unavailable responses, and cannot reactivate an existing suspended or removed employee. Creation and acceptance are append-only audited.

## Capability foundation implemented

- Added server-generated, immutable `wrk_` workspace and `bcr_` agency-relationship references. These are identifiers only and never capabilities.
- Added private owner/admin/advisor/coordinator/viewer presets backed by explicit capability and resource-scope records.
- Preserved the existing public membership enum as a compatibility input: `broker_agent` maps to advisor, `editor` to coordinator, and authorization evaluates capabilities rather than exposing the legacy role directly.
- Added private, cross-organization-safe member access, customer assignment, and customer mandate structures with current-time and revocation checks.
- Defined effective relationship authorization as live session × active agency/member × latest entitlement × capability × scope/assignment × current mandate.
- Made `brokerdesk.enabled` fail closed and latest-record-wins so a newer false or expired entitlement immediately removes access.
- Replaced broad direct `broker_clients` CRUD with read-only, capability-scoped RLS. Future relationship mutations remain reserved for audited command RPCs.
- Kept candidate and portfolio ownership owner-only; no new broker projection reads either table.
- Added a minimal server-only access resolver with the same `{ enabled: false }` contract for malformed, missing, disabled, suspended, and cross-tenant workspace references.
- Added a strict, machine-readable endpoint inventory for the first planned BrokerDesk and combined customer contracts.
- Added adversarial pgTAP coverage for two agencies, owners, assigned/unassigned advisors, a suspended employee, entitlement revocation, assignment revocation, mandate expiry/revocation, cross-tenant references, and deleted sessions.

## Current verification

| Check | Result |
|---|---|
| Static database fixture contract | Passed |
| ESLint | Passed with the existing Open Graph `<img>` warning only |
| TypeScript | Passed |
| Unit/integration suite | Passed: 70 files, 430 tests |
| Feature coverage policy | Passed: 31 mapper, service, and contract files at 80% or higher per metric |
| Local executable database replay | Unavailable because Docker/Podman is not installed on this host; required in PR CI before merge |

## Progress log

### 2026-09-08

- Phase 1 implementation plan approved and Phase 2 authorized.
- Fetched latest remote `main` without changing the dirty original checkout.
- Created an isolated detached worktree at `c67337d`.
- Read the installed Next.js 16 guidance for route handlers, server/client boundaries, authentication, data security, and proxy behaviour.
- Established the latest-main lint, typecheck, unit-test, build, and dependency-security baseline.
- At the user's direction, stopped Linear operations and retained local documents as the implementation record.
- Applied patch-level dependency security updates and reduced the audit from six advisories to zero.
- Implemented the customer-ownership boundary, private default privileges, opaque public-reference contract, and two-agency ownership/isolation fixture.
- Hardened anonymous rate-limit subjects with a server-only keyed HMAC and trusted-proxy rules.
- Reviewed every current ownership-predicate caller and confirmed it belongs to a customer-controlled operation; no implicit agency ownership is required.
- Confirmed lint (one pre-existing warning), TypeScript, all 421 tests, the per-feature coverage policy, production build, static database checks, and a zero-vulnerability audit.
- Recorded the unavailable Docker/Podman runtime as an explicit database-verification gap.
- Reconciled all intended Slice 1 work onto `security/nak-68-brokerdesk-safety-foundation`; excluded obsolete UI changes and duplicate CSS that would have regressed the current B2C implementation.
- Opened PR #40 with reconciliation, security, and verification notes.
- Corrected the CI-discovered inactive-member fixture and stale approved-contact lifecycle assertion.
- Confirmed all three required checks, including clean migration replay and the full pgTAP suite.
- Squash-merged PR #40 as `22faf86`, synchronized local `main`, and removed the completed phase branch and isolated worktree after equivalence checks.
- Created `feat/nak-68-brokerdesk-capability-foundation` from the clean merged `main` for the next executable slice.

### 2026-09-09

- Confirmed local and remote `main` are identical at `22faf86` and the feature branch begins from that exact baseline.
- Implemented the BrokerDesk capability, scope, assignment, mandate, entitlement, and opaque workspace/relationship reference foundation.
- Tightened agency relationship reads and removed direct relationship mutations from the authenticated Data API surface.
- Added the server-only access contract/repository/service and the versioned endpoint inventory.
- Added two-agency authorization and immediate-revocation database tests; updated the earlier ownership fixture to explicitly enable BrokerDesk.
- Passed static database checks, TypeScript, all 430 tests, feature coverage, and lint with only the pre-existing Open Graph warning.
- Confirmed PR #41 passed application and database checks, squash-merged it as `32e5b62`, and synchronized `main` before creating `feat/nak-68-brokerdesk-onboarding-rbac`.
- Added private organization onboarding state, business and representative data, exact verification checks, quarantined document metadata, idempotency records, and append-only audit events.
- Added atomic workspace creation and versioned onboarding-save RPCs. Workspaces start as `onboarding` with `brokerdesk.enabled = false`; form submission cannot activate or verify them.
- Added same-shape unavailable handling for malformed, missing, and cross-tenant workspace references and closed direct legacy organization/matchmaker mutation grants.
- Added separate bootstrap/create/read/write rate limits and strict application/database input allowlists that reject organization IDs, roles, entitlements, and verification state from clients.
- Reused the B2C authentication UI with server-derived BrokerDesk continuation. BrokerDesk signup, password sign-in, OTP verification, and OAuth callback do not implicitly provision customer portfolios.
- Added the responsive `/brokerdesk/onboarding` flow for business, representative, practice, review, and verification stages. Document upload is visibly unavailable until secure release controls are complete.
- Added service, route, client API, auth-continuation, UI interaction, and 43-assertion pgTAP coverage. TypeScript, lint, production build, dependency audit, all 457 application tests with feature coverage, 20 desktop/mobile end-to-end checks, and the static database check pass.
- Docker/Podman is still unavailable locally. The new migration and pgTAP suite therefore require clean CI database replay before merge.
- Confirmed PR #42 passed lint/test/build, secret scan, and clean Supabase migration/pgTAP checks, then squash-merged it as `44b5641`.
- Synchronized local `main` with `origin/main` at `ac5026a` and created `feat/nak-68-brokerdesk-slice-2-completion` from that exact clean baseline.
- Adopted combined-checkpoint delivery: related Slice 2 completion units and, when review size remains reasonable, the first Slice 3 foundation may accumulate as local commits before one PR.
- Confirmed the existing Didit persistence is candidate-keyed and therefore cannot safely represent a broker without violating the one-customer-portfolio source of truth.
- Chose a separate purpose-bound BrokerDesk fresh-authentication proof as the first completion prerequisite; the existing account-deletion proof will not be broadened or reused.
- Implemented the purpose-bound fresh-auth perimeter across private database state, server-only repository/service/cookies, the versioned start route, callback completion, rate limiting, endpoint inventory, environment contract, and adversarial tests.
- Passed static database validation, lint, TypeScript, all 482 application tests with feature coverage, production build, and a zero-vulnerability dependency audit.
- Kept privileged mutations disabled and recorded MFA assurance plus clean executable database replay as release gates rather than presenting fresh login as sufficient authorization.
- Added opaque employee references and the first minimal BrokerDesk team-read projection; closed the broad legacy membership Data API surface for matchmaker agencies without altering family/platform organization behavior.
- Passed all 489 application tests and feature coverage, lint, TypeScript, production build, static database validation, and dependency audit after the team projection unit.
- Implemented the TOTP MFA assurance gate: first-factor callbacks now issue only signed pending state, the browser raises the live session to AAL2, and PostgreSQL requires AAL2 again at proof issuance and consumption.
- Added the strict MFA completion API, independent rate limit, server-derived continuation, no-index setup/verification UI, and adversarial application/database tests. All 498 application tests and feature coverage, lint, TypeScript, production build, static database validation, and dependency audit pass; the expanded 44-assertion pgTAP set awaits combined-checkpoint CI replay.
- Added the audited employee-invitation command, fragment-to-HttpOnly exchange, verified-email acceptance, team-settings UI, independent quotas, private hashed persistence, and existing-RBAC membership activation with no customer assignments.
- Verified invitation idempotency without authorization bypass, action-proof consumption, cross-account denial, single use, URL/history safety, owner exclusion, suspension preservation, cross-origin denial, authentication and rate-limit enforcement, fail-closed behavior, and safe projections. All 514 application tests and the feature-coverage gate pass; 26 new pgTAP assertions await the combined-checkpoint CI replay.
