# Nakshatra Product Design Direction

Status: research-backed design baseline  
Scope: individual portfolio, public viewer experience, trust and disclosure controls, and future broker workspace  
Last reviewed: 2026-09-04

## 1. Product stance

Nakshatra is a trust platform for personal representation, introductions, and controlled disclosure. It is not a dating product and should not borrow swipe mechanics, desirability scoring, infinite discovery feeds, or gamified matching.

The product has two connected jobs:

1. Help an individual or family create a dignified, accurate representation of a person.
2. Help a broker coordinate introductions, decisions, and access without becoming the owner of that person's identity.

The design should communicate three ideas within the first minute:

- **Representation:** “This is a considered account of who I am.”
- **Trust:** “Claims, identity checks, and relationship context have clear sources.”
- **Control:** “Sensitive information is revealed deliberately and can be withdrawn.”

The correct visual metaphor is an editorial dossier combined with a secure client portal. The portfolio can be warm and personal; the workspace should be calm, operational, and explicit.

## 2. Design principles

### 2.1 Evidence over ornamental badges

A verification label must say what was checked, by whom, and when. “Identity verified” must never imply that biography, family claims, income, education, or compatibility have been verified.

Use:

- `Government ID checked · Aug 2026`
- `Email confirmed`
- `Added by Priya Sharma · Family broker`
- `Self-reported` where evidence is not supplied

Avoid a single green check that appears to certify the entire person.

### 2.2 Disclosure is a relationship, not a page mode

Access should be understood as a grant between people, attached to an introduction, with a scope and an expiry. Every locked section should answer:

- What is hidden?
- Who can reveal it?
- What needs to happen first?
- How long will access last?

### 2.3 One identity, multiple intentional views

The underlying portfolio is one structured record. Different recipients receive purpose-built views of that record. The owner should be able to preview the exact experience for each recipient before sharing.

### 2.4 Calm clarity for ages 25–70

The interface should reward scanning without becoming sparse or cryptic. Use plain language, obvious navigation, persistent labels, large targets, and summaries before detail. Do not depend on hover, icon recognition, drag gestures, or hidden side panels for essential actions.

### 2.5 Warm B2C, precise B2B

Both products should share color, typography, state language, and trust components. The public portfolio can use editorial type and generous spacing. The broker workspace should use a compact sans-serif information system, with serif type reserved for a person's name or narrative.

### 2.6 State and provenance are visible

Dates, sources, status changes, grants, revocations, and broker actions should form a readable audit trail. Human-facing language comes first; technical identifiers remain secondary.

## 3. Research synthesis

### Airbnb

**Why it works:** Airbnb combines a selected personal profile with transaction history and narrowly described identity verification. Exact address and contact information are held back until a booking is confirmed. The product explicitly avoids presenting verification as a guarantee.

**Reusable patterns:** trust evidence near identity; personal facets that humanize without becoming a feed; sensitive details unlocked by a meaningful relationship event; confidence-building copy that states the limit of a check.

**Risks and tradeoffs:** badges can be over-read; a completed platform transaction is a much clearer disclosure trigger than a matrimony introduction; personal-interest prompts can become performative.

**Nakshatra adaptation:** show verification scope and date beside the person's summary. Reveal contact, exact birth data, original documents, and family contact only after a named relationship event and explicit approval. Keep personal prompts curated and finite.

Reference: [Airbnb profile information](https://www.airbnb.com/help/article/3411), [identity verification](https://www.airbnb.com/help/article/450/what-is-verified-id), and [post-confirmation contact/address access](https://www.airbnb.com/help/article/4116).

### LinkedIn

**Why it works:** a strong identity header is followed by chronological evidence. Optional sections allow depth without making every profile feel incomplete. Featured work turns claims into inspectable proof, while public-profile visibility is configurable.

**Reusable patterns:** summary first; stable section order; chronology for education and work; evidence attached to claims; optional modules; granular public visibility.

**Risks and tradeoffs:** profiles can become long, repetitive, status-driven, and recruiter-shaped. Endorsement counts can look authoritative without being meaningful.

**Nakshatra adaptation:** use a compact identity header, a short first-person introduction, and structured evidence for education and career. Do not add a social graph, endorsements, follower counts, or activity feed.

Reference: [LinkedIn profile sections](https://www.linkedin.com/help/learning/answer/a540837/add-sections-to-your-profile?lang=en), [Featured section](https://www.linkedin.com/help/linkedin/answer/a1590642), and [public-profile visibility](https://www.linkedin.com/help/linkedin/answer/a528138/control-your-public-linkedin-profile?lang=en).

### Read.cv

**Why it works:** the historical Read.cv profile treated a career as an authored page rather than a database export. Strong typography, restrained navigation, and project-led storytelling made profiles easy to read.

**Reusable patterns:** editorial composition; high signal-to-noise; authored projects; flexible modules inside a predictable reading rhythm.

**Risks and tradeoffs:** aesthetic freedom can reduce comparability and accessibility. Read.cv has closed following its acquisition, so it is a visual reference rather than an active product benchmark.

**Nakshatra adaptation:** let users express personality through selected prompts, image rhythm, and narrative—not through arbitrary layout or type customization. Maintain a dependable section order for reviewers.

Reference: [Read.cv acquisition and shutdown report](https://techcrunch.com/2025/01/17/perplexity-acquires-read-cv-a-social-media-platform-for-professionals/).

### Contra

**Why it works:** a shareable profile combines an introduction, projects, services, and recommendations. It treats the profile as a presentation artifact and a route to a bounded next action.

**Reusable patterns:** work samples as evidence; recommendations with provenance; one memorable link; clear next step.

**Risks and tradeoffs:** marketplace conversion patterns can make a person feel transactional. Recommendations can become popularity signals.

**Nakshatra adaptation:** use evidence cards for education, work, interests, and community involvement. A recommendation should explain the author's relationship to the person and never be reduced to a count.

Reference: [Contra for independents](https://contra.com/how-it-works/independents).

### Upwork

**Why it works:** Upwork makes the opening summary do substantial work, then backs it with skills, history, portfolio items, certifications, and client feedback. The system distinguishes self-authored claims from platform-derived history.

**Reusable patterns:** first-screen summary; structured credibility; evidence source; consistent section scaffolding.

**Risks and tradeoffs:** ratings, ranking, badges, and dense skill lists optimize selection and comparison rather than understanding. They are inappropriate for a personal relationship context.

**Nakshatra adaptation:** preserve the hierarchy—summary, story, evidence, detail—but remove scores and competitive rankings. Mark whether information is self-reported, document-supported, or independently checked.

Reference: [Upwork profile essentials](https://support.upwork.com/hc/en-us/articles/360016252373-How-to-build-your-freelancer-profile-the-essentials).

### Polywork

**Why it works:** Polywork popularized a multi-hyphenate representation model: a person can have several roles, pursuits, and identities rather than one reductive title.

**Reusable patterns:** multiple facets; milestone-based storytelling; emphasis on what a person does and cares about.

**Risks and tradeoffs:** many tags become noise, and the current product has shifted toward monetizing skills rather than profile representation.

**Nakshatra adaptation:** allow three to five “life facets” and a small timeline of meaningful moments. Avoid a badge cloud or feed of minor updates.

Reference: [Polywork](https://www.joinpolywork.com/).

### Mercury

**Why it works:** Mercury separates role capability from account/data scope. Users can understand not just what a collaborator may do, but which accounts the permission applies to. Role templates reduce setup burden.

**Reusable patterns:** action × scope permission model; a few understandable role presets; previewing a role; sensitive fields hidden for limited roles.

**Risks and tradeoffs:** custom roles can become unmanageable, and the security model can be too abstract for family users.

**Nakshatra adaptation:** for brokers, separate capabilities (`view`, `introduce`, `request disclosure`, `edit with approval`) from record scope (`assigned people`, `team`, `organization`). Offer three or four presets before custom configuration.

Reference: [Mercury roles and permissions](https://support.mercury.com/hc/en-us/articles/28768978787860-Managing-roles-and-permissions).

### Attio

**Why it works:** Attio keeps a canonical person/company record separate from the workflow-specific list entry. A record timeline collects notes, tasks, email, and changes; typed relationship attributes make connections first-class.

**Reusable patterns:** canonical entities; context-specific workflow records; split record layout; chronological activity; linked relationships; saved views.

**Risks and tradeoffs:** CRM flexibility creates configuration work and can lead to ambiguous fields or over-dense screens.

**Nakshatra adaptation:** keep `Person`, `Broker relationship`, and `Introduction` as separate objects. A person's identity must not change because an introduction moves stages. Default the workspace to an opinionated matrimony workflow rather than a blank CRM.

Reference: [Attio lists](https://attio.com/help/reference/attio-101/attios-data-model/understanding-lists), [record timelines](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), and [relationship attributes](https://attio.com/help/reference/managing-your-data/attributes/relationship-attributes).

### Notion

**Why it works:** the share dialog centralizes invitees, link access, permission level, expiration, and access requests. The visible mental model is “who has access to this item and what can they do?”

**Reusable patterns:** one access surface; explicit permission levels; link expiration; request-access workflow; inherited-access explanation.

**Risks and tradeoffs:** permission inheritance and “broadest access wins” rules are difficult to predict. A single page-level permission is too coarse for sensitive personal data.

**Nakshatra adaptation:** build an Access center that lists each recipient, access source, visible sections, expiry, and last use. Warn when a broader grant supersedes a narrower one. Support section bundles instead of dozens of field toggles.

Reference: [Notion sharing and permissions](https://www.notion.com/help/sharing-and-permissions).

### Linear

**Why it works:** a small number of fixed status categories preserve system meaning while teams can name the states in their language. Views, projects, and issue records all expose current state without turning every page into a dashboard.

**Reusable patterns:** constrained workflow grammar; clear default state; human-readable custom labels; fast list/board transitions; archived states remain recoverable.

**Risks and tradeoffs:** excessive keyboard-first behavior and compact density can exclude occasional users. Custom labels can hide semantic differences if not mapped clearly.

**Nakshatra adaptation:** keep introduction states constrained and offer plain labels. Use a board for active coordination and a list for scanning/audit. Every state change should retain actor, time, and reason.

Reference: [Linear workflow configuration](https://linear.app/docs/configuring-workflows) and [project status](https://linear.app/docs/project-status).

### Affinity and HubSpot

**Why they work:** Affinity makes relationship paths and interaction history visible; HubSpot shows a record overview, activity timeline, and associated records in a predictable multi-column layout.

**Reusable patterns:** best path to an introduction; shared relationship history; chronological interactions; visible associations with provenance.

**Risks and tradeoffs:** automatic relationship inference can feel invasive, and auto-associated activity can disclose private communications to the wrong team member.

**Nakshatra adaptation:** only show confirmed relationship paths. Require an explicit audience when a broker adds a note or communication. Keep private broker notes separate from information the represented person can review or approve.

Reference: [Affinity relationship intelligence](https://www.affinity.co/product/) and [HubSpot record layout](https://knowledge.hubspot.com/records/work-with-records).

## 4. Shared visual system

The existing cream, ink, teal, and restrained gold direction is appropriate. Consolidate it into semantic tokens before adding the broker surface.

| Token | Proposed value | Use |
| --- | --- | --- |
| `canvas` | `#F8F6F0` | page background |
| `surface` | `#FFFDF8` | cards, sheets, forms |
| `ink` | `#18272E` | primary text |
| `ink-muted` | `#59686D` | secondary text |
| `brand-navy` | `#244854` | primary actions, navigation |
| `trust-teal` | `#477B77` | verified or active trust state |
| `accent-gold` | `#8F6628` | editorial accent, never sole status signal |
| `line` | `#D8D8D2` | borders and separators |
| `danger` | `#993F3F` | destructive action/error |

Typography:

- Playfair Display: public-page display headings and a person's name only.
- Manrope: body copy, forms, navigation, tables, permissions, and all broker workflows.
- Tenor Sans: optional restrained eyebrow/section labels.
- Portfolio reading size: 17–18 px body with 1.6–1.7 line height.
- Product UI size: 16 px body; never below 14 px for meaningful labels.
- Measure: 60–72 characters for narrative text.
- Touch targets: 44 px minimum; prefer 48 px for primary family-facing actions.

Status must always combine text with shape or icon. Color is reinforcement, not the only distinction.

## 5. Individual experience architecture

### 5.1 Landing page

Recommended story:

1. **Hero:** `Share your story. Not your privacy.` Subcopy explains one living portfolio, approved access, and family-friendly review. Primary action: `Create your portfolio`. Secondary: `View an example`.
2. **Problem/proof:** replace scattered PDFs and repeated updates with one controlled source. Show a real product screen, not decorative document stacks alone.
3. **What a portfolio contains:** Story, journey, everyday life, family context, preferences, and protected details.
4. **How sharing works:** First view → interest → owner approval → time-limited details.
5. **Trust controls:** verification scope, recipient preview, expiration, revoke, and no public directory.
6. **Pricing + focused FAQ + final action.**

Keep the landing page to six major chapters. Use one credible proof point per claim. Until real customer evidence exists, label quotes and portfolios as examples instead of presenting invented testimonials as social proof.

### 5.2 Sign in and sign up

- One clear task per screen; no marketing carousel.
- Labels remain visible above fields.
- Explain password requirements before submission.
- Keep `Forgot password?` adjacent to the password field.
- If Google sign-in is offered, describe whether the email is used for identity, account access, or both.
- After sign-up, show a three-step expectation: confirm email, create the essential profile, preview before publishing.
- Preserve entered values after recoverable errors and focus the first invalid field.

### 5.3 Portfolio creation

Use an eight-step guided flow with autosave and a continuously available preview:

1. Essentials
2. Your story
3. Education and work
4. Everyday life and values
5. Family context (optional)
6. What you are looking for (optional)
7. Astrology and documents (optional/protected)
8. Sharing and review

Each field or field group has a visible audience chip: `First view`, `After mutual interest`, `Shared by you`, or `Only you`. Use suggested defaults and allow edits. Do not ask users to understand “Balanced” versus “Private” before they have seen the resulting view.

Show:

- autosave state and last saved time;
- estimated remaining time;
- `Why we ask` for sensitive questions;
- a concrete example for open-text prompts;
- `Skip for now` for optional sections;
- preview as `Anyone with link`, `Interested person`, and a named approved recipient;
- a shareable review link that allows comments without edit access.

### 5.4 Portfolio reading order

1. **Identity cover:** preferred name, age, city, role/occupation, short orientation line, verification details.
2. **In their own words:** 80–160 word personal introduction.
3. **Education and work:** chronological, evidence-aware, compact.
4. **Everyday life and values:** a small set of specific prompts, not a tag cloud.
5. **Family context:** summary first, deeper detail only when appropriate.
6. **Gallery:** 4–8 intentionally captioned images, not an endless carousel.
7. **Partnership outlook:** values and practical preferences in neutral language.
8. **Astrology:** optional; summary and document access are separate permissions.
9. **Protected details and next step:** say what exists, why it is protected, and how to request it.

Desktop uses a sticky section index. Mobile uses a compact `Jump to section` menu and scroll progress. Essential information remains expanded; only optional detail uses accordions. Repeat the primary next action after the identity cover and at the end.

### 5.5 Individual dashboard

Prioritize decisions and trust health over vanity analytics:

1. **Next best action:** finish a missing essential, review a request, renew/revoke access, or update stale information.
2. **Portfolio readiness:** content complete, identity check, preview reviewed, sharing state.
3. **Introduction requests:** pending decisions with source, relationship context, and requested scope.
4. **Active access:** recipient, sections, expiry, last viewed, renew/revoke.
5. **Recent activity:** publish, share, request, approval, use, expiry, revoke.
6. **Performance:** views and engagement remain secondary and should explain limitations.

## 6. Progressive disclosure model

### 6.1 Recipient-facing levels

| Label | Meaning | Typical content | Trigger |
| --- | --- | --- | --- |
| First view | Safe introduction | name, city-level location, story, broad work/education, selected images | share link |
| Mutual view | More context after both sides agree to continue | family summary, practical preferences, expanded gallery | mutual interest recorded |
| Shared details | Owner-selected sensitive bundle | direct contact, detailed family/contact context, selected documents | explicit owner grant |
| Verified exchange | Highest-sensitivity exchange | exact birth details or original horoscope/identity artifacts | defined verification and consent event |

“Verified exchange” must not ship until the trigger is technically and operationally defined. Until then, keep those fields owner-only or include them in an explicit named grant.

### 6.2 Grant card

Every grant shows:

- recipient identity and verification state;
- who initiated the introduction;
- exact section bundle;
- start and expiration date;
- whether download is allowed;
- last access;
- `Change access` and `Revoke now` actions;
- the effect of revocation in plain language.

### 6.3 Safe defaults

- Links expire or can be rotated.
- Protected fields are denied by default.
- A broker can request access but cannot grant on the person's behalf unless a documented mandate explicitly permits it.
- “Anyone with the link” never includes protected details.
- Download and forwarding are treated separately from view access.
- The UI never promises screenshot prevention; it explains recipient accountability and watermarking where used.

## 7. Broker workspace

### 7.1 Information architecture

Primary navigation:

- Home
- People
- Introductions
- Tasks
- Activity
- Access
- Team and settings

Home contains only operational summaries:

- Needs attention
- Awaiting a response
- Follow-ups due
- Active introductions by stage
- Access requests or grants expiring soon

### 7.2 Canonical objects

- **Person:** the individual's canonical identity and portfolio reference.
- **Broker relationship:** the broker/team's mandate, status, assignment, and notes for that person.
- **Introduction:** a relationship between two people with independent decisions from each side.
- **Access grant:** recipient, scope, source, purpose, and expiry.
- **Activity:** append-oriented record of actions and communications.
- **Task:** a future action with owner and due date.

Do not store introduction status or broker notes on the person's identity record.

### 7.3 People list

Default columns: person, relationship state, portfolio readiness, assigned broker, active introductions, last meaningful activity, next task. Allow saved views, but ship useful defaults such as `Needs portfolio review`, `Ready to introduce`, and `No activity in 14 days`.

Selecting a row opens a person record without losing list context.

### 7.4 Person record

Header: name, relationship status, assigned broker, trust/readiness summary, and primary next action.

Tabs:

- Overview
- Timeline
- Portfolio and access
- Introductions
- Notes
- Tasks

The overview uses cards for key facts and linked relationships. The timeline filters by communication, status, disclosure, and system events. Notes require an audience: `Private to me`, `Broker team`, or `Visible to represented person`.

### 7.5 Introduction workflow

Recommended human-facing stages:

1. Draft
2. Ready to share
3. Waiting for first response
4. Waiting for second response
5. Mutual interest
6. More information requested
7. Closed

The creation flow is a short wizard:

1. Choose both people.
2. Show relationship/mandate eligibility and conflicts.
3. Preview exactly what each side receives.
4. Choose channel and responsible broker.
5. Confirm; write a durable activity event.

Each side's response remains independent. A summary status can be derived for the board, but must not erase the two source decisions.

### 7.6 Broker permissions

Model permission as capability × data scope:

- Capability: view, add notes, manage tasks, create introduction, request disclosure, manage team.
- Scope: assigned people, one team, or whole organization.

Suggested presets:

- Coordinator: assigned people and task/introduction operations.
- Senior broker: team people, introduction, and disclosure requests.
- Administrator: organization settings and membership.
- Auditor: read-only activity and access history.

Preview each role before assignment and surface exceptions. Sensitive identity data remains governed by individual grants, not just organization role.

## 8. Multi-generation usability

The same content must work for digitally fluent adults aged 25–35 and family reviewers aged 40–70.

- Use literal navigation labels; pair icons with text.
- Keep one obvious primary action per region.
- Preserve a visible Back action and page title.
- Avoid custom dropdowns and sliders for ordinary choices.
- Use radio cards for two to four consequential options.
- Use checkboxes for independent choices, never to imitate navigation.
- Provide 44–48 px targets and generous row spacing.
- Never require hover to understand a control.
- Use absolute dates with helpful relative context: `4 Sep 2026 · 2 days ago`.
- Offer a clean print/PDF summary for family review without treating exported files as the source of truth.
- Offer a WhatsApp-friendly link action with a preview of what the recipient will see.
- Use a review mode with section comments, resolved status, and author identity rather than freeform parallel document edits.
- Test at 200% zoom, keyboard-only, screen reader landmarks, reduced motion, and narrow mobile widths.

References: [W3C guidance on older users](https://www.w3.org/WAI/older-users/developing/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), and [Nielsen Norman Group research on senior users](https://www.nngroup.com/reports/senior-citizens-on-the-web/).

## 9. Current product audit

### What is already strong

- The landing and portfolio direction feels dignified, calm, and clearly differentiated from dating products.
- Cream surfaces, dark ink, teal, and restrained gold communicate warmth without visual sentimentality.
- The portfolio form already separates optional family, lifestyle, preferences, and astrology content.
- The dashboard already includes interest decisions, time-limited Full View access, renewal, revocation, and access history.
- The account area exposes export, session revocation, and deletion rather than hiding privacy controls.

### Highest-priority issues

#### P0 — public reliability and accessibility

- Auth styles were not reliably included in the rendered CSS bundle, causing unusable sign-in/sign-up layouts and an oversized provider icon. Auth now has a colocated stylesheet; retain visual regression coverage.
- The landing page rendered two `Skip to main content` links. Keep only the root-layout link.

#### P1 — trust and navigation

- Mobile navigation hid `Sign in`; keep it visible alongside `Create portfolio`.
- `Balanced`, `Private`, and `Full View` describe system modes, not the relationship or content being revealed. Migrate toward recipient-view labels and named section bundles.
- `Identity Verified` lacks visible scope, provider, and date. Add verification detail and a boundary statement.
- The large global stylesheet contains multiple product surfaces and overrides. Extract landing, auth, dashboard, editor, portfolio, and legal/account styling into clear ownership boundaries.

#### P1 — missing broker product

- There is no broker UI route or component system yet.
- Existing B2C/B2B2C database primitives and the newer broker architecture baseline are not fully aligned. Resolve domain decisions before binding production UI to final statuses or commands.

#### P2 — information architecture and language

- The dashboard should lead with decisions and expiring access rather than portfolio views.
- Long portfolios need a sticky/jump section index and progressive detail on mobile.
- Product copy alternates between `wedding portfolio`, `marriage portfolio`, and a wider trust-platform concept. Standardize on `personal portfolio for introductions`; use `marriage portfolio` only where audience clarity requires it.
- Testimonials or success figures must be real and sourced, or visibly labeled as illustrative.

## 10. Screen-level component inventory

Build shared trust primitives before separate B2B/B2C variants:

- `IdentitySummary`
- `VerificationDetail`
- `ProvenanceLabel`
- `VisibilityChip`
- `RecipientPreview`
- `DisclosureBundle`
- `AccessGrantCard`
- `RelationshipPath`
- `ActivityTimeline`
- `StatusPill`
- `DecisionPair`
- `ReviewComment`
- `ConfirmationSheet`
- `EmptyState`

Product shells:

- Public: `PortfolioReader`, `SectionIndex`, `ProtectedSection`, `InterestRequest`.
- Individual: `IndividualHome`, `PortfolioEditor`, `AccessCenter`, `ReviewMode`.
- Broker: `BrokerShell`, `PeopleTable`, `PersonRecord`, `IntroductionBoard`, `IntroductionWizard`.

## 11. Delivery sequence

### Phase 0 — reliability baseline

- Finish stylesheet ownership cleanup.
- Add desktop/mobile visual smoke tests for landing, sign in, sign up, editor, dashboard, and portfolio.
- Validate keyboard order, landmarks, errors, zoom, and touch targets.

### Phase 1 — trust foundation

- Introduce semantic tokens and shared trust components.
- Replace ambiguous verification badges with scoped verification detail.
- Build recipient preview and a unified Access center.
- Add disclosure bundle, purpose, expiration, and provenance to the user-facing model.

### Phase 2 — individual journey

- Simplify the landing page around privacy and one product proof.
- Restructure onboarding and profile reading order.
- Add collaborative review and family-friendly share/print affordances.
- Refocus the dashboard on next actions, requests, and access.

### Phase 3 — broker workspace foundation

- Resolve the open architecture decisions that affect lifecycle, uniqueness, and verified disclosure.
- Implement the canonical objects and authorization checks.
- Ship People list and Person record first.
- Add the introduction wizard, board/list workflow, activity timeline, and tasks.
- Add roles, data scopes, audit surfaces, and person-controlled disclosure requests.

### Phase 4 — validation

- Moderated mobile/desktop sessions with users aged 25–35.
- Moderated review sessions with family members aged 40–70.
- Broker usability sessions covering ten-person and hundred-person books.
- Test understanding of verification, hidden information, approval, expiration, and revocation without facilitator explanation.

## 12. Acceptance criteria

- A first-time viewer can explain what is verified and what is self-reported after viewing one profile.
- A portfolio owner can predict exactly what a named recipient will see before sharing.
- A portfolio owner can find and revoke a grant in under 30 seconds.
- A family reviewer can navigate and comment at 200% zoom without hidden gestures.
- Protected details never appear in the first-link view.
- Every broker action that changes an introduction or access state records actor, time, source object, and reason where appropriate.
- A broker can locate a person, understand relationship context, identify the next action, and start an eligible introduction without leaving the person record.
- Person, broker relationship, introduction, and access grant remain separate concepts in both UI and data model.
- Desktop and 390 px mobile layouts pass visual regression checks for all public and account-entry pages.

## 13. Architecture guardrail

The attached final baseline is an approved architectural direction, but its own open-decision section still leaves relationship counting, grace-period behavior, terminal response/reopen rules, introduction uniqueness, index-repair strategy, and the verified-disclosure trigger unresolved. Broker UI labels and actions that depend on those decisions should remain prototypes until the domain contracts are settled. The repository's existing organization/broker-client schema must be reconciled with the newer relationship/introduction model before implementation.

