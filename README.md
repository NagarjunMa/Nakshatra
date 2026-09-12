# Nakshatra

Nakshatra is a consent-based introduction platform for adult candidates and families. It replaces scattered wedding biodata PDFs, photographs, horoscope files, and WhatsApp context with one current marriage portfolio and a controlled path from First View to verified interest to approved Full View.

**Nakshatra is not a matrimony site.** It does not provide public profile search, match recommendations, compatibility ranking, or marketplace discovery.

For the current repository map, product journeys, architecture, design system, security baseline, and launch constraints, read [CLAUDE.md](CLAUDE.md). The full B2C review is in [docs/b2c-pilot-product-assessment.md](docs/b2c-pilot-product-assessment.md).

## B2C pilot contract

- Free, invite-only private beta for portfolio creators.
- Every pilot creator must complete Didit identity verification before first publication.
- Anyone with an active shared link may read its First View without creator access.
- A viewer may verify their email and express interest.
- The owner approves or rejects each request.
- An approved viewer receives identity-bound Full View access for seven days; the owner may revoke it earlier.
- Public portfolio links are active for 30 days by default and may be unpublished or replaced earlier.
- Payments and BrokerDesk are not part of the B2C pilot.
- Future paid-plan durations under consideration are 3, 4, 6, and 12 months. They are not implemented or available during the pilot.

Creator entitlement must remain separate from viewer authentication. Receiving or viewing a portfolio must never grant the right to create one.

## Core journey

```text
Private draft
  → preview First View and Full View
  → complete Didit identity verification
  → publish one 30-day link
  → share through the existing family network
  → viewer reads First View
  → viewer verifies email and expresses interest
  → owner approves or rejects
  → approved viewer receives Full View for 7 days
  → owner can revoke access, rotate the link, unpublish, or update
```

Visible First View information can still be saved or forwarded by a recipient. Nakshatra controls access to protected information; it cannot recall information somebody has already viewed.

## Technology

| Layer | Implementation |
|---|---|
| Application | Next.js 16 App Router, React 19, TypeScript |
| Database | Supabase Postgres with migration-driven schema and RLS |
| Authentication | Supabase Auth: Google OAuth, password, email OTP/recovery |
| Files | Private Supabase Storage with access-scoped signed URLs |
| Validation | Zod contracts |
| Styling | Tailwind CSS v4, global styles, and CSS modules |
| Media processing | `sharp` decode, validation, resize, and re-encode |
| Tests | Vitest, Testing Library, Playwright, and Supabase pgTAP |
| Deployment | Vercel-oriented manual production workflow plus Docker support |

## Architecture

The product separates data by disclosure purpose rather than hiding private fields in the browser:

- Draft data is owner-only.
- Public snapshots are sanitized and resolved only through an exact active share token.
- Approved snapshots contain the permitted Full View and require an authenticated approved viewer.
- Original protected media remains private; short-lived URLs are issued only after access resolution.
- Interest requests, access grants, revocation, link rotation, account export, and staged deletion have separate server/database controls.

The repository also contains BrokerDesk/B2B foundations. They are a separate product context and must be disabled for the B2C pilot.

## Important routes

| Route | Purpose |
|---|---|
| `/` | Pilot-aware marketing page |
| `/signup` | Invited pilot creator account entry |
| `/login` | Existing participant sign-in |
| `/dashboard` | Portfolio editor, publication, sharing, and interest management |
| `/preview` | Owner First View preview |
| `/approved-preview` | Owner Full View preview |
| `/p/[token]` | Shared First View or approved Full View |
| `/verify/[token]` | Viewer interest email verification |
| `/verification/result` | Creator identity-verification result |
| `/account` | Export, session, and deletion controls |
| `/privacy`, `/terms`, `/about` | Product and legal information |

See [CLAUDE.md](CLAUDE.md) for the full sitemap and domain-module map.

## Local setup

Requirements: Node.js 20+, npm, and a Supabase project for provider-backed flows.

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Configure only the variables documented in `.env.local.example`. Keep service-role, database, Didit, and webhook secrets out of browser-visible `NEXT_PUBLIC_` variables.

Before changing Next.js application code, read the relevant installed documentation under `node_modules/next/dist/docs/`; this repository uses a version with breaking changes from older Next.js conventions.

## Verification commands

```bash
npm run security:audit
npm run lint
npm run typecheck
npm run test:unit:coverage
npm run db:smoke
npm run db:verify
npm run build
npm run test:e2e
```

`db:verify` requires Docker or Podman because it starts local Supabase, resets all migrations, and runs the pgTAP security suite.

## Pilot launch status

Pilot-facing landing and signup copy now describe the free invite-only beta, mandatory Didit verification, 30-day public links, seven-day Full View, and open viewer-interest workflow.

This messaging update does **not** by itself make the pilot launch-ready. Remaining gates include creator-entitlement enforcement, viewer/creator privilege separation, BrokerDesk/payment gating, real-provider Didit rehearsal, disclosure confirmations, notifications, privacy-worker scheduling, exact production-environment verification, backup/restore testing, legal/contact accuracy, and real-device WhatsApp/email testing. Track the complete evidence and priorities in [docs/b2c-pilot-product-assessment.md](docs/b2c-pilot-product-assessment.md).

## License

Private — not open source.
