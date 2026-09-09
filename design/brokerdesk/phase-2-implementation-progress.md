# BrokerDesk Phase 2 — Implementation Progress

Status: Slice 1 capability foundation implemented; PR verification pending
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

1. Verify the capability migration through a clean CI database replay and the complete pgTAP suite.
2. Merge the reviewed capability foundation through a squash PR and synchronize `main`.
3. Begin the organization onboarding/verification command slice from a new compliant feature branch.
4. Add targeted end-to-end tests after the first BrokerDesk route surface exists.

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
