# Nakshatra — Current Repository and Product Reference

**Updated:** 2026-09-11

**Repository:** `nakshatra`

**Product:** Nakshatra

**Detailed B2C pilot assessment:** [`docs/b2c-pilot-product-assessment.md`](docs/b2c-pilot-product-assessment.md)

This file describes the checked-in repository as it exists now. It must distinguish code that exists from capabilities approved for a specific launch. Do not infer production configuration from repository code alone.

## Product stance

Nakshatra is not a matrimony marketplace, dating product, search directory, matching algorithm, astrology calculator, or PDF generator.

It is a consent-based introduction platform with two product contexts:

- **B2C:** An adult candidate creates one current marriage portfolio, shares a First View through their existing network, receives verified interest requests, and decides who receives time-limited Full View access.
- **BrokerDesk / B2B:** Organization onboarding, role-based staff access, invitations, reauthentication, and MFA foundations. This is implemented in the repository but is not part of the current B2C pilot.

The core product loop is:

```text
Private draft
  → owner previews public and Full views
  → owner publishes one link
  → anyone with the active link reads First View
  → viewer verifies email and expresses interest
  → owner reviews the request
  → owner approves or rejects
  → approved viewer receives identity-bound Full View for 7 days
  → owner may revoke access, rotate the link, unpublish, or update the portfolio
```

## B2C pilot contract

The intended pilot is narrower than the implemented product surface:

- Free, private beta.
- Portfolio creation is invite-only.
- Only an email-bound invited participant may become a portfolio owner.
- Network viewers may open a shared First View, verify their email, submit interest, and receive approved Full View access.
- A viewer/Auth account does not imply creator entitlement.
- Adult candidates only. Family assistance must not replace candidate knowledge and consent.
- Payments are disabled and must not be claimed.
- Didit identity verification is disabled and must not be claimed or required for publication.
- BrokerDesk is disabled server-side for this launch.
- Public portfolio links are bearer links and may be forwarded. Full View is the identity-bound disclosure layer.

As of this update, that contract is **not fully enforced**. See “Pilot blockers” below.

## Positioning reference

### Category

- Customer-facing: **Private marriage portfolio**
- Strategic: **Consent-based introduction platform**
- Behavior to own: **The controlled marriage introduction**

### Recommended positioning

For adults and families sharing marriage introductions through trusted personal networks, Nakshatra is a private marriage portfolio that keeps one introduction current and personal details behind approval. Unlike static files, chat attachments, generic documents, or searchable matrimony platforms, it supports a deliberate path from First View to verified interest to time-limited Full View without becoming a marketplace.

### Messaging hierarchy

1. Static biodata files become stale, fragmented, and disclose too much too early.
2. A marriage introduction should be a controlled process, not a circulating file.
3. Nakshatra provides one current portfolio and staged disclosure.
4. It represents the candidate as a person, not only as fields.
5. Families can share it through WhatsApp; recipients need no app for First View.
6. First View → verified request → approved Full View.
7. Nakshatra is not matchmaking, discovery, or a background check.
8. During the pilot, creation is invite-only while shared-network participation remains open.

Recommended primary tagline: **One introduction. On your terms.**

“Your Story. Your Data. Your Control.” is a supporting product principle, not a sufficiently specific primary category statement.

## Technology

| Layer | Current implementation |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Database | Supabase Postgres |
| Authentication | Supabase Auth: Google OAuth, password, email OTP/recovery |
| Storage | Supabase private Storage with signed URLs |
| Validation | Zod contracts |
| Styling | Tailwind CSS v4, global CSS, CSS modules |
| Image processing | `sharp`; accepted images are decoded and re-encoded |
| Icons | `lucide-react` |
| Fonts | Playfair Display, Manrope, Tenor Sans, Geist, Geist Mono loaded through `next/font` |
| Hosting workflow | Vercel-oriented manual production CD plus Docker support |
| Tests | Vitest, Testing Library, Playwright, Supabase pgTAP |

At the 2026-09-11 assessment snapshot there were 28 page routes, 44 API route files, 48 migrations, and 102 unit/E2E test files.

## Current sitemap

```text
Marketing
├── /                         Canonical landing page
├── /landing/story           Alternate hero concept
├── /landing/control         Alternate hero concept
├── /landing/family          Alternate hero concept
├── /about
├── /privacy
└── /terms

Authentication
├── /login
├── /signup
├── /reset-password
├── /api/auth/start
├── /api/auth/verify
├── /api/auth/password
└── /api/auth/callback

B2C owner
├── /dashboard
├── /edit                    Redirect to dashboard editor
├── /preview                 Owner preview of current public mode
├── /approved-preview        Owner Full View preview
└── /account                 Export, sessions, deletion

Shared portfolio
├── /p/[token]
├── /p/[token]/horoscope
└── /verify/[token]

Identity verification
├── /verification/result
├── /api/identity-verification/*
└── /api/webhooks/didit

BrokerDesk
├── /brokerdesk
├── /brokerdesk/onboarding
├── /brokerdesk/security/mfa
├── /brokerdesk/w/[workspaceRef]/customers
├── /brokerdesk/w/[workspaceRef]/customers/[relationshipRef]
├── /brokerdesk/w/[workspaceRef]/settings/team
├── /brokers                 Candidate view of broker relationships
├── /join/customer           Customer invitation acceptance
├── /join/team
├── /api/v1/brokerdesk/*
└── /api/v1/customer/*
```

## Code architecture

### App routes

`src/app` contains server pages and route handlers. Authentication checks occur in server pages and APIs, while browser interaction is delegated to client components.

### Feature modules

`src/features` is divided by domain:

- `access` — Full View grant lifecycle.
- `account` — export, session display, reauthentication, deletion.
- `auth` — password rules and portfolio bootstrap.
- `broker-relationships` — customer invitations and candidate/agency relationship access.
- `horoscope` — private attachment access.
- `identity-verification` — Didit provider/session/invitation/webhook processing.
- `interest` — viewer request creation and owner decision.
- `media` — image validation, processing, storage, signed URLs.
- `organizations` — BrokerDesk onboarding.
- `organization-access` — BrokerDesk reauth, staff roles, invitations, commands.
- `portfolio` — draft mapping, publication, snapshots, previews, sharing, renewal.
- `security` — rate limits, public references, endpoint inventory.

Server domains generally use contract → service → repository separation. Preserve this pattern.

### Data model

The database is migration-driven. Important domains include:

- Supabase Auth users and live-session enforcement.
- Portfolio ownership and candidate identity.
- Legacy `portfolios.draft_data` / `published_data` JSON compatibility.
- Normalized candidate details and visibility rules.
- Private media and horoscope attachments.
- Sanitized public portfolio snapshots.
- Approved Full View snapshots.
- Interest requests, requester verification, grants, and access events.
- Account deletion requests, leases, receipts, and retention operations.
- Identity verification sessions/invitations/webhook events.
- Organizations, memberships, role capability sets, onboarding, MFA, team invitations, customer invitations, and candidate/broker relationships.

The current model is intentionally hybrid while normalized data replaces legacy JSON. Never remove compatibility paths without an explicit migration and recovery plan.

### Portfolio data projections

Security relies on separate projections, not CSS hiding:

- Draft data is owner-only.
- Public snapshots are sanitized and resolved only by exact active share token.
- Approved snapshots contain the permitted Full View and are resolved for an authenticated, approved viewer.
- Anonymous users must not enumerate snapshots or media tables.
- Original protected media remains private; short-lived signed URLs are created only after access resolution.

### Media

- Accepted images are decoded, validated, resized, and re-encoded server-side.
- Current horoscope upload service rejects PDF/DOC/DOCX even though some legacy types remain in TypeScript shapes.
- Media visibility supports public and protected presentation.
- Protected images use separately generated blurred previews.
- Storage buckets must remain private in production.

### Account privacy

- Users can export account data.
- Deletion requires fresh authentication.
- Deletion first unpublishes and revokes access, then a background worker removes Storage, database content, and Auth identity.
- Deletion processing should run every 15 minutes; retention processing should run daily.
- The scripts exist, but production scheduling was not present in repository workflows at assessment time.

## Current B2C journeys

### Owner

```text
/signup
  → password or Google
  → OTP/callback
  → automatic portfolio bootstrap
  → /dashboard
  → full-screen nine-section editor
  → save draft
  → preview
  → publish
  → share/copy/WhatsApp
  → manage interests and Full View grants
```

The editor sections are Foundation, About you, Education & work, Family, Astrology, Lifestyle, Partner preferences, Future plans, and Privacy & contact.

### Viewer

```text
/p/[token]
  → read First View
  → Show interest near final protected section
  → name, representation, phone, email
  → email OTP
  → request submitted
  → owner decision
  → revisit same link while authenticated
  → identity-bound Full View when approved
```

No owner/requester operational notification service was present at assessment time, so both sides otherwise depend on revisiting the product.

## Portfolio renderer

There is one canonical portfolio renderer: `src/components/templates/CelestialUnion.tsx`. All persisted and legacy template IDs route to it. Do not describe the product as offering multiple selectable templates.

Current presentation:

- Light editorial appearance by default; optional dark appearance.
- Human cover with name, photograph, short introduction, and quick facts.
- Numbered story/journey/family/lifestyle/astrology/future chapters.
- Adaptive gallery with protected previews.
- Protected-information summary and interest action.
- Public, approved, and owner-preview modes.

Effective fonts are Playfair Display and Manrope. The old documentation describing a forced-dark glassmorphism template, active Harmond/Mango fonts, and rashi-driven template colors was stale.

`themeColor` and rashi-palette infrastructure currently exist but are not meaningfully wired into `CelestialUnion`. Do not add palette choice for the pilot unless it is reduced to a small contrast-tested set.

## Design system

### Current direction

- Warm neutral canvas and paper surfaces.
- Navy for primary actions.
- Teal for trust and protected/approved context.
- Gold as a restrained cultural/editorial accent.
- Editorial display type paired with highly legible functional body type.
- Generally 44–48px interactive targets.
- Responsive layouts and reduced-motion handling on major surfaces.

### Current implementation debt

- `src/app/globals.css` is approximately 4,800 lines and contains multiple product eras and override layers.
- CSS tokens, Tailwind utilities, CSS modules, inline styles, and raw hex values overlap.
- No shared `components/ui` primitive library exists.
- Button, field, notice, badge, dialog, and state treatments are duplicated.
- Spacing, type, radius, elevation, motion, layer, and control-height scales are incomplete.
- Five loaded font families and unused local font declarations are excessive.
- Indian-script font behavior is not deliberately designed; configured web-font subsets are Latin.

Pilot work should favor consistent semantics and accessible decisions over a visual rebrand.

## Quality and security baseline

Observed during the 2026-09 readiness assessment:

- Dependency audit: passed at configured threshold; zero known vulnerabilities reported.
- Typecheck: passed.
- Lint: passed with one `<img>` optimization warning in the Open Graph image route.
- Unit coverage: 523 tests across 91 files passed.
- Browser tests: 20 desktop/mobile Chromium tests passed.
- Production build: passed with placeholder public Supabase values.
- Database fixture/smoke validation: passed.
- Full local pgTAP: not run because Docker/Podman was unavailable on the assessment host.

Security strengths include sanitized public snapshots, separate approved snapshots, private media, RLS tests, exact-token public resolution, live-session binding, same-origin/body-size protections, safe redirect handling, fresh reauthentication for deletion, link rotation/unpublishing, and time-limited Full View grants.

Do not treat these local results as proof of deployed configuration. This checkout had no `.vercel/project.json`, Supabase project reference, or production environment binding.

## Pilot blockers from the assessment

1. Add a single-use, email-bound creator invitation/entitlement and enforce it in signup, OAuth callback, verification, portfolio bootstrap, dashboard, and owner APIs.
2. Ensure viewer/Auth identity can never self-elevate into creator entitlement.
3. Replace unrestricted creator CTAs with “Create with my invitation”; show a beta boundary and optional waitlist to uninvited users.
4. Disable payments, Didit, and BrokerDesk server-side and remove all related pilot claims.
5. Remove the database requirement for identity verification before first publication while the capability is disabled.
6. Add a real publication disclosure review; the current “Review and publish” action publishes directly.
7. Add a Full View confirmation showing recipient, disclosed categories, seven-day expiry, and revocation.
8. Add owner new-interest and viewer decision notifications.
9. Enforce adult candidate status from DOB and record candidate consent/representation context.
10. Preserve dashboard history when a portfolio is unpublished or expired.
11. Schedule and monitor deletion and retention workers.
12. Verify the exact production Supabase/Vercel projects, migrations, RLS, private buckets, Auth redirects, SMTP, CAPTCHA, secrets, and backups.
13. Establish an owned domain and accurate support/privacy/security contacts; the previously documented `nakshatra.app` identity was not verified as owned by this project.
14. Align privacy, terms, metadata, landing copy, README, and product UI with the pilot contract.

## UX priorities

- Keep one canonical portfolio template.
- Replace nine equal-priority editor sections with four outcome milestones while preserving culturally relevant sub-sections.
- Add autosave and direct navigation to missing required fields.
- Make the editor an accessible dialog or dedicated route.
- Provide a real public-versus-Full preview before publication.
- Add an early, restrained “Request an introduction” action on long portfolios and preserve the explanatory final CTA.
- Restore mobile section navigation.
- Combine interest and grant state into one relationship lifecycle.
- Separate Copy/WhatsApp from destructive Link settings.
- Fix the global skip-link target, lightbox focus trap/restoration, small destructive photo target, and photo description/caption model.

## Key files

| Concern | Location |
|---|---|
| Landing | `src/components/landing/LandingExperience.tsx` and module CSS |
| Auth UI | `src/components/auth/AuthForm.tsx` |
| Auth APIs | `src/app/api/auth/*` |
| Owner portfolio bootstrap | `src/features/auth/server/portfolio-bootstrap.ts` |
| Dashboard | `src/app/dashboard/dashboard-client.tsx` |
| Portfolio editor | `src/components/portfolio/BlueprintForm.tsx` |
| Public route | `src/app/p/[token]/page.tsx` |
| Portfolio renderer | `src/components/templates/CelestialUnion.tsx` |
| Interest dialog | `src/components/portfolio/InterestRequestModal.tsx` |
| Public/approved snapshots | `src/features/portfolio/server/*snapshot*` |
| Database architecture | `docs/db-architecture.md` |
| Data classification | `docs/portfolio-data-classification.md` |
| Security/privacy operations | `docs/security-phase-3.md`, `docs/security-phase-4.md` |
| Product design direction | `DESIGN.md` |
| Pilot product assessment | `docs/b2c-pilot-product-assessment.md` |

## Development commands

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run security:audit
npm run test:unit:coverage
npm run db:smoke
npm run db:verify
npm run build
npm run test:e2e
```

`db:verify` requires Docker or Podman because it starts local Supabase, resets migrations, and runs pgTAP.

## Repository rules

- Read `AGENTS.md` before work.
- For this repository, Linear operations must use `linear_phoenix`, workspace Phoenix works, project Nakshatra. Do not write Linear unless the user requests or approves it.
- Before changing Next.js application code, read the relevant current guides under `node_modules/next/dist/docs/` because this Next version contains breaking changes.
- Preserve user work and unrelated changes.
- Database migrations are additive and security-sensitive; include RLS/pgTAP coverage.
- Use purpose-based branch names from `AGENTS.md`; do not use agent/vendor prefixes.
- Do not expose service-role, Didit, database, or webhook secrets to browser code.
- Do not rely on hidden UI for authorization; enforce capability and ownership at server and database boundaries.
- Do not market a capability merely because its code exists. Launch messaging must reflect what is enabled, tested, and operationally supported.

## Documentation hygiene

When routes, database domains, launch capabilities, privacy behavior, expiry terms, fonts, or design architecture change, update this file and the relevant durable document in the same change. Historical plans must not be presented as current behavior.
