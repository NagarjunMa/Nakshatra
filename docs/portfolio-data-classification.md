# Portfolio Data Classification

This classification governs every portfolio projection and is enforced by the
snapshot builders, token-scoped database functions, RLS, and Storage policies.

| Class | Examples | Public link | Approved viewer | Owner |
|---|---|---:|---:|---:|
| Public presentation | Published display name, age, selected biography, rashi, selected career/education/lifestyle fields, theme | Yes, from the sanitized snapshot only | Yes | Yes |
| Public media | The single public hero and owner-selected public gallery presentation | Temporary URL | Temporary URL | Yes |
| Protected preview | Generated low-detail derivative for blurred or approval-only photos | Temporary preview URL only | Original temporary URL | Yes |
| Restricted identity | Exact date/time/place of birth, detailed astrology, immigration and location reference IDs | No | Yes when included in the approved snapshot | Yes |
| Restricted family | Family-member names, occupations, locations, family notes | No | Yes when included in the approved snapshot | Yes |
| Restricted contact | Contact names, phone numbers, email addresses, secure notes | No | No in v1 | Yes |
| Restricted financial/internal | Income, wealth stage, credit data, private preference notes, attribution metadata | No | No | Yes |
| Private storage metadata | Original protected paths, thumbnails, database UUIDs, horoscope paths | No | Only the minimum path needed after an active identity-bound grant | Yes |

## Disclosure Rules

1. Publishing is explicit and the dashboard preview renders the exact sanitized
   payload before it is copied into `public_portfolio_snapshots`.
2. A public URL resolves one exact active token through
   `resolve_public_portfolio`; callers cannot select or list snapshot rows.
3. Restricted values are omitted, not visually hidden. The public snapshot
   never stores contact data, private media paths, signed URLs, database IDs, or
   horoscope descriptors.
4. Approved data uses a separate snapshot and a separate authenticated resolver.
   Access requires an active, identity-bound full grant on every request.
5. Signed media URLs are short-lived. A private-mode gallery exposes only its
   first public gallery original; every later item uses a generated derivative.
6. Missing, malformed, expired, rotated, and unpublished links all resolve to
   the same unavailable result.

## Full View Lifecycle

1. A viewer must sign in before submitting an access request. Requests are
   permanently bound to that verified Supabase user ID.
2. Owners may approve or reject a new request. A rejected request must be
   explicitly reopened before it can be approved later.
3. Full View grants expire after 30 days. Owners can renew an active or expired
   grant for another 30 days, or revoke it immediately.
4. Rotating a link or unpublishing a portfolio revokes every active grant and
   closes its approved requests. Republishing requires a fresh request and
   approval; ordinary published-data updates preserve still-valid grants.
5. Portfolio expiry blocks public and approved access. Renewing the portfolio
   link restores access only for grants that are themselves still active.
6. Full View includes the approved identity, astrology, family, education,
   career, lifestyle, preference, photo-original, and horoscope projections.
   Contact details, secure notes, credit/internal values, and private
   preference notes remain owner-only.
7. Grant creation, renewal, use, rejection, revocation, expiry, rotation, and
   unpublish events are immutable and contain no request message, contact data,
   share token, signed URL, or storage path.
