import "server-only";

/**
 * Builds the canonical external URL for one portfolio token.
 * Input: a non-empty share token. Output: an absolute portfolio URL using the configured app origin.
 */
export function createShareUrl(shareToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new URL(`/p/${shareToken}`, appUrl).toString();
}
