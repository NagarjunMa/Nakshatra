import { createHmac, timingSafeEqual } from "node:crypto";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const CONTEXT = "nakshatra.identity-birth-date-match.v1";

function validKey(key) {
  return typeof key === "string" && key.length >= 32;
}

/** Creates a non-reversible, purpose-bound comparison value for a birth date. */
export function hashIdentityBirthDate(birthDate, key) {
  if (!DATE_PATTERN.test(birthDate) || !validKey(key)) {
    throw new Error("IDENTITY_MATCH_KEY_UNAVAILABLE");
  }
  return createHmac("sha256", key).update(`${CONTEXT}:${birthDate}`, "utf8").digest("hex");
}

/** Compares a provider birth date without persisting the representative's raw date. */
export function matchesIdentityBirthDate(birthDate, expectedDigest, key) {
  if (!DATE_PATTERN.test(birthDate) || !DIGEST_PATTERN.test(expectedDigest) || !validKey(key)) {
    return false;
  }
  const expected = Buffer.from(expectedDigest, "hex");
  const actual = Buffer.from(hashIdentityBirthDate(birthDate, key), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
