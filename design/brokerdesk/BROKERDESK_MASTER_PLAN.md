# Nakshatra BrokerDesk — Living Product and Engineering Plan

Status: Planning approved; Phase 2 representative verification, Slice 3 manual customer intake, and secure customer detail implemented on the combined feature branch
Maintainer: Update this document whenever a product decision, architectural decision, phase status, risk, or implementation deviation is approved.

## Purpose

This is the durable planning and implementation index for BrokerDesk. It prevents product, security, and delivery decisions from existing only in chat history. Detailed phase documents remain separate and are linked here.

BrokerDesk extends Nakshatra's existing B2C platform. It does not fork identity, portfolio, privacy, verification, or disclosure domains.

The central workflow object is the Introduction. BrokerDesk is not a CRM; it is a privacy-first relationship workflow for matrimonial professionals.

## Product outcomes

- Replace fragmented WhatsApp, spreadsheet, phone-call, and memory-based work.
- Let a broker manage hundreds or thousands of customer relationships without increasing operational complexity.
- Preserve the broker's human judgement and conventional communication methods.
- Keep the customer in control of their identity, portfolio, decisions, and private disclosures.
- Make every important action attributable, reversible where appropriate, and auditable.

## Approved principles

1. Search existing implementation before designing or building a new capability.
2. Reuse existing Nakshatra domains before introducing new ones.
3. Do not duplicate business logic or create a second portfolio system.
4. Preserve one source of truth for identity, candidate data, portfolio, media, verification, consent, and disclosure.
5. Every feature must improve trust, privacy, simplicity, or broker productivity.
6. URLs and identifiers are references, never authorization.
7. Default-deny authorization and cross-agency isolation are release requirements.
8. Sensitive workflow mutations happen through validated database commands, not unrestricted table writes.
9. Customer-facing language must be understandable without technical knowledge.
10. No production code is implemented until the planning phases are reviewed and approved.

## Core ownership model

| Domain | Owner | Rule |
|---|---|---|
| Nakshatra identity | Customer | One account may participate in B2C and multiple broker relationships |
| Portfolio | Customer | One live portfolio; brokers reference it and never keep competing copies |
| Broker relationship | Customer and one agency | Private from every other agency |
| Broker route | Creating agency | Visible to that agency and the involved customers only |
| Combined Introduction history | Involved customers | Customers see every broker route; brokers do not |
| Person-level decision | Customer | A broker may report a conventional response, but cannot alter another agency's route |
| Broker selection | Customer | Exactly one broker per customer for a broker-originated Introduction |
| Contact disclosure | Each customer | Requires the agreed bilateral approval conditions |
| Agency notes and tasks | Agency | Never visible to another agency or customer unless explicitly shared |

## Locked multi-broker rules

- Nakshatra silently groups routes involving the same unordered customer pair.
- Broker A never learns that Broker B sent the same pair.
- Customers see the involved broker names and sharing history on their own dashboard.
- A customer shows interest through exactly one eligible broker route.
- There is no "continue without a broker" choice within a broker-originated Introduction.
- The unselected broker receives a neutral status and no competitor information.
- Each broker route receives its own 30-day response period.
- Expiration is no response, not rejection.
- Explicit person-level rejection begins a 90-day cooling period.
- "Never show this person again" is controlled by the customer.
- Customers may change broker selection until contact disclosure.
- If the two customers select different brokers, the workflow stops safely without revealing brokers or releasing contacts.

## Conventional broker workflow

Brokers may record responses received by phone, WhatsApp, or in person. The customer sees who recorded the response and may confirm or correct it. The broker UI uses simple language:

- Interested
- Not interested
- No response yet
- Request retry
- Close

A broker-recorded response is scoped to that broker's route until the customer or authorized delegate confirms the controlling person-level decision. This prevents one agency from changing another agency's workflow.

## Portfolio update policy

- Customer edits remain private drafts until published.
- Active Introduction views use the current published portfolio.
- Brokers do not reshare after normal edits.
- Privacy reductions take effect immediately.
- Critical identity, marital status, verification, ownership, or availability changes may pause sharing and require review.
- Internal history preserves the published state at send time and all later changes for disputes and audit.
- Emails contain authenticated links, not static full-profile attachments.

## Deferred product decisions

### Different brokers selected

Customer A selects Broker A and Customer B selects Broker B. Current safe state: `representation_alignment_pending`. No automatic contact release and no cross-broker identity disclosure. Exit behaviour requires broker research.

### Direct B2C plus broker routes for the same pair

The architecture must support both sources without exposing direct activity to brokers. The combined acceptance workflow is deferred. Broker-originated Introductions do not offer self-service continuation.

### Cross-agency commission or ownership settlement

Not part of the MVP. Attribution history will be preserved, but the system will not reveal agencies to one another or settle commissions automatically.

## Product information architecture

Broker workspace:

- Dashboard
- Customers
- Introductions
- Tasks
- Settings

Customer workspace:

- Home
- My Portfolio
- Introductions
- My Brokers
- Access and Privacy
- Account

## Existing codebase capabilities to reuse

- Supabase authentication and live-session validation.
- `user_profiles`, `organizations`, and `organization_members`.
- `candidates` and structured candidate detail tables.
- Customer portfolios, versions, sections, media, visibility rules, and secure storage.
- Public and approved sanitized portfolio snapshots.
- Interest requests, reveal grants, access audit events, and disclosure lifecycle RPC patterns.
- Didit candidate identity verification.
- API rate-limit storage and consumption function.
- Atomic owner-dashboard save and portfolio publication transaction patterns.
- Existing Nakshatra theme, template renderer, and progressive-disclosure UI language.

## Known existing-model risks

- `candidates.current_organization_id` implies one current organization and does not model private many-to-many broker relationships.
- `owns_candidate` currently treats creator and certain organization operators as owners; this is too broad for customer-owned multi-broker data.
- `can_manage_portfolio` can inherit that broad ownership and must not authorize BrokerDesk disclosure.
- `broker_clients.notes` is plaintext and mixes the relationship record with sensitive free-form notes.
- Existing organization roles are broad presets without assigned-customer or capability scope.
- Existing `interest_requests` are one-sided public interest handshakes, not two-party broker-mediated Introductions.
- Existing `attribution_records` choose a winner and expose a conflict concept that does not match the approved hidden multi-broker model.
- Existing `reveal_grants` are tied to interest requests and need a generalized access-grant design rather than duplicate disclosure logic.
- Existing public portfolio-link tokens require review against the new hashed, scoped capability-token standard.

## Phase register

| Phase | Status | Deliverable |
|---|---|---|
| 0A — Workflow definition | Complete | Actors, pages, privacy boundaries, multi-broker rules |
| 0B — Core clickable wireframes | Complete; refinement continues | Customer record, send Introduction, customer inbox, multi-broker detail |
| 0C — Introduction state contract | Approved baseline | States, commands, retry, expiry, profile updates, projections |
| 0D — Database and authorization architecture | Approved baseline | ERD, reuse map, constraints, transactions, RLS, encryption, audit, outbox |
| 0E — URL, API, and security contract | Approved baseline | Endpoint projections, identifiers, tokens, rate limits, abuse and penetration cases |
| 0F — Complete operational wireframes | Approved baseline | Onboarding, dashboard, bulk import, queues, tasks, renewals, RBAC, privacy |
| 1 — Implementation planning | Approved baseline | Ordered engineering plan, migrations, acceptance tests, rollout |
| 2 — Implementation | Slice 1 and secure team-access foundation merged; representative verification in progress | Capability foundation, private broker onboarding, purpose-bound MFA, audited team commands, representative verification, operational UI |

## Detailed planning documents

- [Phase 0A — Product and Workflow Foundation](./phase-0a-product-workflow-foundation.md)
- [Phase 0B — Wireframe and UX Design Contract](./phase-0b-wireframe-design-contract.md)
- [Phase 0C — Introduction State Contract](./phase-0c-introduction-state-contract.md)
- [Phase 0D — Database and Authorization Architecture](./phase-0d-database-authorization-architecture.md)
- [Phase 0E — URL, API, and Security Contract](./phase-0e-url-api-security-contract.md)
- [Phase 0F — Complete Operational Wireframes](./phase-0f-operational-wireframes.md)
- [Phase 1 — Implementation Plan](./phase-1-implementation-plan.md)
- [Phase 2 — Implementation Progress](./phase-2-implementation-progress.md)
- [Phase 0B — Clickable Prototype](../prototypes/brokerdesk-phase-0b.html)
- [Phase 0F — Clickable Prototype](../prototypes/brokerdesk-phase-0f.html)

## Security gates before implementation

- Threat model approved.
- Cross-agency isolation test matrix approved.
- Database constraints and concurrent-send behaviour approved.
- Customer, broker, support, and worker data projections approved.
- Encryption and key-management ownership approved.
- Data retention and account-deletion behaviour approved.
- URL capability-token lifecycle approved.
- Rate-limit and abuse-response policy approved.
- Broker business-verification scope approved.
- Deferred workflow states fail closed.

## Change log

### 2026-09-08

- Established Introduction as the central BrokerDesk object.
- Replaced one-active-Introduction-per-agency thinking with one hidden pair case and multiple private agency routes.
- Confirmed that brokers must never learn about competing broker activity.
- Confirmed customer-only multi-route visibility.
- Confirmed one selected broker per customer and no self-service choice inside a broker Introduction.
- Deferred different-broker alignment and combined direct/BrokerDesk acceptance.
- Chose 30-day independent broker-route response windows, 90-day rejection cooling, and customer-controlled permanent blocking.
- Chose one live customer-owned portfolio with automatic published updates and immutable audit history.
- Added Phase 0C state contract and began Phase 0D architecture design.
- Created the Phase 0D database and authorization contract, including the hidden pair/route ERD, ownership corrections, command transactions, cross-agency authorization, encryption classes, day-one intake, and migration sequence.
- Backfilled durable Phase 0A product/workflow and Phase 0B wireframe/UX contracts so every completed phase has a written artifact in addition to the master index and prototype.
- Created the Phase 0E URL, API, and security contract covering separate customer/broker identifiers and routes, explicit command APIs, sessions, CSRF, tokens, rate limits, uploads, webhooks, network boundaries, observability, and adversarial test cases.
- Created the Phase 0F operational wireframe contract and clickable end-to-end prototype covering broker onboarding, 100-customer import, business verification, employee access, dashboard queues, customer review, matching suggestions, Introduction operations, tasks, renewals, customer multi-broker response, and contact approvals.
- Recorded Phases 0D and 0E as approved baselines after review and progression to Phase 0F.
- Approved Phase 0F as the operational UX baseline and began Phase 1 implementation planning.
- Confirmed that the existing B2C `/dashboard` remains the single customer workspace. Broker Introductions, direct B2C interests, portfolio access, broker relationships, and privacy workflows will be composed into that experience without duplicating identity, portfolio, or disclosure logic.
- Added the Phase 1 ordered implementation plan covering repository reuse, customer-dashboard evolution, application boundaries, migration groups, nine vertical slices, test gates, security workstreams, rollout, and deferred dependencies.
- Approved the Phase 1 baseline and authorized Phase 2 implementation.
- Fetched the latest `origin/main` and created a detached isolated worktree so existing uncommitted work remains untouched.
- Established a passing latest-main lint, typecheck, 404-test unit, and production-build baseline; recorded current dependency advisories for explicit security remediation.
- Paused creation of the required `security/nak-<issue>-...` branch because `linear_phoenix` and a real Nakshatra issue number are not available in the current task context.
- At the user's direction, stopped Linear operations and retained all implementation decisions and progress in the local BrokerDesk documents.
- Began Slice 1 in the isolated latest-main worktree: remediated all six known dependency advisories, separated customer ownership from agency access, added private default privileges and typed opaque references, and added a Broker A/B plus Customer A/B isolation fixture.
- Replaced unkeyed anonymous rate-limit fingerprints with a server-only keyed HMAC and explicit trusted-proxy handling; production fails closed if the key is missing.
- Completed the Slice 1 application gates: 421 tests and feature coverage passed, TypeScript passed, the production build passed, lint had no errors, and the dependency audit reported zero vulnerabilities.
- Reconciled the original checkout with the latest `main`, intentionally excluded obsolete landing-page changes and duplicate authentication CSS, and preserved the current keyboard skip-link behavior.
- Opened PR [#40](https://github.com/NagarjunMa/Nakshatra/pull/40) from `security/nak-68-brokerdesk-safety-foundation` with a detailed security, reconciliation, and verification record.
- The first CI database run identified a schema-invalid inactive membership fixture and a stale lifecycle assertion from the newer approved-contact contract. Corrected the fixtures to use `suspended` membership and an owner-only `private_notes` field.
- Confirmed all three PR checks, including clean migration replay and the full pgTAP database suite, then squash-merged PR #40 as `22faf86`.
- Synchronized local `main` exactly with `origin/main`, removed the merged security branch and clean isolated phase worktree after equivalence checks, and created `feat/nak-68-brokerdesk-capability-foundation` for the next slice.
- On `feat/nak-68-brokerdesk-capability-foundation`, implemented immutable workspace/relationship references, private role-capability scopes, customer assignments and mandates, latest-record-wins BrokerDesk entitlement enforcement, capability-scoped relationship authorization, a minimal server-only access resolver, and a strict endpoint inventory.
- Kept all customer candidate and portfolio ownership rules unchanged and owner-only; no BrokerDesk direct portfolio projection was added.
- Added adversarial two-agency database coverage for assignment, mandate, entitlement, membership, session, and cross-tenant revocation boundaries. Local application checks pass; clean migration replay and pgTAP remain mandatory in PR CI because this host has no Docker/Podman runtime.
- Squash-merged the capability foundation through PR #41 as `32e5b62`, synchronized local and remote `main`, and created `feat/nak-68-brokerdesk-onboarding-rbac` from that clean baseline.
- Implemented the first Slice 2 unit: private business, representative, practice, onboarding-state, verification-check, quarantined-document-metadata, idempotency, and append-only audit structures.
- Added owner-only onboarding commands and projections using opaque workspace references, uniform unavailable responses, optimistic versions, exact input allowlists, independent rate limits, and an explicitly disabled BrokerDesk entitlement until later verification approval.
- Closed legacy direct organization and matchmaker-profile mutation paths so clients cannot self-activate or self-verify through older RLS policies.
- Reused the existing Nakshatra signup/sign-in experience for BrokerDesk continuation while ensuring that BrokerDesk authentication does not implicitly create or modify a customer portfolio.
- Added `/brokerdesk`, `/brokerdesk/onboarding`, and four versioned onboarding APIs, plus a responsive five-step operational interface using simple business language and fail-closed document-upload messaging.
- Confirmed TypeScript, lint, production build, dependency audit, all 457 application tests with feature coverage, 20 desktop/mobile end-to-end checks, and static database fixture validation. Local executable migration replay remains unavailable without Docker/Podman and is required before merge.
- Confirmed PR [#42](https://github.com/NagarjunMa/Nakshatra/pull/42) passed all three required checks, including clean migration replay and pgTAP, and squash-merged it as `44b5641`.
- Synchronized local and remote `main` at `ac5026a`, then created `feat/nak-68-brokerdesk-slice-2-completion` for a combined implementation checkpoint. Related units may accumulate as local commits; a PR is no longer required for every small phase.
- Preserved the identity source-of-truth boundary: a broker representative will not receive a synthetic customer candidate. Representative verification must generalize and reuse the Didit lifecycle without duplicating it.
- Kept deletion reauthentication purpose-bound and selected a separate actor + workspace + action + fresh-session + one-time-proof boundary for BrokerDesk team and verification privilege changes.
- Implemented that BrokerDesk fresh-authentication perimeter with private hashed proof state, independent key/rate limit, exact purpose mapping, safe callback dispatch, workspace-path HttpOnly proof cookies, private-only proof consumption, and cross-actor/action/session/replay tests.
- Kept the new perimeter inert: no team or verification privilege mutation is active until it atomically consumes the proof, rechecks authority, writes audit, and enforces the separately required owner/admin MFA assurance gate.
- Passed 489 application tests and feature coverage, lint, TypeScript, production build, static database checks, and a zero-vulnerability dependency audit. The two new pgTAP suites contain 41 assertions and await executable replay at the combined checkpoint because this host still has no Docker/Podman runtime.
- Added immutable `mbr_` employee references and an owner/admin-only team projection with uniform cross-agency denial, no internal UUIDs, explicit suspended state, and no customer access for unassigned employees.
- Closed direct membership table reads and mutations for matchmaker agencies so BrokerDesk employee data is available only through reviewed projections and future audited commands; retained the existing generic behavior for non-BrokerDesk organization types.
- Completed the BrokerDesk MFA assurance gate: a fresh first-factor callback now creates only signed pending state, TOTP enrollment and verification raise the live session to AAL2, and PostgreSQL independently requires AAL2 when issuing and consuming the exact one-time action proof.
- Added the no-index `/brokerdesk/security/mfa` flow and strict completion API without activating any privileged team or verification mutation. Workspace and action scope plus continuation URLs remain server-derived; URL editing cannot choose a tenant, action, or destination.
- Implemented the first privileged team command end to end: AAL2-protected employee invitation, fragment-to-HttpOnly exchange, verified-email single-use acceptance, existing membership/RBAC activation, zero default customer assignments, and append-only audit. Suspended or removed employees cannot be reactivated by an invitation.
- Added the operational team-settings and `/join/team` interfaces. Invitation tokens never enter the query string or database in plaintext, and link-scanner GET requests cannot consume them.
- Kept authorization ahead of the invitation idempotency return so suspension, demotion, or an MFA assurance downgrade takes effect immediately, including during an otherwise identical retry.
- Implemented role replacement and suspension as separate, AAL2 purpose-bound commands over opaque workspace/member references. They reuse the existing membership/RBAC source of truth, prohibit generic owner/self mutations, and audit atomically.
- Defined agency suspension as membership-scoped: it invalidates pending privileged proofs and stops that agency's access immediately, while preserving the person's shared Nakshatra identity, customer portfolio session, and memberships in other agencies.
- Confirmed all PR #43 checks, including clean migration replay and the complete pgTAP suite, then squash-merged the secure BrokerDesk team-access foundation as `c75f6f1`.
- Synchronized local `main` with `origin/main`, removed the merged feature branch, and created `feat/nak-68-broker-representative-verification` from the clean merged checkpoint.
- Began the representative-verification unit with the locked boundary that the authenticated business representative is an explicit verification subject; no synthetic customer candidate, duplicated Didit workflow, business-document release, or automatic workspace activation is permitted.
- Implemented that boundary on `feat/nak-68-broker-representative-verification`: the existing Didit lifecycle now supports an organization- and user-bound representative subject, requires an exact one-time AAL2 `verification_manage` proof, and cannot activate the organization or BrokerDesk entitlement.
- Kept the representative birth date outside PostgreSQL and audits. Only a purpose-bound HMAC reaches private persistence while the decision is pending, and it is erased at terminal reconciliation; representative name changes invalidate the previous result and fail BrokerDesk access closed.
- Added database subject-binding invariants, a no-store/rate-limited versioned API, safe consent-management recovery, worker matching, adversarial two-broker pgTAP coverage, and plain-language onboarding UI. All 535 application tests, coverage policy, lint, TypeScript, build, static database checks, and dependency audit pass; clean executable database replay remains required in later PR CI because Docker/Podman is unavailable locally.
- Committed representative verification locally as `e85bd19`, then stacked `feat/nak-68-brokerdesk-customer-intake` so related work can reach one deliberate review checkpoint rather than consuming a PR per small unit.
- Implemented the first Slice 3 vertical slice without duplicating B2C identity or portfolio data: private hashed customer invitations, fragment-to-HttpOnly exchange, exact verified-email claim, explicit consent, and automatic activation only against the claimant's canonical B2C candidate.
- Locked multi-agency intake behavior in code: the same customer portfolio may have one relationship per agency; each broker projection contains only its own agency records, while `/brokers` gives the customer alone the combined relationship view.
- Closed direct authenticated reads of `broker_clients`; browser access is now through bounded, purpose-built broker and customer projections that omit internal candidate, organization, and relationship UUIDs.
- Added the BrokerDesk customers, customer join, and customer My Brokers interfaces with simple language, seven-day invitations, a thirty-minute exact-path exchange cookie, a versioned one-year default representation mandate, independent rate limits, audit lineage, and organization-matching foreign keys.
- Kept bulk CSV content storage closed because retention and production KMS ownership remain unresolved. Manual invitation stores no spreadsheet row and never creates an unclaimed shareable profile.
- Passed all 556 application tests, global and per-feature coverage, TypeScript, production build, static database validation, and dependency audit. Clean migration and pgTAP execution remains a mandatory PR CI gate because Docker/Podman is unavailable locally.
- Added an opaque broker customer-detail route and API that resolve workspace and relationship references together, recheck live role/assignment/mandate/entitlement authorization, expose no internal UUIDs, and return uniform unavailable responses across missing and unauthorized cases.
- Locked the published-version privacy boundary for BrokerDesk customer lists and details: brokers see only the last published portfolio identity fields, never mutable candidate or draft edits; customers without a first publication appear as a neutral `Customer` placeholder.
- Expanded the combined checkpoint to 559 passing application tests and a 44-assertion customer-intake/detail pgTAP contract. Lint, TypeScript, coverage, production build, static database validation, and dependency audit pass; executable clean migration replay remains the PR CI merge gate.
- PR #44's first clean replay found a PostgreSQL function-parameter rename incompatibility before pgTAP execution. Retained the prior parameter name without changing the new subject-based behavior so the historical migration chain remains replayable.

## Maintenance rule

For every future planning or implementation session:

1. Read this document and the current phase document.
2. Compare the documented plan with the repository state.
3. Update the phase register when work meaningfully advances.
4. Record newly approved decisions and deviations in the change log.
5. Keep unresolved questions explicit; do not silently invent an answer.
6. When implementation is approved and a Linear issue is created, copy the approved plan into the Phoenix works / Nakshatra issue so Linear becomes the durable implementation source of truth.
