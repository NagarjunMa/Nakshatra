# Nakshatra — Wedding Biodata Web App

Beautiful, shareable wedding biodatas on a single link that always stays updated. Built for Indian arranged marriages and WhatsApp distribution.

## The Problem

Indian families create wedding biodatas in Word or Canva, save as PDF, and forward over WhatsApp. Updating any detail means a new file and re-sharing everywhere. Old versions stay in circulation. Formatting breaks. Mobile editing is painful.

## The Solution

Fill a form once. Get a shareable link. Update anytime — the link always shows the latest version. Editorial-quality design with cultural personalization no PDF can match.

## Features

- **Form → link** — one shareable URL, never changes on updates
- **Multi-step wizard** — 9 categorized sections with progress bar
- **Rashi-rooted design** — theme colors and constellation backgrounds from Vedic moon sign
- **WhatsApp-optimized** — dynamic OG meta tags for rich link previews
- **Mobile-first** — designed for phone-first creation and viewing
- **Auto-save** — debounced saves every second, no progress lost
- **90-day link expiry** — renewable from dashboard, one click
- **Photo pipeline** — server-side sharp processing → WebP main + thumbnail
- **Editorial template** — CelestialUnion with glassmorphism, constellation backdrop
- **Print-ready** — A4 portrait with CSS overrides
- **Private by default** — `noindex` robots meta, RLS-enforced data access
- **Shader-driven landing page** — animated WebGL background, custom typography

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Database | Supabase (Postgres + Auth + Storage) |
| Styling | Tailwind CSS v4 |
| Validation | Zod v4 |
| Image Processing | sharp (server-side) |
| Icons | lucide-react |
| Auth | Google OAuth + Supabase Magic Link |
| Landing fonts | Harmond ExtraBoldExpanded, MangoGrotesque (Light/Regular/Medium/SemiBold) |
| Landing bg | `shaders` (Swirl + ChromaFlow + FlutedGlass + FilmGrain) |
| Email | Resend (expiry reminders) |
| Hosting | Vercel / Docker |

## Getting Started

### Prerequisites

- Node.js 20+ (20.19+ recommended for `shaders` pkg)
- npm
- Supabase project (database, auth, storage)

### Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd nakshatra
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

4. Apply database migrations (already applied via Supabase MCP):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_policies.sql`
   - `supabase/migrations/003_rate_limit_views.sql`
   - `supabase/migrations/004_b2c_b2b2c_architecture.sql`

5. Enable Google OAuth in Supabase dashboard:
   Authentication → Providers → Google → Add Client ID + Secret.

6. Create `photos` storage bucket in Supabase (Public).

7. Start dev server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/` | No | Landing page (shader bg, hero, sample, how-it-works, FAQ) |
| `/login` | No | Google OAuth + Magic link |
| `/signup` | No | New account |
| `/dashboard` | Yes | Status, link, views, expiry |
| `/edit` | Yes | Multi-step wizard form |
| `/preview` | Yes | Draft preview |
| `/p/[token]` | No | Public biodata view (CelestialUnion template) |
| `/api/auth/callback` | No | OAuth/magic link callback |
| `/api/upload` | Yes | Photo upload (sharp → Supabase Storage) |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/callback/route.ts    # OAuth + magic link callback
│   │   └── upload/route.ts           # Photo upload (sharp processing)
│   ├── dashboard/                     # Status, link, views, expiry
│   ├── edit/                          # Multi-step wizard form
│   ├── login/                         # Auth entry
│   ├── signup/                        # Same auth, different copy
│   ├── p/[token]/                     # Public biodata view
│   ├── preview/                       # Owner draft preview
│   ├── error.tsx                      # Error boundary
│   ├── not-found.tsx                  # 404 page
│   ├── globals.css                    # Tailwind + landing fonts + palette
│   ├── layout.tsx                     # Root layout
│   └── page.tsx                       # Landing page composition
├── components/
│   ├── landing/
│   │   ├── Header.tsx                 # Sticky nav (Sample, FAQ, Login)
│   │   ├── Hero.tsx                   # Title + constellation card split
│   │   ├── SampleShowcase.tsx         # Phone mockup w/ sample biodata
│   │   ├── HowItWorks.tsx             # 4-step workflow
│   │   ├── Benefits.tsx               # 6 glass cards
│   │   ├── Differentiation.tsx        # "What Nakshatra isn't"
│   │   ├── Testimonials.tsx           # 6 quote cards
│   │   ├── FAQ.tsx                    # 10-question accordion
│   │   ├── FinalCTA.tsx               # Bottom conversion
│   │   ├── Footer.tsx                 # Multi-column + newsletter
│   │   ├── NewsletterForm.tsx         # Client form (extracted)
│   │   └── ShaderBackground.tsx       # WebGL animated bg
│   └── templates/
│       ├── CelestialUnion.tsx         # v1 template (dark, glassmorphism)
│       └── index.ts                   # Template registry
├── config/
│   ├── rashi_colors.json              # 12 rashi × 2 palettes
│   └── templates.json                 # Template metadata
├── lib/
│   ├── auth.ts                        # getAuthenticatedUser, getApiUser
│   ├── auth-utils.ts                  # isAuthError (client-safe)
│   ├── env.ts                         # Env validation (Zod)
│   └── supabase/{client,server,proxy}.ts
├── proxy.ts                            # Next.js request proxy entry
└── types/
    └── portfolio.ts                   # Zod schemas, types, form config

public/
├── fonts/                              # Harmond + MangoGrotesque @font-face
├── constellations/                     # 12 rashi SVGs (currentColor)
├── pictures/                           # background.jpg + constellations.jpg
└── landing/                            # bg-cosmic.jpg (legacy, unused)

supabase/
└── migrations/                         # SQL migration files
```

## Architecture Notes

- `docs/db-architecture.md` explains the new B2C/B2B2C database foundation:
  candidates, organizations, tracked portfolio links, interest requests,
  controlled reveal, attribution records, verification services, compatibility
  reports, and marketplace lead claims.
- The architecture is additive. The current app still works through the
  existing `portfolios` flow while future development can migrate toward the
  richer candidate and portfolio-link model.

## Scripts

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit         # Type-check only

# Make targets
make dev                 # Start dev server
make build               # Production build
make check               # Lint + typecheck
make clean               # Remove build artifacts

# Docker
make docker-build        # Build Docker image
make docker-run          # Run container on :3000
make docker-stop         # Stop + remove container

# Deploy
vercel --prod            # Production deploy
```

## Landing Page

The landing page (`/`) is a single scrolling experience built on a custom design system.

### Aesthetic direction
- **Editorial + Celestial** — dark midnight canvas, custom Harmond display type, animated shader background
- **Palette:** Noguchi Purple — `#0a0b14` deep base, `#60519b` accent, `#8676c4` highlight, `#e4e5ee` text
- **Typography:**
  - **Harmond ExtraBoldExpanded** — hero wordmark, section headings
  - **MangoGrotesque (Light/Regular/Medium/SemiBold)** — body, labels, buttons
- **Background:** WebGL shader via `shaders/react` — `Swirl` base + `ChromaFlow` purple gradient + `FlutedGlass` refraction + `FilmGrain` texture

### Section flow
1. **Header** — sticky, glassmorphism, wordmark + Sample/FAQ/Login
2. **Hero** — 7/5 split: chip, "Nakshatra" wordmark in accent, "Your wedding biodata, on one link forever" subtitle, CTAs, trust line / constellation card with corner accents
3. **SampleShowcase** — phone mockup rendering a real biodata in CelestialUnion template
4. **HowItWorks** — 4 steps (Sign in → Fill form → Publish → Share/Update) with icons
5. **Benefits** — 6 glass cards (one link forever, rashi palette, WhatsApp, editorial typography, mobile-first, private/expiry)
6. **Differentiation** — "What Nakshatra isn't" (not matrimony, not astrology, not PDF, not sold)
7. **Testimonials** — 6 quote cards across cities + parent + diaspora
8. **FAQ** — 10-question accordion via native `<details>`
9. **FinalCTA** — "Your biodata, on one link." with dramatic glow
10. **Footer** — multi-column + newsletter (extracted client form) + social

Content generated through 5 evaluation cycles using `landing-page-guide` skill (11 essential elements + design quality). Final spec locked in `.claude/plans/witty-jumping-quasar.md`.

## Current Status

**Week 5 — Launch prep**

Done:
- Full backend (auth, form, publish, expiry, views)
- CelestialUnion template + print CSS
- Photo pipeline (sharp → WebP)
- Docker + Makefile
- Landing page (content + design + shader bg)

Remaining:
- Vercel deploy
- Enable Google OAuth provider in Supabase dashboard
- Mobile responsive QA (real device + WhatsApp browser)
- Reminder email cron via Resend (day 83)
- First real users (10–20 families)

## License

Private — not open source.
