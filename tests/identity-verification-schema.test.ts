import { describe, expect, it } from "vitest";
import {
  identityVerificationStatuses,
  isCurrentIdentityVerificationBadge,
} from "@/features/identity-verification/identity-verification.types";
import {
  identityVerificationStatusSchema,
  publicIdentityVerificationBadgeSchema,
} from "@/features/identity-verification/server/identity-verification.contract";

describe("identity verification contract", () => {
  it("keeps the normalized lifecycle closed and includes revocation", () => {
    expect(identityVerificationStatuses).toEqual(["pending", "verified", "failed", "expired", "revoked"]);
    expect(identityVerificationStatusSchema.safeParse("revoked").success).toBe(true);
    expect(identityVerificationStatusSchema.safeParse("provider_payload").success).toBe(false);
  });

  it("accepts only safe public badge fields", () => {
    const badge = {
      badge: "identity_verified" as const,
      verifiedUntil: "2027-08-27T00:00:00.000Z",
      reverificationGraceUntil: "2027-09-26T00:00:00.000Z",
    };

    expect(publicIdentityVerificationBadgeSchema.safeParse(badge).success).toBe(true);
    expect(isCurrentIdentityVerificationBadge(badge, new Date("2027-08-26T00:00:00.000Z"))).toBe(true);
    expect(isCurrentIdentityVerificationBadge(badge, new Date("2027-08-28T00:00:00.000Z"))).toBe(false);
    expect(publicIdentityVerificationBadgeSchema.safeParse({ ...badge, providerSessionRef: "private" }).success).toBe(false);
  });
});
