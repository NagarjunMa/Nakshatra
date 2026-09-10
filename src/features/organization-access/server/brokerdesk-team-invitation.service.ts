import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  acceptedTeamInvitationSchema,
  createdTeamInvitationSchema,
  type InvitedRolePreset,
} from "./brokerdesk-team-invitation.contract";
import { BrokerdeskTeamInvitationRepository } from "./brokerdesk-team-invitation.repository";

export class BrokerdeskTeamInvitationError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message); }
}

export async function createBrokerdeskTeamInvitation(supabase: SupabaseClient, input: {
  workspaceRef: string;
  rolePreset: InvitedRolePreset;
  emailHash: string;
  emailHint: string;
  tokenHash: string;
  proofHash: string;
  idempotencyKey: string;
}) {
  const { data, error } = await new BrokerdeskTeamInvitationRepository(supabase).create(input);
  const parsed = createdTeamInvitationSchema.safeParse(data);
  if (error?.code === "42501") {
    throw new BrokerdeskTeamInvitationError("This invitation is not allowed.", "BROKERDESK_TEAM_INVITATION_FORBIDDEN", 403);
  }
  if (error?.code === "22023") {
    throw new BrokerdeskTeamInvitationError("Check the invitation details and try again.", "BROKERDESK_TEAM_INVITATION_INVALID", 400);
  }
  if (error || !parsed.success) {
    throw new BrokerdeskTeamInvitationError("The invitation could not be created.", "BROKERDESK_TEAM_INVITATION_UNAVAILABLE", 503);
  }
  return parsed.data;
}

export async function acceptBrokerdeskTeamInvitation(supabase: SupabaseClient, tokenHash: string) {
  const { data, error } = await new BrokerdeskTeamInvitationRepository(supabase).accept(tokenHash);
  const parsed = acceptedTeamInvitationSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new BrokerdeskTeamInvitationError("The invitation is unavailable.", "BROKERDESK_TEAM_INVITATION_UNAVAILABLE", 403);
  }
  return parsed.data;
}
