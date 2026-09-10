import "server-only";

import { createHash, createHmac } from "node:crypto";
import { getBrokerdeskInvitationTokenSecret } from "@/lib/env";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashInvitationEmail(email: string) {
  return createHash("sha256").update(normalizeInvitationEmail(email), "utf8").digest("hex");
}

export function invitationEmailHint(email: string) {
  const normalized = normalizeInvitationEmail(email);
  const [local, domain] = normalized.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/** Deterministic per command so a safe idempotent retry recreates the same raw token. */
export function deriveTeamInvitationToken(input: {
  actorUserId: string;
  workspaceRef: string;
  email: string;
  rolePreset: string;
  idempotencyKey: string;
}) {
  return createHmac("sha256", getBrokerdeskInvitationTokenSecret())
    .update("brokerdesk-team-invitation.v1\0")
    .update(input.actorUserId)
    .update("\0")
    .update(input.workspaceRef)
    .update("\0")
    .update(normalizeInvitationEmail(input.email))
    .update("\0")
    .update(input.rolePreset)
    .update("\0")
    .update(input.idempotencyKey)
    .digest("base64url");
}

export function hashTeamInvitationToken(token: string) {
  if (!tokenPattern.test(token)) throw new Error("BROKERDESK_INVITATION_TOKEN_INVALID");
  return createHash("sha256").update(token).digest("hex");
}

export function isTeamInvitationToken(token: string) {
  return tokenPattern.test(token);
}
