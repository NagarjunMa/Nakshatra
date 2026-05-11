# Nakshatra — Build Progress

## Status: In Development
**Started:** 2026-05-08
**Current Phase:** Week 5 in progress — Landing page complete, deployment + OAuth provider next

---

## Week 1: Foundation — DONE
- [x] Initialize Next.js 15 project with TypeScript + Tailwind
- [x] Set up Supabase project (remote via MCP)
- [x] Write DB schema + RLS policies (SQL migration)
- [x] Apply migration to remote Supabase (`initial_schema`)
- [x] Create `photos` storage bucket (public)
- [x] Set up Supabase client + auth helpers (client, server, middleware)
- [x] Google OAuth + Magic link auth (`/login`, `/signup`)
- [x] Auth callback with auto portfolio row creation
- [x] Middleware session refresh + route protection
- [x] Shared `getAuthenticatedUser()` helper for server pages
- [x] Client-side JWT expiry detection → redirect to login
- [x] Public route `/p/[token]` with dynamic data rendering
- [x] OG meta tags on `/p/[token]` (dynamic: name, photo, rashi)
- [x] `noindex` robots meta on public pages
- [x] Expired link page on `/p/[token]`
- [x] View count tracking (rate-limited, 1/hour via DB function)
- [ ] Deploy to Vercel

## Week 2: Form + Drafts + Photo — DONE
- [x] Multi-step wizard form on `/edit` with progress bar (9 steps)
- [x] All 9 form sections with Zod validation schemas
- [x] Auto-save to `draft_data` (debounced 1s)
- [x] Publish flow: Create (generate token + 90d expiry) / Update (same token)
- [x] `/preview` route renders draft data
- [x] `/dashboard` — biodata status, link, view count, expiry, renew
- [x] Copy-link button, WhatsApp share button
- [x] `rashi_colors.json` — 12 rashi palettes (2 each)
- [x] Style step — rashi-suggested palettes + custom color picker
- [x] Auth error handling on all client DB calls
- [x] `/api/upload` route with sharp processing pipeline (800px + 200px thumb → WebP)
- [x] Photo upload UI in Personal step (upload, preview, remove)
- [x] 12 constellation SVGs sourced and created
- [x] Mobile step label ("Step 3 of 9: Astrology")

## Week 3: Hardening — DONE
- [x] Zod schema hardened (email union, max lengths, date/time regex, phone pattern, rashi validation, siblings cap 10)
- [x] Environment validation (`lib/env.ts` with Zod)
- [x] `isAuthError()` shared helper (`lib/auth-utils.ts`)
- [x] Auth callback error handling (try-catch + logging)
- [x] Inline validation errors (no more alert(), step navigation on error, red error badges)
- [x] Publish double-click guard (ref-based)
- [x] Dashboard grid responsive (1-col mobile → 3-col desktop)
- [x] Renew confirmation dialog
- [x] Save error feedback (non-auth errors shown)
- [x] Storage bucket RLS policies (authenticated upload/update/delete, public read)
- [x] View rate limiting via `record_view()` DB function (1/hour)
- [x] `not-found.tsx` + `error.tsx` error boundaries
- [x] Loading skeletons (dashboard, edit, preview)
- [x] Login/signup redirect param preservation (`?redirect=` → `?next=`)

## Week 4: Template — DONE
- [x] `CelestialUnion.tsx` — dark midnight, glassmorphism cards, editorial typography
- [x] Template registry (`getTemplate()` in `components/templates/index.ts`)
- [x] Public view + preview wired to template component
- [x] Constellation SVG background (5% opacity, dual placement)
- [x] CSS variable theming (`--theme-color` drives accents)
- [x] Print CSS (white override, hide constellations, A4 setup)
- [x] Dockerfile (multi-stage, standalone, non-root)
- [x] Makefile (dev, build, check, docker-build, docker-run)
- [x] `.dockerignore`
- [x] `next.config.ts` — standalone output enabled

## Week 5: Landing Page — DONE
- [x] Content generation through 5 iteration cycles using `landing-page-guide` skill
- [x] Final content spec locked in `.claude/plans/witty-jumping-quasar.md`
- [x] Custom fonts: Harmond ExtraBoldExpanded + MangoGrotesque (Light/Regular/Medium/SemiBold)
- [x] Font files copied to `public/fonts/` and registered via `@font-face`
- [x] Noguchi Purple palette CSS variables (`--landing-accent`, `--landing-text`, etc.)
- [x] `Header` — sticky glassmorphism with wordmark + nav
- [x] `Hero` — 7/5 split, accent-color wordmark, constellation glass card with corner accents
- [x] `SampleShowcase` — phone mockup rendering sample biodata in CelestialUnion preview
- [x] `HowItWorks` — 4-step workflow with icons (Sign in → Fill → Publish → Share/Update)
- [x] `Benefits` — 6 glass cards tied to actual features
- [x] `Differentiation` — "What Nakshatra isn't" 4-row clarification
- [x] `Testimonials` — 6 quote cards (cities + parent + diaspora)
- [x] `FAQ` — 10-question accordion via native `<details>`
- [x] `FinalCTA` — full-width with glow halo
- [x] `Footer` — multi-column + newsletter (extracted client form) + social
- [x] WebGL shader background via `shaders` pkg (Swirl + ChromaFlow + FlutedGlass + FilmGrain)
- [x] `landing-root` isolation stacking context for shader z-index
- [x] `suppressHydrationWarning` on body (Grammarly extension attrs)
- [x] Custom inline SVG icons for Instagram/X (lucide-react v1.14 missing them)
- [x] Lucide icons used: Sparkles, ArrowRight, Star, Quote, BookOpen, GraduationCap, Briefcase, Users, Link2, Compass, MessageCircle, Smartphone, Lock, Plus, LogIn, FileEdit, Send, RefreshCw
- [x] SEO metadata in page.tsx (title, description, keywords, OG tags)
- [x] All sections compile, typecheck clean, build successful

## Week 5: Launch — TODO
- [ ] Deploy to Vercel
- [ ] Enable Google OAuth in Supabase dashboard
- [ ] Configure Google Cloud Console (OAuth client ID + secret)
- [ ] Mobile responsive QA (real device + WhatsApp browser)
- [ ] End-to-end flow test (signup → form → publish → share → view)
- [ ] Reminder email cron via Resend (day 83)
- [ ] Get 10-20 real users
- [ ] Fix top friction points from feedback

## Week 6: Iterate
- [ ] Address user feedback
- [ ] Performance optimization
- [ ] Edge case fixes

---

## Decisions Log
| Date | Decision | Reason |
|---|---|---|
| 2026-05-08 | 90-day expiry (was 30) | Arranged marriage timelines are longer |
| 2026-05-08 | Google OAuth + magic link | Reduce auth friction on mobile |
| 2026-05-08 | Multi-step wizard form | 9 sections too overwhelming as single form |
| 2026-05-08 | Zod validation before publish | JSONB has no schema validation at DB level |
| 2026-05-08 | Dynamic OG meta on /p/[token] | WhatsApp link preview is primary sharing channel |
| 2026-05-08 | noindex on public pages | Biodatas shouldn't be Google-indexed |
| 2026-05-08 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase MCP uses publishable key naming |
| 2026-05-08 | Shared `getAuthenticatedUser()` | DRY auth pattern across server pages |
| 2026-05-08 | Client JWT expiry detection | Silent save failures unacceptable for UX |
| 2026-05-10 | Single-column template layout | WhatsApp mobile browser is primary viewport |
| 2026-05-10 | Template forces dark mode | Glassmorphism only works on dark backgrounds |
| 2026-05-10 | `max-w-xl` (576px) for template | Narrower measure = editorial breathing room |
| 2026-05-10 | `isAuthError()` in separate file | Client components can't import server-only auth.ts |
| 2026-05-10 | Docker standalone output | Required for multi-stage Dockerfile |
| 2026-05-10 | View rate limit via DB function | Prevent reload spam, `security definer` bypasses RLS |
| 2026-05-10 | Custom fonts via `@font-face` (not `next/font/local`) | Files already in `public/`, simpler to serve directly |
| 2026-05-10 | Noguchi Purple palette (`#60519b`/`#bfc0d1`) | User-supplied brand palette, replaces Stitch default lavender |
| 2026-05-10 | Hero NAKSHATRA wordmark in accent color | Matches Stitch reference + brand hierarchy |
| 2026-05-10 | Hero subtitle font-size 28→52px | Editorial weight, prominent over body paragraph |
| 2026-05-10 | Drop `FormPreview` section | Duplicates HowItWorks step 2, leaner page |
| 2026-05-10 | Native `<details>` for FAQ | Zero JS dep, accessible, animated via CSS only |
| 2026-05-10 | WebGL shader bg via `shaders` pkg | Distinctive landing bg, replaces static CSS gradient |
| 2026-05-10 | `landing-root` isolation: isolate | Required for shader z-index -10 to render behind content within new stacking context |
| 2026-05-10 | `NewsletterForm` extracted to client | Server components can't have `onSubmit` handlers |
| 2026-05-10 | `suppressHydrationWarning` on body | Grammarly browser extension injects attrs post-load |
| 2026-05-10 | Custom inline SVGs for Instagram + X | lucide-react v1.14 doesn't export these names |

## Blockers
_None currently_

## Notes
- Supabase MCP connected — 3 migrations applied (initial_schema, storage_policies, rate_limit_views)
- Constellation SVGs hand-crafted (12 files, `currentColor` for theme inheritance)
- Rashi color associations need verification against Vedic texts before launch
- Google OAuth provider needs enabling in Supabase dashboard
- Photo upload processes to 800px main + 200px thumb (not 2400px as originally spec'd — adjusted for mobile-first)
- Landing fonts: Harmond OTF (display) + MangoGrotesque TTF (body) in `public/fonts/`
- `shaders` pkg installed at v2.5.117; npm engine warning (Node 20.12 < required 20.19) is non-blocking
- Landing page content sourced from `.claude/plans/witty-jumping-quasar.md` — 5 iteration cycles documented there
- Stitch project ID `10282294610778875480` used as design reference (split-hero + cosmic bg screens)
- Background image options explored: cosmic nebula (`public/landing/bg-cosmic.jpg`), galactic core (`public/pictures/background.jpg`) — final shipped version uses pure shader bg, no image
- Hero structure inspired by Stitch screen `ceb6718dad224d44bb922197c64d36f5` (Split Hero Landing Page)
