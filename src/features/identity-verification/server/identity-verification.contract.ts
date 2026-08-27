import "server-only";

import { z } from "zod/v4";

export const identityVerificationStatusSchema = z.enum([
  "pending",
  "verified",
  "failed",
  "expired",
  "revoked",
]);

/** The only identity-verification state that may cross into a public snapshot. */
export const publicIdentityVerificationBadgeSchema = z.object({
  badge: z.literal("identity_verified"),
  verifiedUntil: z.iso.datetime(),
  reverificationGraceUntil: z.iso.datetime(),
}).strict().nullable();

export type IdentityVerificationStatus = z.infer<typeof identityVerificationStatusSchema>;
export type PublicIdentityVerificationBadge = z.infer<typeof publicIdentityVerificationBadgeSchema>;
