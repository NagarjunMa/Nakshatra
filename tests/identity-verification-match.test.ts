import { describe, expect, it } from "vitest";
import {
  hashIdentityBirthDate,
  matchesIdentityBirthDate,
} from "../src/features/identity-verification/server/identity-match.mjs";

describe("identity verification private matching", () => {
  const key = "test-identity-verification-match-key-at-least-32-characters";

  it("creates a purpose-bound deterministic digest without retaining the date", () => {
    const digest = hashIdentityBirthDate("1985-05-12", key);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain("1985-05-12");
    expect(matchesIdentityBirthDate("1985-05-12", digest, key)).toBe(true);
    expect(matchesIdentityBirthDate("1985-05-13", digest, key)).toBe(false);
  });

  it("fails closed for malformed dates, digests, and short keys", () => {
    expect(() => hashIdentityBirthDate("not-a-date", key)).toThrow("IDENTITY_MATCH_KEY_UNAVAILABLE");
    expect(() => hashIdentityBirthDate("1985-05-12", "short")).toThrow("IDENTITY_MATCH_KEY_UNAVAILABLE");
    expect(matchesIdentityBirthDate("1985-05-12", "bad", key)).toBe(false);
  });
});
