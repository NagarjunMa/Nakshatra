# Phase 3 Security Boundaries

This document records the application controls introduced before public beta and the provider or operational controls that remain outside the repository.

## Request boundaries

- Every cookie-authenticated mutation requires an exact `Origin` match. A contradictory `Sec-Fetch-Site` value is rejected.
- JSON and multipart bodies are streamed into bounded buffers before parsing. Photo and horoscope form limits include only a small multipart allowance above the accepted file size.
- OAuth and magic-link requests start through `/api/auth/start`. Redirects accept only local application paths and absolute callbacks use `NEXT_PUBLIC_APP_URL` in production.
- User-supplied portfolio links accept only `https:` URLs.
- Public errors use stable codes and application-authored messages. Server logs contain an event, correlation ID, and error type only.

## Abuse controls

The application consumes fixed, database-backed quotas for auth starts, interest submission and decisions, grant management, dashboard saves, uploads, publishing, renewal, rotation, unpublish, private horoscope views, and location lookup. Anonymous subjects are SHA-256 fingerprints of trusted hosting-proxy network hints and user agent; raw IP addresses are never persisted. Authenticated quotas always bind to `auth.uid()` in the database, ignoring caller-supplied hashes.

These quotas are defense in depth. Supabase Auth provider limits remain the primary control on direct Auth API requests. CAPTCHA, exact production Auth limits, and trusted proxy configuration must be verified in the Supabase and hosting dashboards before public beta.

Interest submission, access decisions, publication lifecycle commands, and portfolio-view analytics retain their database duplicate/idempotency controls. The application rate limit does not replace those transactional constraints.

## File handling

- Profile photos accept JPEG, PNG, WebP, HEIC, and HEIF only. Sharp verifies decoded format, dimensions, pixel count, frame count, channels, and processing timeout before producing metadata-free WebP derivatives.
- New horoscope uploads are scanned images only. PDF, DOC, and DOCX containers are rejected until an isolated malware scanning or content-disarm pipeline exists. Accepted images are decoded and re-encoded as metadata-free WebP.
- Upload failure removes every known newly created object. A database-save failure removes the uploaded object before returning failure.
- Horoscope replacement saves the new safe object and row before deleting the previous object. If previous-object deletion fails, the previous row is restored and the new object is removed.
- Deletion revokes the database row first. If Storage deletion then fails, access remains revoked and the API reports that cleanup is pending. A production maintenance runbook must periodically identify and delete bucket objects that have no database row.

## Browser and capability controls

- CSP, frame protection, MIME-sniffing protection, Referrer-Policy, Permissions-Policy, cross-origin policies, and production HSTS are configured in `next.config.ts`.
- API, dashboard, preview, approved preview, and portfolio responses use `private, no-store` and vary on cookie and authorization state.
- Approved photo and horoscope signed URLs are capped at five minutes and are shortened further when the authorizing grant expires sooner.
- Approved resolvers expose grant expiry with the authorized projection. New approved horoscope access is limited to sanitized WebP images.
- The global error boundary never renders raw exception messages.

## Deployment checks

Before public beta, verify response headers at the deployed domain, enable and test CAPTCHA, confirm Supabase Auth quotas, exercise signed URL expiry against the linked project, and run the orphan-object cleanup procedure in report-only mode.
