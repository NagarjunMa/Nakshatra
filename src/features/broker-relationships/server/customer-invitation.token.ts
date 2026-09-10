import "server-only";

import { createHash, createHmac } from "node:crypto";
import { getBrokerdeskInvitationTokenSecret } from "@/lib/env";
import { normalizeInvitationEmail } from "@/features/organization-access/server/brokerdesk-team-invitation.token";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** Deterministic per command so an idempotent retry returns the same capability. */
export function deriveCustomerInvitationToken(input: {
  actorUserId: string;
  workspaceRef: string;
  email: string;
  idempotencyKey: string;
}) {
  return createHmac("sha256", getBrokerdeskInvitationTokenSecret())
    .update("brokerdesk-customer-invitation.v1\0")
    .update(input.actorUserId)
    .update("\0")
    .update(input.workspaceRef)
    .update("\0")
    .update(normalizeInvitationEmail(input.email))
    .update("\0")
    .update(input.idempotencyKey)
    .digest("base64url");
}

export function hashCustomerInvitationToken(token: string) {
  if (!tokenPattern.test(token)) throw new Error("BROKERDESK_CUSTOMER_INVITATION_TOKEN_INVALID");
  return createHash("sha256").update(token).digest("hex");
}

export function isCustomerInvitationToken(token: string) {
  return tokenPattern.test(token);
}

