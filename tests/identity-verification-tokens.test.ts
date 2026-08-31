import { describe, expect, it } from "vitest";
import {
  createIdentityVerificationToken,
  hashIdentityVerificationToken,
  isIdentityVerificationToken,
} from "@/features/identity-verification/server/identity-verification.tokens";

describe("identity verification bearer tokens", () => {
  it("creates 256-bit URL-safe tokens and persists only a fixed SHA-256 hash", async () => {
    const token = createIdentityVerificationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isIdentityVerificationToken(token)).toBe(true);
    await expect(hashIdentityVerificationToken(token)).resolves.toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects malformed values before database access", async () => {
    expect(isIdentityVerificationToken("short")).toBe(false);
    expect(isIdentityVerificationToken("x".repeat(44))).toBe(false);
    await expect(hashIdentityVerificationToken("short")).rejects.toThrow("IDENTITY_VERIFICATION_TOKEN_INVALID");
  });
});
