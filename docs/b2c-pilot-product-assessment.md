# Nakshatra B2C Pilot Product Assessment

**Assessment date:** 2026-09-11

**Scope:** Repository-grounded product, positioning, UX, conversion, portfolio, dashboard, and design-system review

**Pilot contract assessed:** Free, invite-only portfolio creation for adult pilot participants. Anyone with a shared First View link may view it and express interest. A verified viewer may receive identity-bound Full View access after owner approval. Payments, identity verification, and BrokerDesk are not part of the B2C pilot.

## 1. Executive summary

Nakshatra has the foundations of a differentiated product, not merely a prettier biodata maker. Its strongest idea is **staged, consent-based marriage introduction**: one current representation, a useful First View, a verified interest request, and a separately approved Full View. The code implements this separation more seriously than the marketing currently communicates.

The B2C pilot is not launch-ready yet. The main problem is not visual quality. The landing page, authentication surfaces, portfolio renderer, and dashboard are calm, credible, and responsive. The problem is that the product contract presented to users does not match the intended pilot or several actual transitions:

- The marketing presents an open, paid, verification-enabled product instead of an invite-only beta.
- Authentication equates account creation with portfolio-owner eligibility; no pilot creator entitlement exists.
- Viewer email verification creates an Auth user without clearly explaining that secure viewer identity.
- “Review and publish” publishes without a review step.
- “Approve access” releases Full View without showing the exact disclosure and seven-day term at confirmation.
- Owners and viewers receive no operational notification when an interest or decision occurs.
- Unpublishing hides the owner’s operational dashboard instead of preserving relationship history.
- Didit and BrokerDesk are implemented and reachable but are outside the pilot promise.

The correct launch strategy is to narrow the product, not expand it: enforce invited creator entitlement, disable non-pilot capabilities server-side, make every disclosure transition explicit, fix the notification loop, align public messaging with reality, and test the complete real-provider journey in staging.

### Recommended category

- **Customer-facing category:** Private marriage portfolio
- **Strategic category:** Consent-based introduction platform
- **Category behavior to own:** The controlled marriage introduction

“Digital marriage portfolio” is understandable but sounds like a format upgrade. “Trust platform” is strategically broad but too abstract for first contact. The product should anchor in the familiar phrase “marriage portfolio,” then differentiate through controlled introduction and staged disclosure.

### Recommended positioning

> For adults and families who share marriage introductions through trusted personal networks, Nakshatra is a private marriage portfolio that keeps one introduction current and personal details behind approval. Unlike PDFs, chat attachments, generic documents, and searchable matrimony platforms, Nakshatra supports a deliberate path from first introduction to verified interest to time-limited Full View—without becoming a marketplace.

### Recommended primary tagline

> **One introduction. On your terms.**

Supporting promise:

> A private marriage portfolio that stays current and keeps personal details behind your approval.

“Your Story. Your Data. Your Control.” should remain a product principle or secondary brand line. As a primary tagline it is generic, does not identify marriage introductions, and overstates control over information a recipient has already viewed or saved.

## 2. First-principles customer analysis

### What users think their problem is

“I need to create or update a good-looking biodata and send it on WhatsApp.”

### What their actual problem is

They have an **introduction-governance problem**:

- Identity is fragmented across files, photographs, horoscope attachments, and chat context.
- Old versions remain in circulation.
- Static files disclose the same information to everyone, too early.
- The candidate is reduced to fields instead of represented as a person.
- Family assistance can unintentionally displace candidate agency.
- There is no structured transition from introduction to interest to approved disclosure.

### Emotional motivations

- **Dignity:** Represent me as a person, not a database row.
- **Agency:** Let me decide what is disclosed and when.
- **Safety:** Do not expose contact, income, exact birth, or family details prematurely.
- **Family confidence:** Make it familiar and easy enough to share without technical support.
- **Credibility:** Present a serious, thoughtful introduction.
- **Relief:** Stop rebuilding and redistributing files.
- **Avoidance of embarrassment:** Do not let an outdated version represent me.

### Alternatives

| Alternative | Why it wins today | Structural weakness |
|---|---|---|
| Word, Canva, or PDF biodata | Familiar and accepted | Static, permanently forwardable, hard to update |
| WhatsApp text and photos | No setup | Fragmented, context is lost, hard to govern |
| Google Docs or Drive | One current link | Generic presentation and confusing permissions |
| Notion or personal website | Flexible storytelling | Culturally unstructured and technically demanding |
| Matrimony platform | Discovery and reach | Searchable marketplace, algorithmic matching, weak candidate control |
| Family or broker exchange | Human trust and mediation | No reliable source of truth or consistent privacy model |

### Core personas and jobs

**Candidate-owner**

When my family and I begin sharing introductions, help me create one respectful representation that stays current without exposing everything immediately.

**Family co-pilot**

Help me share the candidate’s introduction through channels I already use without managing files or making a privacy mistake.

**Prospective viewer or family**

Help me quickly understand whether an introduction may be relevant, then provide a respectful way to request more information.

**Privacy-conscious skeptic**

Before I add or request sensitive information, show me exactly who can see it, for how long, and what cannot be taken back.

### Go-to-market answers

**Who is this for?** Adult candidates who want a dignified, current, privacy-conscious introduction; family members helping them share it; and prospective families who need a low-friction, respectful next step. The B2C pilot is not for brokers or organization users.

**Why should they care?** Today they must choose between reach and privacy. Nakshatra lets them share enough to begin while holding protected details for a deliberate next step.

**Why now?** Family introductions already travel through distributed WhatsApp networks, static documents are consumed on phones, and candidates increasingly expect consent and personal agency without abandoning culturally familiar workflows.

**Why Nakshatra instead of alternatives?** It combines the familiarity of family-led biodata sharing, the currency of a living link, the humanity of a personal story, and the restraint of staged disclosure—without public discovery or matchmaking algorithms.

### Launch narrative

> Biodata files were designed to be sent, not governed. They become outdated, separate the person from their story, and expose the same details to everyone. Nakshatra turns the marriage introduction into a living, controlled process: share a useful First View, receive a verified request, and decide when Full View is appropriate.

### Messaging frameworks

**AIDA**

- Attention: Your biodata keeps circulating after it becomes outdated.
- Interest: One current portfolio replaces disconnected files and attachments.
- Desire: Be represented thoughtfully while keeping personal details behind approval.
- Action: Create with your pilot invitation.

**PAS**

- Problem: Files go stale, split apart, and expose too much too early.
- Agitate: Every correction creates another version; every forward removes context and control.
- Solution: A current marriage portfolio with a shareable First View and approved Full View.

**Awareness-stage actions**

- Problem-aware: See why files fail.
- Solution-aware: See how access works.
- Product-aware invited participant: Create with my invitation.
- Product-aware uninvited visitor: Join the beta waitlist.
- Existing participant: Sign in.

## 3. Repository discovery

### Application structure

- Next.js 16 App Router application with React 19 and TypeScript.
- Supabase Postgres, Auth, and private Storage.
- Zod contracts at input and persisted-data boundaries.
- Server-oriented feature modules divided into repositories, services, and contracts.
- One canonical React portfolio renderer, with public and approved data projections created separately.
- 28 page routes, 44 API route files, 48 additive database migrations, and 102 unit/E2E test files at assessment time.

### Product sitemap

```text
Public marketing
├── /                         Landing page
├── /landing/story           Alternate landing concept
├── /landing/control         Alternate landing concept
├── /landing/family          Alternate landing concept
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

B2C owner experience
├── /dashboard               Status, requests, access, link, editor
├── /edit                    Compatibility redirect
├── /preview                 Owner preview of current public mode
├── /approved-preview        Owner preview of Full View
└── /account                 Export, sessions, account deletion

Shared portfolio experience
├── /p/[token]               First View or identity-resolved Full View
├── /p/[token]/horoscope     Authorized horoscope retrieval
├── /verify/[token]          Viewer verification-link flow
└── interest modal           Email OTP → request submission

Identity verification
├── dashboard verification module
├── /verification/result
├── /api/identity-verification/*
└── /api/webhooks/didit

BrokerDesk / B2B
├── /brokerdesk
├── /brokerdesk/onboarding
├── /brokerdesk/security/mfa
├── /brokerdesk/w/[workspaceRef]/customers
├── /brokerdesk/w/[workspaceRef]/customers/[relationshipRef]
├── /brokerdesk/w/[workspaceRef]/settings/team
├── /brokers
├── /join/customer
├── /join/team
├── /api/v1/brokerdesk/*
└── /api/v1/customer/*
```

### Navigation and layout patterns

- Marketing uses an editorial header and anchored single-page navigation.
- Authentication uses a focused card/single-task shell.
- Dashboard is a state-driven workspace with a full-screen editor overlay.
- Portfolio uses a document/editorial reading model: hero, quick facts, numbered chapters, gallery, then protected details and interest action.
- BrokerDesk uses a separate business onboarding/workspace visual language.
- Legal and account pages use focused content layouts rather than a global application shell.

There is no unified global product navigation, which is acceptable for an early, task-oriented pilot. However, support, beta status, and account access should be consistently available from owner surfaces.

### Design system

- Display: Playfair Display.
- Body: Manrope.
- Section label: Tenor Sans.
- Utility/code: Geist and Geist Mono.
- Core visual language: warm canvas, paper surfaces, navy action color, teal trust state, restrained gold cultural accent.
- Responsive breakpoints are implemented across landing, portfolio, auth, dashboard, and BrokerDesk.
- Reduced-motion and visible-focus handling exist on major public surfaces.
- Touch targets are commonly 44–48px.

The design language is coherent in appearance but not yet a maintainable system. `globals.css` is approximately 4,800 lines and contains multiple historical layers and product-specific blocks, while components use a mixture of tokens, Tailwind utilities, CSS modules, and raw hex values. The active portfolio design depends partly on later CSS overriding earlier portfolio blocks. At assessment time, repository UI code contained hundreds of distinct raw color literals, including theme maps. This makes state semantics, contrast governance, and future change expensive.

The effective portfolio fonts are Playfair Display and Manrope. Several local font declarations and aliases remain but are not the active visual system. Five Next-loaded font families are excessive for the pilot. A two-family system plus script-aware fallbacks is sufficient.

### Technical limitations affecting UX

- The data model remains hybrid: legacy portfolio JSON coexists with normalized candidates and detail tables.
- No creator-entitlement model exists for invite-only B2C access.
- No notification service closes the interest/decision loop.
- The editor’s full-screen overlay lacks dialog semantics and focus management.
- Full database verification requires the Docker-backed pgTAP workflow; the local assessment host did not have Docker or Podman.
- The checked-out repository was not linked to a deployed Supabase or Vercel project, so production control-plane configuration could not be verified.

## 4. Product scorecard

Scores represent pilot readiness, not visual taste.

| Dimension | Score | Assessment |
|---|---:|---|
| Clarity | 6/10 | Core file-replacement idea is clear; category and pilot eligibility are inconsistent. |
| Trust | 5/10 | Strong disclosure architecture, weakened by false launch claims and surprising transitions. |
| UX | 6/10 | Thoughtful details and states, but important workflows have dead ends and misleading action labels. |
| Mobile | 7/10 | Responsive, readable, and touch-aware; long pages/forms remain demanding. |
| Accessibility | 6/10 | Strong baseline semantics/focus in some components; editor dialog, destructive target, status timing, and media descriptions need work. |
| Conversion | 4.5/10 | Page is polished but converts toward the wrong open/paid/verified contract. |
| Design consistency | 5.5/10 | Visual direction is coherent; implementation primitives and state styles are fragmented. |
| Overall B2C pilot readiness | 4.5/10 | Strong concept and tested core, but P0 authorization, disclosure, messaging, and operations remain. |

## 5. Landing-page audit

### Five-second test

Users can understand that Nakshatra is a digital marriage portfolio, replaces scattered biodata material, and controls some protected details. They cannot understand that creation is invite-only, viewers can participate without creator rights, payment and verification are unavailable, or precisely what “control” ends once information is viewed.

### Current strengths

- The hero communicates an outcome: sharing without losing control.
- The pain section uses concrete problems: staleness, fragmentation, and irreversibility.
- The First View → verified request → Full View model is the strongest differentiator.
- “Nothing to install” directly addresses family adoption friction.
- The visual style is calm, editorial, culturally restrained, and avoids marketplace/dating patterns.
- The page is responsive, keyboard-aware, and reduced-motion aware.

### Current information architecture

Header → Hero → Biodata problem → Control → How it works → Family benefits → Sample cards → Pricing → FAQ → Final CTA.

This is coherent for a commercial launch but incorrect for the private beta. Pricing should be replaced by beta participation rules. The static “sample” cards should be replaced with an actual First/Full disclosure demonstration.

### Recommended pilot page order

1. Beta-aware header.
2. Category and primary outcome.
3. Familiar file/WhatsApp pain.
4. First View versus approved Full View demonstration.
5. Network workflow.
6. Candidate and family benefits.
7. Actual sample portfolio.
8. “What Nakshatra is—and is not.”
9. Private-beta participation rules.
10. Evidence-based privacy explanation.
11. FAQ.
12. Dual final CTA.

### Recommended hero copy

**Eyebrow:** Invite-only private beta

**Headline:** One marriage introduction. Shared on your terms.

**Body:** Replace scattered biodata files, photos, and horoscope attachments with one current portfolio. Families see a clear first introduction. Personal details are shared only after you approve their verified request.

**Primary CTA:** Create with my invitation

**Secondary CTA:** See how access works

**Boundary:** Portfolio creation is limited to invited pilot participants. Anyone with a shared portfolio link can view its First View and express interest.

Required honesty note:

> Visible information can still be saved or forwarded by recipients. Nakshatra controls access to protected details; it cannot recall information someone has already seen.

## 6. Authentication and registration audit

### What works

- Email/password, Google, OTP verification, recovery, non-enumerating responses, loading/error states, and safe redirects are implemented.
- The forms are visually focused, readable, and mobile-friendly.
- Password requirements and legal acknowledgement are visible.

### What fails the pilot

- `/signup` offers unrestricted creator account creation.
- Password and OAuth flows bootstrap portfolios without checking pilot entitlement.
- Viewer verification creates an Auth identity but the interface describes only email verification.
- Signup does not establish whether the adult candidate is acting for themselves or receiving family assistance.
- The flow does not state beta limitations, setup effort, what to prepare, or what remains private.

### Recommended flow

1. **Uninvited boundary:** `/signup` explains that portfolio creation is invite-only. Offer Sign in and optionally Join waitlist; do not create a portfolio.
2. **Invitation acceptance:** Single-use, email-bound invitation. Show pilot terms, enabled/disabled features, support contact, and candidate ownership requirement.
3. **Authentication:** Google or password must match the invited email.
4. **Representation and consent:** “I am the adult candidate” or “I am assisting an adult candidate.” Assisted creation requires recorded candidate consent before publication.
5. **Welcome commitment:** Explain the six essentials, expected time, autosave, and disclosure layers.
6. **Fast first value:** Name, location, role, short introduction, and main photo, followed immediately by a live preview.
7. **Guided completion:** Progressively disclose remaining detail groups.
8. **Real disclosure review:** Public view, Full View, link preview, photo visibility, expiry, and forwarding warning before explicit publication.

## 7. Portfolio-creation audit

### Strengths

- Every field is labeled Required, Recommended, or Optional.
- Every field explains its audience: all views, Standard/Full, Full only, or approved people.
- Draft and published states are separate.
- Mobile and desktop navigation are distinct.
- Optional sections can be skipped.
- The form asks narrative questions, not only biodata fields.
- Validation is shared across UI, API, and publication service.

### Friction

- Nine peer-level sections still signal high effort.
- Users do not receive enough early emotional reward.
- Manual saving creates memory burden and anxiety.
- Photo upload appears before the initial persisted draft allows it.
- Readiness failures do not link users to missing fields.
- “Review and publish” performs publication instead of opening a review.
- Appearance, privacy mode, visibility rules, contacts, and final publication are compressed into one late section.
- Adult status is stated but not reliably enforced from DOB at publication.

### Recommended four-milestone model

1. **Your introduction:** essentials, main photograph, short story.
2. **Life, family, and compatibility:** education/work, family, lifestyle, preferences, future.
3. **Astrology and protected details:** cultural details, horoscope attachment, protected data.
4. **Privacy review and sharing:** public mode, field/photo disclosure, First/Full previews, link behavior, publication confirmation.

Keep the current detailed sections as progressive sub-sections. Do not remove culturally relevant fields simply to mimic a generic profile builder.

## 8. Portfolio-template audit

### Current model

There is one canonical renderer, `CelestialUnion`, despite legacy template IDs. It renders a portfolio as an editorial document: hero, at-a-glance facts, personal story, journey, lifestyle, family, astrology, gallery, partnership/future chapters, and a protected-details conclusion.

### Strengths

- Feels more like a considered personal introduction than a matrimony search result.
- Avoids swipe, compatibility-score, marketplace, and gamified patterns.
- Public and approved content are structurally different projections.
- Protected sections remain visible as understandable boundaries rather than disappearing silently.
- Desktop and mobile reading orders are intentionally adapted.
- Typography and restrained cultural accents create seriousness without wedding-card ornamentation.
- Contact data and exact sensitive details appear only in Full View.

### Risks

- The long mobile document can delay the only interest CTA until very late.
- Mobile hides the section navigation precisely where the document becomes longest.
- Dense fact pairs and repeated chapter treatments can become biodata-like when narrative content is sparse.
- Empty or generic narratives produce large low-value sections.
- Gallery prominence can outweigh personal story and disclosure context.
- Public hero metadata and social previews can be cached outside Nakshatra after sharing.
- Owner, public, and approved mode labels need stronger plain-language explanation.
- The global skip link targets `#main-content`, while this template uses `#portfolio-top`.
- `themeColor` is passed through the template API but is not used by the renderer, so Open Graph styling can disagree with the opened portfolio.
- Alt text is reused as a visible photo caption, although accessibility descriptions and human story captions have different jobs.
- The lightbox lacks a complete focus trap and trigger-focus restoration.
- Current fonts load Latin subsets only, leaving Indian-script rendering to inconsistent system fallback.
- The current single renderer is a strength; multiplying aesthetic templates would fragment trust and comparison behavior.

### Recommended structure

1. Identity and one-sentence human introduction.
2. Compact “At a glance” facts needed for initial relevance.
3. A real personal-story block with prompts for specificity.
4. Education/work as a journey, not a résumé table.
5. Family context as narrative plus minimal facts.
6. Lifestyle and values.
7. Cultural/astrology information.
8. Selected moments/gallery.
9. Future and partnership intent.
10. Clear disclosure boundary and respectful interest action.

Add a restrained early “Introduce yourself” link in the hero and a contextual mobile action after the hero. Preserve the more explanatory final CTA.

## 9. Dashboard audit

### Strengths

- Pending interests and active grants appear before vanity metrics.
- Sharing, link rotation, unpublishing, renewal, access renewal/revocation, and account privacy are available.
- The draft editor explains saving versus publication.
- Empty states are warm and direct.
- Access history supports the control narrative.

### Problems

- Publication state determines whether operational information is visible.
- Interest and access are split into different surfaces even though they are one relationship lifecycle.
- Approval has no disclosure-confirmation step.
- Share, renew, rotate, and unpublish have similar visual prominence.
- Public-link expiry and seven-day Full View expiry are not explained together.
- Pending and historical lists silently stop at five.
- Identity verification occupies owner attention despite being excluded from the pilot.
- No persistent beta support/feedback channel exists.
- No notifications mean dashboard polling is required.

### Recommended structure

**Status and next action**

Draft → complete essentials. Ready → review disclosure. Published → share. Unpublished/expired → recover while retaining history.

**Introductions and access**

One person record per relationship: Waiting → Full View active → Expired/Ended → Set aside. Include verified identity state, submitted context, disclosed categories, expiry, decision controls, and activity history.

**Portfolio and privacy**

Public/Full preview switcher, milestone completion, privacy mode, photo disclosure, edit, and “draft differs from published” status.

**Sharing**

Copy and WhatsApp remain primary. Rotate and unpublish move into Link settings with consequence-led confirmations.

**Pilot support**

Persistent “Private beta: get help or send feedback” entry point.

## 10. Top 20 UX problems

1. No creator beta entitlement separates invited owners from network viewers.
2. Viewer OTP creates an Auth identity without transparent explanation.
3. “Review and publish” publishes without a review.
4. Full View approval occurs without a disclosure confirmation.
5. No new-interest or decision notifications.
6. Unpublishing hides operational history and controls.
7. Didit verification conflicts with the pilot journey.
8. BrokerDesk remains reachable from the B2C application.
9. The interest CTA appears only near the end of a long portfolio.
10. Nine equal-priority form sections signal excessive effort.
11. Readiness errors do not deep-link to missing fields.
12. Full-screen editor lacks dialog semantics, focus trap, and Escape behavior.
13. Manual save increases anxiety and abandonment risk.
14. Photo upload can be attempted before a persisted draft permits it.
15. Photo deletion is a small destructive target without confirmation or undo.
16. Photo descriptions/alt text cannot be authored in the UI.
17. “Short / Standard preview” labels one route ambiguously.
18. Interest and Full View appear as separate records instead of one lifecycle.
19. Lists silently truncate at five.
20. Interest success disappears too quickly and does not explain the next step.

## 11. Top 20 conversion problems

1. Every major CTA sends visitors toward unrestricted signup.
2. “Private beta” and “invite-only” are absent.
3. Paid plans are advertised despite unavailable payment.
4. Plan selection is described as a publication requirement.
5. Verification is promised in the creation workflow.
6. Verification is repeated as a family benefit.
7. The hero mockup displays a misleading verified badge.
8. “View a sample portfolio” leads to static cards, not a sample portfolio.
9. Invited creators and uninvited viewers receive the same CTA.
10. There is no waitlist or beta-interest route.
11. The forwardable First View is not distinguished early enough from identity-bound Full View.
12. Trust claims are not supported by a concrete “who sees what” artifact.
13. Category terminology varies across metadata, pages, and documents.
14. The stated brand line is disconnected from implemented copy.
15. Emotional value—dignity, agency, and relief—is secondary to mechanics.
16. Repeated CTAs do not adapt to visitor awareness stage.
17. Expected creation effort and preparation are absent.
18. Candidate ownership and consent requirements are absent at conversion.
19. Mobile hides Sign in while emphasizing an inappropriate open creator CTA.
20. Internal README/CLAUDE guidance has been materially stale, undermining launch alignment.

## 12. Top 20 design improvements

1. Add a persistent Private beta label to marketing and owner surfaces.
2. Create distinct invitation, waitlist, and viewer entry components.
3. Build an actual First View/Full View disclosure comparison.
4. Add a real publication-review screen.
5. Add a Full View grant confirmation with categories and seven-day expiry.
6. Redesign the editor into four outcome milestones.
7. Provide a live preview after the first essential milestone.
8. Implement autosave with “Saved just now” status.
9. Add incomplete-section badges and direct error navigation.
10. Turn the editor overlay into an accessible dialog or dedicated route.
11. Add a restrained early portfolio interest action.
12. Unify request and grant cards into one relationship component.
13. Separate primary sharing actions from destructive link settings.
14. Preserve dashboard history for unpublished and expired states.
15. Make destructive controls at least 44px and confirm or undo them.
16. Add photo-description editing and meaningful generated defaults.
17. Standardize button, input, notice, badge, dialog, and empty-state primitives.
18. Replace raw color/state literals with semantic tokens.
19. Split monolithic global styles into foundations and product-surface layers.
20. Add a persistent support/feedback component appropriate to a private beta.

Additional template-specific corrections within those improvements: fix the skip-link target, restore mobile section navigation, separate captions from alt text, complete lightbox focus management, align or remove the unused `themeColor` contract, and update stale template metadata.

## 13. Design-system roadmap

### Foundation

- Define semantic color tokens: canvas, surface, text, muted, border, action, trust, warning, danger, focus, and disclosure states.
- Define typography roles rather than page-specific sizes: display, page title, section title, body, label, helper, metadata.
- Adopt a consistent spacing and radius scale.
- Define minimum touch targets, focus rings, motion limits, and contrast criteria.

### Primitives

- Button: primary, secondary, quiet, danger, link.
- Field: label, requirement, audience, hint, error, success.
- Notice: information, success, warning, error.
- Dialog/drawer with focus management.
- Status badge and disclosure badge.
- Empty state, loading state, and retry state.
- Person/relationship card.

### Product patterns

- Disclosure comparison.
- Publication review.
- Access grant confirmation.
- Link settings and consequence confirmation.
- Milestone progress.
- Portfolio chapter and protected-section patterns.
- Beta boundary and support entry point.

### Architecture

- Keep landing-specific layout in its CSS module.
- Split `globals.css` into tokens/reset, shared primitives, B2C workspace, portfolio, and BrokerDesk layers.
- Avoid broad descendant overrides such as editor rules that reinterpret utility-class colors.
- Add Storybook or an equivalent isolated component catalogue only after primitives stabilize; do not delay pilot correctness for it.

## 14. Prioritized delivery roadmap

### Quick wins: high impact, low effort

1. Replace pricing with private-beta participation rules.
2. Remove Didit promises and verified badges from pilot marketing/UI.
3. Add Private beta labels and accurate creator-versus-viewer copy.
4. Rename “Review and publish” until a review exists, or add a minimal confirmation.
5. Add a seven-day disclosure confirmation before approving Full View.
6. Preserve Sign in on mobile.
7. Clarify First View forwarding and screenshot limits.
8. Correct category terminology across metadata and legal pages.
9. Change “sample portfolio” CTA to an actual sample or accurately label the static preview.
10. Keep success states open until dismissed and state the next step.

### Medium-term: required for a trustworthy pilot

1. Implement email-bound creator invitations and owner entitlement enforcement.
2. Gate BrokerDesk, Didit, and payment capabilities server-side.
3. Add owner and viewer workflow notifications.
4. Build real public/Full publication review.
5. Add autosave and readiness navigation.
6. Unify request and grant lifecycle UI.
7. Make the editor accessible.
8. Enforce adult candidate status and consent.
9. Schedule privacy deletion and retention workers.
10. Verify the linked production environment, backups, Auth, Storage, SMTP, CAPTCHA, RLS, and migration ledger.

### Long-term product vision

- Establish the controlled introduction as a recognizable behavior, not a feature list.
- Support family assistance while preserving candidate ownership and explicit consent.
- Treat BrokerDesk as a separate mediated distribution surface using the same consent and disclosure core.
- Create portable trust/provenance signals only when they can be evidenced; avoid decorative verification badges.
- Build relationship-centered activity rather than marketplace discovery, feeds, rankings, or compatibility scores.
- Use pilot research to improve prompts and representation quality without optimizing for profile comparison.
- Explore candidate-controlled collaboration, structured reciprocal introductions, and revocable broker mandates.
- Keep a single excellent canonical portfolio system until user research proves materially different reading needs—not aesthetic preference—require variants.

## 15. Pilot launch gates

Do not invite real participants until all P0 gates pass:

- Only an email-bound invited user can become a portfolio owner.
- Viewer identities cannot self-elevate into creator entitlement.
- Payments, Didit, and BrokerDesk are disabled server-side and absent from pilot claims.
- Publication includes an explicit, accurate disclosure review.
- Full View approval shows recipient, data categories, seven-day expiry, and revocation behavior.
- Owners receive new-interest notifications; viewers receive decision notifications.
- Adult participation and candidate consent are enforced.
- Account deletion and retention workers are operating and monitored.
- Production Supabase/Vercel identity, migration ledger, RLS, buckets, Auth, SMTP, CAPTCHA, secrets, and backups are verified.
- Real-device WhatsApp, email, link-forwarding, expiry, revocation, export, and deletion rehearsals pass.
- Privacy, terms, support identity, and owned domain are accurate.

Recommended rollout:

1. Three internal synthetic accounts.
2. Five real pilot participants.
3. Forty-eight hours without critical authorization, disclosure, publication, notification, or deletion failures.
4. Expand in small waves to the remaining invited cohort.
5. Review requests, delivery failures, support, deletion backlog, and security alerts daily.

## 16. Evidence and assessment limitations

Primary implementation evidence:

- Landing: `src/components/landing/LandingExperience.tsx`
- Auth: `src/components/auth/AuthForm.tsx`, `src/app/api/auth/*`
- Owner bootstrap: `src/features/auth/server/portfolio-bootstrap.ts`
- Creation: `src/components/portfolio/BlueprintForm.tsx`
- Dashboard: `src/app/dashboard/dashboard-client.tsx`
- Public portfolio: `src/app/p/[token]/page.tsx`
- Portfolio renderer: `src/components/templates/CelestialUnion.tsx`
- Interest flow: `src/components/portfolio/InterestRequestModal.tsx`
- Portfolio security/data projections: `src/features/portfolio/server/*`
- Database architecture: `supabase/migrations`, `supabase/tests/database`
- Design: `src/app/globals.css`, `src/components/landing/LandingExperience.module.css`, `DESIGN.md`

Validation observed during the broader readiness review:

- Typecheck passed.
- Production build passed with local placeholder public Supabase values.
- Unit coverage passed: 523 tests across 91 files.
- Browser tests passed: 20 desktop/mobile Chromium tests.
- Dependency audit reported zero known vulnerabilities at the configured threshold.
- Database structural smoke test passed.
- Full local pgTAP execution was unavailable because Docker/Podman was not present.
- Production infrastructure and deployed database state were not verifiable because this checkout was not linked to Supabase or Vercel.

This assessment evaluates the checked-out code and local rendered experience. It does not certify legal compliance, production security configuration, email deliverability, backup recoverability, or real-user comprehension. Those require counsel, linked-environment verification, operational rehearsal, and pilot research.
