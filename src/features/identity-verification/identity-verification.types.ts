export const identityVerificationStatuses = [
  "pending",
  "verified",
  "failed",
  "expired",
  "revoked",
] as const;

export type IdentityVerificationStatus = (typeof identityVerificationStatuses)[number];

export type PublicIdentityVerificationBadge = {
  badge: "identity_verified";
  verifiedUntil: string;
  reverificationGraceUntil: string;
} | null;

/** Treats the verification indicator as invalid once the verification itself expires. */
export function isCurrentIdentityVerificationBadge(
  badge: PublicIdentityVerificationBadge,
  now = new Date()
) {
  return badge !== null && new Date(badge.verifiedUntil).getTime() > now.getTime();
}
