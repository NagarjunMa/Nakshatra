import "server-only";

const bearerTokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** Creates a 256-bit URL-safe bearer credential; only its SHA-256 hash is persisted. */
export function createIdentityVerificationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

/** Rejects malformed bearer credentials before hashing or accessing the database. */
export function isIdentityVerificationToken(value: string) {
  return bearerTokenPattern.test(value);
}

/** Produces the fixed-length hash accepted by private invitation and management-token storage. */
export async function hashIdentityVerificationToken(value: string) {
  if (!isIdentityVerificationToken(value)) throw new Error("IDENTITY_VERIFICATION_TOKEN_INVALID");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
