# BrokerDesk Phase 2 — Implementation Progress

Status: Slice 1 merged and database-verified; Slice 2 ready
Started: 2026-09-08  
Approved plan: [Phase 1 Implementation Plan](./phase-1-implementation-plan.md)

## Tracking approach

The user has opted out of Linear updates for this work. Decisions, changed files, verification results, risks, and deviations are recorded here, in the master plan, and in the associated GitHub pull request. Slice 1 was reconciled through PR #40 and squash-merged to `main`; the next slice continues from the clean branch `feat/nak-68-brokerdesk-capability-foundation`.

## Repository preparation

- Original checkout: reconciled with the latest remote state; obsolete landing-page edits and duplicate authentication CSS were intentionally excluded.
- Integration branch: `security/nak-68-brokerdesk-safety-foundation`.
- Pull request: [#40 — BrokerDesk safety foundation](https://github.com/NagarjunMa/Nakshatra/pull/40).
- Merge: squash commit `22faf86` on `main` after all required checks passed.
- Completed branch and isolated phase worktree: removed after clean-state, tree-equivalence, and patch-equivalence verification.
- Current branch: `feat/nak-68-brokerdesk-capability-foundation`, created directly from synchronized `main`.

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

1. Add explicit capability, scope, assignment, and mandate structures without restoring direct agency access to customer tables.
2. Add server-enforced BrokerDesk entitlements and an endpoint inventory foundation.
3. Add targeted end-to-end tests after the first BrokerDesk route surface exists.

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
