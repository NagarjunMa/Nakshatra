# Implementation Plan — Nakshatra v1

## Context
Building MVP for wedding biodata web app. User fills categorized form, gets shareable link that always shows latest version. Primary distribution: WhatsApp. Primary device: mobile phones. Cultural personalization via Vedic rashi colors + constellation backgrounds.

## Updated Requirements (from analysis)
1. **OG meta tags** on `/p/[token]` — name, photo thumbnail, rashi description for WhatsApp previews
2. **Google OAuth** alongside magic link — reduce mobile auth friction
3. **Multi-step wizard** with progress bar — 9 sections, one per step
4. **Zod schemas** for draft/published data validation
5. **noindex meta** on public pages
6. **Photo crop UI** for face positioning
7. **90-day expiry** (was 30) — arranged marriage timelines are longer
8. **HEIC verification** on Vercel early in week 2

## Architecture

### Stack
Next.js 15 (App Router, TS) + Supabase + Tailwind + sharp + Vercel + Resend

### Data Model
- `portfolios` table: one row per user, JSONB for draft/published data
- `portfolio_views` table: anonymous view tracking
- RLS policies: anon reads published only when published + not expired

### Template System
- React components in `/components/templates/`
- Receive `data` + `theme` props
- CSS variables for theme colors
- `currentColor` SVG constellation inheritance

## Build Sequence

### Week 1: Foundation
- Next.js scaffold + Tailwind + Supabase client
- DB schema + RLS (SQL migration)
- Google OAuth + magic link auth
- `/p/[token]` with test data + OG meta + noindex
- Vercel deploy

### Week 2: Form + Photo
- Multi-step wizard on `/edit` with progress bar
- 9 form sections with Zod schemas
- Auto-save debounced 1s
- `/api/upload` with sharp pipeline
- Photo crop/position UI
- HEIC verification on Vercel
- Source constellation SVGs

### Week 3: Publish + Dashboard
- Create/Update flow with share_token (nanoid 8-char)
- `/dashboard` — status, link, views, expiry
- Copy-link + WhatsApp share buttons
- `rashi_colors.json` (verified against Vedic sources)
- Style step in wizard

### Week 4: Template
- Stitch HTML → `CelestialUnion.tsx` component
- CSS variable theming
- Constellation SVG wiring
- Mobile + WhatsApp browser QA
- Print CSS

### Week 5: Lifecycle + Launch
- Expiry page, renewal flow, reminder emails
- View tracking
- 10-20 real users
- Fix friction points

### Week 6: Iterate on feedback

## Key Trade-offs Accepted
| Trade-off | Accepted Risk |
|---|---|
| JSONB (no DB-level schema) | Mitigated by Zod validation before publish |
| sharp on Vercel serverless | Monitor cold starts, extend maxDuration |
| Single template at launch | Validate design with users before adding more |
| No PDF export | Expect as top feedback, defer to post-v1 |
| Public links (no privacy) | Warn user during publish, defer gating to post-v1 |
| Magic link rate limits | Google OAuth as primary, magic link as fallback |

## Verification
- [ ] User can sign up via Google OAuth on mobile
- [ ] Form saves progress across steps, survives page refresh
- [ ] Photo upload works from iPhone camera roll (HEIC)
- [ ] Published link shows correct OG preview in WhatsApp
- [ ] Link renders correctly on mobile, desktop, WhatsApp browser
- [ ] Updating form fields reflects on same public URL
- [ ] Expired link shows appropriate message
- [ ] Full flow completes under 10 minutes
