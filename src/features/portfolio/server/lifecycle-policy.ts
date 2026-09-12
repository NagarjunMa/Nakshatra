import "server-only";

export const PUBLIC_PORTFOLIO_LIFETIME_DAYS = 30;
export const FULL_VIEW_LIFETIME_DAYS = 7;

/** Returns the canonical public-link expiry used for first publication, republish, and renewal. */
export function createPublicPortfolioExpiry(now = new Date()) {
  const expiry = new Date(now);
  expiry.setUTCDate(expiry.getUTCDate() + PUBLIC_PORTFOLIO_LIFETIME_DAYS);
  return expiry.toISOString();
}

/** Preserves a still-active publication while resetting missing or expired publication windows. */
export function resolvePublicationExpiry(
  currentExpiry: string | null | undefined,
  isPublished: boolean,
  now = new Date()
) {
  if (isPublished && currentExpiry && Date.parse(currentExpiry) > now.getTime()) {
    return currentExpiry;
  }
  return createPublicPortfolioExpiry(now);
}
