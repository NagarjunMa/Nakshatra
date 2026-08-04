# Nakshatra — Wedding Biodata Web App

## Problem Statement
Indian families create wedding biodatas in Word/Canva, save as PDF, share via WhatsApp. Updating any detail means new file, re-sharing everywhere. Old versions circulate. Formatting breaks. Mobile editing painful.

**Solution:** User fills form once, gets single shareable link. Updates reflect instantly on same URL. Editorial-quality design with cultural personalization no PDF can match.

## What This Is
- Form → Link web app for arranged-marriage biodatas
- One biodata per user account
- Public shareable link (no account needed to view)
- Culturally rooted design (rashi colors, constellation backgrounds)

## What This Is NOT
- Not a matchmaking/matrimony platform
- Not an astrology calculator
- Not an AI content generator
- Not a PDF tool (web link output)
- Not a multi-profile manager

## Tech Stack
| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Database | Supabase (Postgres + Auth + Storage) |
| Styling | Tailwind CSS v4 |
| Validation | Zod v4 schemas |
| Image Processing | `sharp` (server-side) |
| Icons | `lucide-react` (+ custom inline SVGs for unavailable icons) |
| Landing fonts | Harmond + MangoGrotesque (local `@font-face`) |
| Landing bg | `shaders` (WebGL: Swirl + ChromaFlow + FlutedGlass + FilmGrain) |
| Email | Resend (expiry reminders) |
| Hosting | Vercel / Docker |
| Auth | Google OAuth + Supabase Magic Link |

## Architecture Decisions

### Landing Page (`/`)
- Single-page composition in `src/app/page.tsx`, all sections in `src/components/landing/`
- Brand fonts loaded via `@font-face` in `globals.css` — Harmond ExtraBoldExpanded (display), MangoGrotesque Light/Regular/Medium/SemiBold (body)
- Font files copied from source dirs to `public/fonts/` for clean serving
- Palette: Noguchi Purple — `--landing-bg: #0a0b14`, `--landing-accent: #8676c4` (deep `#60519b`), `--landing-text: #e4e5ee`
- Animated WebGL bg via `shaders/react`: `Swirl` (base) + `ChromaFlow` (purple gradient) + `FlutedGlass` (refraction) + `FilmGrain` (texture)
- `.landing-root` creates new stacking context (`isolation: isolate`) so `ShaderBackground` at z-index -10 renders behind content without bleed
- Content auto-saved to `.claude/plans/witty-jumping-quasar.md` — 5-cycle iteration on copy per landing-page-guide skill
- All landing components are server components except `NewsletterForm` and `ShaderBackground` (which need client-side interactivity)
- Hero is 7/5 split grid (md+): text left, constellation glass card with corner accents right
- FAQ uses native `<details>/<summary>` — no JS dependency, smooth open via CSS `group-open:rotate-45` on chevron
- Section flow: Header → Hero → SampleShowcase → HowItWorks → Benefits → Differentiation → Testimonials → FAQ → FinalCTA → Footer
- Body has `suppressHydrationWarning` to handle Grammarly extension attribute injection
- All buttons use `.landing-btn-primary` (filled pill) or `.landing-btn-ghost` (text with animated underline)

### Templates = React Components, Not DB Data
- Templates live in `/components/templates/` as React components
- DB stores user data (`published_data` JSONB) + theme preferences
- Template receives `data` + `themeColor` + `sunSign` props, renders everything
- Template registry in `components/templates/index.ts` — `getTemplate(templateId)` returns component
- Adding new templates = new component file + entry in registry + `templates.json`

### CelestialUnion Template (v1)
- Dark midnight background (`#0a0a1a`), forced dark mode (ignores system theme)
- Glassmorphism cards: `bg-white/[0.04] backdrop-blur-md border-white/10`
- Editorial typography with Geist Sans, narrow measure (`max-w-xl`)
- Constellation SVG backgrounds at 5% opacity
- Theme color drives: photo ring glow, section icons, rashi subtitle, dividers
- Print CSS overrides dark → white, removes blur + constellations

### Draft/Published Dual-State
- `draft_data` JSONB — auto-saved on every form change (debounced 1s)
- `published_data` JSONB — copied from draft on explicit "Create"/"Update" click
- Public link always reads `published_data`
- Enables safe editing without affecting live link

### Share Token Architecture
- 8-char nanoid, generated once on first publish
- Never changes on updates — same link forever
- Separate from `id` to allow future link rotation

### Auth Architecture
- Proxy refreshes Supabase session on every request
- Server pages use `getAuthenticatedUser()` from `@/lib/auth` — returns `{ supabase, user }` or redirects
- API routes use `getApiUser()` — returns `{ supabase, user }` or nulls (no redirect)
- Client components use `isAuthError()` from `@/lib/auth-utils` — detects JWT expiry → redirect
- RLS enforces row-level access at DB layer (defense in depth)
- Env validation via `@/lib/env` — Zod schema, fails fast if vars missing
- Env var: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not anon key)

### Image Pipeline
- User uploads up to 10MB (any format including HEIC)
- Server processes with `sharp`: 800px main + 200px thumbnail → WebP 85%
- Both stored in Supabase Storage: `{user_id}/photo.webp`, `{user_id}/thumb.webp`
- Storage RLS: authenticated upload/update/delete own folder, public read

### Form UX
- Multi-step wizard with progress bar (9 steps)
- Mobile-first responsive design
- Mobile step label: "Step 3 of 9: Astrology" (visible on small screens)
- Auto-save per step (debounced 1s) with error feedback
- Zod validation before publish with inline errors per field
- Publish double-click guard (ref-based)
- Step navigation via clickable progress indicators
- Error badges on steps with validation issues

### Public Link Features
- Dynamic OG meta tags (name, photo thumbnail, rashi) for WhatsApp previews
- `noindex` robots meta — biodatas should not be Google-indexed
- 90-day expiry with renewal option (confirmation dialog)
- View count tracking (rate-limited: 1 per hour via DB function)
- Expired link shows friendly message

## Database Schema

```sql
portfolios (
  id uuid PK, user_id uuid UNIQUE FK→auth.users,
  share_token text UNIQUE,
  draft_data jsonb, published_data jsonb,
  template_id int DEFAULT 1, theme_color text, sun_sign text,
  is_published boolean DEFAULT false,
  published_at timestamptz, expires_at timestamptz, last_renewed_at timestamptz,
  created_at timestamptz, updated_at timestamptz (auto-trigger)
)

portfolio_views (
  id uuid PK, portfolio_id uuid FK→portfolios, viewed_at timestamptz
)

-- Functions
record_view(p_portfolio_id) — rate-limited insert (1/hour, security definer)
update_updated_at() — trigger on portfolios
```

**RLS Policies:**
- Owner: full CRUD on own row
- Anon: SELECT published_data only when is_published=true AND not expired
- Anon: INSERT into portfolio_views (tracking)
- Owner: SELECT own portfolio_views
- Storage: authenticated upload/update/delete own photos, public read

**Indexes:** `share_token` (partial, WHERE NOT NULL), `portfolio_id` on views

**Migrations:** 3 applied via Supabase MCP
1. `001_initial_schema` — tables, RLS, indexes, trigger
2. `002_storage_policies` — photos bucket RLS
3. `003_rate_limit_views` — `record_view()` function

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/callback/route.ts   # OAuth + magic link callback
│   │   └── upload/route.ts          # Photo upload (sharp processing)
│   ├── dashboard/                    # Status, link, views, expiry
│   ├── edit/                         # Redirect to the canonical dashboard editor
│   ├── login/                        # Google OAuth + magic link
│   ├── signup/                       # Same auth, different copy
│   ├── p/[token]/                    # Public biodata view
│   ├── preview/                      # Owner preview of draft
│   ├── error.tsx                     # Error boundary
│   ├── not-found.tsx                 # 404 page
│   ├── globals.css                   # CSS variables + Tailwind + print
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing page
├── components/
│   ├── landing/                      # Landing page sections (all server except 2 client)
│   │   ├── Header.tsx
│   │   ├── Hero.tsx                  # 7/5 split, constellation card
│   │   ├── SampleShowcase.tsx        # Phone-frame mockup
│   │   ├── HowItWorks.tsx            # 4-step workflow
│   │   ├── Benefits.tsx              # 6 glass cards
│   │   ├── Differentiation.tsx
│   │   ├── Testimonials.tsx          # 6 quotes
│   │   ├── FAQ.tsx                   # native details accordion
│   │   ├── FinalCTA.tsx
│   │   ├── Footer.tsx
│   │   ├── NewsletterForm.tsx        # "use client" — extracted form
│   │   └── ShaderBackground.tsx      # "use client" — WebGL shader
│   └── templates/
│       ├── CelestialUnion.tsx        # v1 template (dark, glassmorphism)
│       └── index.ts                  # Template registry + getTemplate()
├── config/
│   ├── rashi_colors.json             # 12 rashi × 2 palettes
│   └── templates.json                # Template metadata
├── lib/
│   ├── auth.ts                       # getAuthenticatedUser(), getApiUser()
│   ├── auth-utils.ts                 # isAuthError() (client-safe)
│   ├── env.ts                        # Environment validation (Zod)
│   └── supabase/
│       ├── client.ts                 # Browser client
│       ├── server.ts                 # Server client (cookies)
│       └── proxy.ts                  # Session refresh + route guards
├── proxy.ts                           # Next.js request proxy entry
└── types/
    └── portfolio.ts                  # Zod schemas, types, form config

public/
├── constellations/                   # 12 rashi SVGs (currentColor)
├── fonts/                            # Harmond + MangoGrotesque files
├── pictures/                         # constellations.jpg (hero), background.jpg
└── landing/                          # bg-cosmic.jpg (legacy CSS bg, unused)

supabase/
└── migrations/                       # 3 SQL migration files
```

## Routes
| Route | Auth | Purpose |
|---|---|---|
| `/` | No | Landing page |
| `/login` | No | Google OAuth + Magic link sign-in |
| `/signup` | No | New account |
| `/dashboard` | Yes | Biodata status, link, views, expiry |
| `/edit` | Yes | Compatibility redirect to the canonical dashboard editor |
| `/preview` | Yes | Owner preview before publish |
| `/p/[token]` | No | Public biodata view (CelestialUnion template) |
| `/api/auth/callback` | No | OAuth/magic link callback |
| `/api/upload` | Yes | Photo upload (sharp → Supabase Storage) |

## Landing Page Do's
- Use `var(--font-harmond)` for display type, `var(--font-mango)` for body
- Use `var(--landing-accent)` for emphasized text + CTAs
- Use `.landing-glass` utility for glassmorphism surfaces
- Section pattern: `landing-section-title` (eyebrow) → display heading → body → content
- Keep components server unless interactivity needed (form state, WebGL canvas)
- For new sections: heading anchor IDs match `Header` nav links (`#sample`, `#faq`, etc.)
- All section copy must tie to a real app feature (form, link, rashi, expiry, etc.)

## Landing Page Don'ts
- Don't use Inter/Roboto/Arial — fonts are Harmond + MangoGrotesque
- Don't paint over the shader bg with opaque overlays (defeats the effect)
- Don't add bg images to `.landing-root` — shader is the canvas
- Don't write Stitch placeholder copy ("Elevate Your Story Using Stellar Design") — locked content in `.claude/plans/witty-jumping-quasar.md`
- Don't put event handlers (onSubmit, onChange) in server components — extract to client

## Do's
- Mobile-first design for all pages (primary users are on phones)
- Validate all data with Zod before writing to DB or publishing
- Use `getAuthenticatedUser()` in server pages, `getApiUser()` in API routes
- Use `isAuthError()` from `@/lib/auth-utils` in client components
- Handle auth errors on client-side DB calls (JWT expiry → redirect)
- Use CSS variables for theme colors (driven by rashi selection)
- Use `currentColor` for constellation SVGs (inherits theme)
- Generate OG meta tags dynamically on `/p/[token]`
- Test in WhatsApp in-app browser
- Use Supabase RLS for all data access
- Auto-save form progress with debounce
- Show clear loading/error states (Indian mobile networks are flaky)
- Use semantic HTML for accessibility
- Keep bundle size small (affects mobile load time)
- Use `data-` attributes for print CSS targeting

## Don'ts
- Don't compute astrology — user enters rashi/nakshatra manually
- Don't add AI features before basic form works
- Don't build multiple templates before first one is excellent
- Don't add payments before users want to pay
- Don't build PDF export in v1
- Don't add privacy gating in v1
- Don't index public pages (add noindex)
- Don't store raw uploaded images — always process through sharp
- Don't use client-side image processing — server-side only for consistency
- Don't hardcode colors in templates — always use CSS variables
- Don't skip Zod validation even for "trusted" internal data
- Don't call Supabase DB from client without error handling
- Don't import `@/lib/auth` in client components (use `@/lib/auth-utils` instead)

## Form Steps (Multi-step Wizard)
1. **Personal** — name, photo upload, DOB, place of birth, gender
2. **Vitals** — height, complexion, gotra
3. **Astrology** — rashi, nakshatra, time of birth
4. **Education** — degree, institution, year
5. **Career** — title, company
6. **Family** — father, mother, siblings (name + occupation each, max 10)
7. **Lifestyle** — hobbies, languages, diet, smoking, and drinking preferences
8. **Contact** — contact person, phone, email
9. **Style** — theme color (suggested by rashi), constellation preview

## Color Personalization
- Colors tied to rashi (Vedic moon sign), not Western zodiac
- Config in `/config/rashi_colors.json`
- Each rashi has 2+ curated palettes
- User sees "Suggested for [Rashi]" palettes + "More colors" option
- Sources: Brihat Parashara Hora Shastra, Phaladeepika (verify before launch)

## Common Commands
```bash
# Dev
make dev                       # Start dev server (port 3000)
make build                     # Production build
make check                     # Lint + typecheck
make clean                     # Remove build artifacts

# Docker
make docker-build              # Build Docker image
make docker-run                # Run container on :3000
make docker-stop               # Stop container

# Direct
npm run dev                    # Start dev server
npm run build                  # Production build
npm run lint                   # Lint check
npx tsc --noEmit               # TypeScript check only

# Database (via Supabase MCP)
# mcp__supabase__apply_migration
# mcp__supabase__list_tables
# mcp__supabase__execute_sql

# Deploy
vercel --prod                  # Production deploy
```
