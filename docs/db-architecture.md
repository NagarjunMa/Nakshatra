# Nakshatra Database Architecture

This document explains the additive database foundation introduced in
`supabase/migrations/004_b2c_b2b2c_architecture.sql`.

The current app still works through the original `portfolios` table. The new
schema adds the long-term product primitives around it so B2C can ship first
and B2B2C can grow without a rewrite.

## Product Loop

The B2C loop is:

```text
Signup -> Create portfolio -> Publish link -> Frictionless viewing
  -> Express interest -> Controlled reveal
```

The B2B2C loop extends the same foundation:

```text
Candidate -> Broker/family/self representation -> Tracked share link
  -> Frictionless view -> Interest request -> Attribution lock
  -> Reveal/contact workflow
```

## Current Compatibility

The migration is additive:

- Existing `portfolios` rows remain valid.
- Existing `/edit`, `/dashboard`, `/preview`, and `/p/[token]` flows can keep
  reading and writing `portfolios.draft_data` and `portfolios.published_data`.
- Existing `portfolio_views` continues to work.
- New code can gradually move toward candidates, portfolio versions, tracked
  links, interest requests, and reveal grants.

## Core Domains

### Identity And Ownership

`user_profiles` stores app-level user profile metadata for Supabase users.

`organizations` and `organization_members` support family workspaces,
matchmaker agencies, and the future platform/admin workspace.

`matchmaker_profiles` is the public/business-facing broker profile attached to
a matchmaker agency organization.

### Candidate Source Of Truth

`candidates` represents the person whose matrimonial portfolio is being
created. This is intentionally separate from `auth.users`, because a candidate
may be managed by themselves, a parent, or a broker.

Structured candidate tables hold the high-value fields that should eventually
be searchable, filterable, or monetizable:

- `candidate_personal_details`
- `candidate_astrology_details`
- `candidate_family_members`
- `candidate_education_entries`
- `candidate_career_entries`
- `candidate_lifestyle_details`
- `candidate_partner_preferences`

Use `jsonb` payloads inside these tables for flexible template-specific data,
but promote important marketplace/search fields into columns.

### Portfolio And Template Content

The existing `portfolios` table now has optional links to:

- `candidate_id`
- `owner_organization_id`
- `public_slug`
- `privacy_mode`
- `visibility_settings`

`portfolio_versions` supports draft/published versioning beyond the original
single JSON snapshot.

`portfolio_sections` stores modular template sections such as hero, family,
gallery, horoscope, and preferences.

`portfolio_media` stores hero photos, gallery images, family images, horoscope
documents, and verification assets.

`visibility_rules` determines whether a section is public, blurred,
interest-required, approval-only, owner-only, or hidden.

### Frictionless Viewing And Silent Tracking

`portfolio_links` is the attribution moat. A portfolio can have many tracked
links, each tied to a broker, organization, channel, or campaign.

For example:

```text
/s/{portfolio_links.token}
/p/rahul-g?ref={portfolio_links.token}
```

`viewer_sessions` captures a privacy-conscious anonymous viewing session.

`portfolio_events` captures product events such as:

- `view`
- `section_view`
- `gallery_click`
- `express_interest_click`
- `contact_reveal`

Do not add login or OTP to the default viewer path. Tracking should happen
silently in the background.

### Express Interest And Controlled Reveal

`interest_requests` is the handshake table. Public viewers submit interest here
instead of seeing raw phone/email by default.

Important fields:

- `portfolio_link_id`: the link that produced the interest.
- `referring_organization_id`: the broker/family organization that shared it.
- `referring_matchmaker_profile_id`: the specific broker attribution.
- `prospect_key_hash`: a privacy-conscious dedupe key for the interested
  prospect or family.
- `attribution_status`: original, duplicate, conflict, or unattributed.

`attribution_records` locks the first valid broker attribution for a
candidate/prospect pair. Later duplicate interests through another broker link
can be marked as conflicts without blocking the viewer.

`reveal_grants` controls what gets unlocked after interest:

- contact details
- private gallery
- detailed horoscope
- family business details
- custom sections

### Monetization

`plans`, `subscriptions`, `entitlements`, and `purchases` support B2C and B2B
pricing.

`verifications` supports paid trust badges:

- identity
- education
- immigration
- employment

### Identity Verification Perimeter

Didit identity verification is not stored in `public.verifications`. The Phase
1 normalized model is held in `app_private`: one random provider subject per
candidate, short-lived token hashes, attempts with no evidence payloads,
webhook event digests, and leased worker state. These tables have no `anon` or
ordinary `authenticated` grants.

`public_portfolio_snapshots` can contain only a derived
`identity_verified` badge, its verification expiry, and a 30-day
reverification-grace deadline. It never contains a provider reference,
document country/type, consent version, attempt ID, token, or webhook data.
The database prevents first publication unless the linked candidate has a
current normalized identity verification.

`compatibility_reports` supports paid astrology compatibility reports tied to
an interest request.

### B2B2C Marketplace

`marketplace_listings` lets a B2C user publish an anonymized candidate snapshot
to a future matchmaker load-board.

`lead_claims` lets verified matchmakers request, pay for, and claim those
candidate leads.

## Recommended Development Order

1. Keep the existing portfolio builder working.
2. On signup, create `user_profiles` and optionally a `candidates` row.
3. Attach new portfolios to `candidate_id` while still filling the original
   `draft_data` and `published_data`.
4. Add `portfolio_links` and route new share URLs through tracked links.
5. Add `interest_requests` behind the "Express Interest Securely" button.
6. Add `visibility_rules` and `reveal_grants` for progressive disclosure.
7. Add `viewer_sessions` and `portfolio_events` analytics.
8. Add broker organizations and `broker_clients`.
9. Add attribution conflict logic.
10. Add verifications, compatibility reports, and marketplace lead claims.

## Privacy Defaults

Use these defaults unless product direction changes:

- Public portfolio viewing should remain frictionless.
- Contact details should not be public by default.
- Private gallery and deep horoscope data should be interest-required or
  approval-only.
- Raw IP addresses should not be stored. Store salted hashes if needed.
- Broker attribution should be invisible to prospects.
- Marketplace listings should use anonymized snapshots, not full profiles.

## Notes For Future Developers

The current frontend renders from `portfolios.published_data`. That is fine for
the first B2C POC. As the template builder matures, new code can either:

- continue publishing a composed JSON snapshot into `portfolio_versions`, or
- render from normalized section/detail tables and cache a public snapshot.

The safest path is hybrid:

1. Normalize important fields for search, attribution, reporting, and paid
   features.
2. Publish a curated JSON snapshot for fast, stable public rendering.
