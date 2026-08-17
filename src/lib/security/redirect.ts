const DEFAULT_AUTH_REDIRECT = "/dashboard";

/** Returns a same-origin application path and rejects absolute, protocol-relative, and malformed redirects. */
export function sanitizeInternalRedirect(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT
) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const base = new URL("https://nakshatra.invalid");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin || resolved.username || resolved.password) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

/** Builds an absolute application URL from the configured production origin or the current local origin. */
export function createCanonicalAppUrl(path: string, requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const origin = configured ? new URL(configured).origin : requestOrigin;
  return new URL(sanitizeInternalRedirect(path), origin).toString();
}
