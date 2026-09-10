import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { replacedTeamMemberAccessSchema, suspendedTeamMemberSchema, type MutableTeamRolePreset } from "./brokerdesk-team-command.contract";
import { BrokerdeskTeamCommandRepository } from "./brokerdesk-team-command.repository";

export class BrokerdeskTeamCommandError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message); }
}

function commandError(error: { code?: string } | null, invalidMessage: string): never {
  if (error?.code === "22023") throw new BrokerdeskTeamCommandError(invalidMessage, "BROKERDESK_TEAM_COMMAND_INVALID", 400);
  if (error?.code === "42501") throw new BrokerdeskTeamCommandError("This team change is not allowed.", "BROKERDESK_TEAM_COMMAND_FORBIDDEN", 403);
  throw new BrokerdeskTeamCommandError("The team change could not be saved.", "BROKERDESK_TEAM_COMMAND_UNAVAILABLE", 503);
}

export async function replaceBrokerdeskTeamMemberAccess(supabase: SupabaseClient, input: {
  workspaceRef: string; memberRef: string; rolePreset: MutableTeamRolePreset; proofHash: string; idempotencyKey: string;
}) {
  const { data, error } = await new BrokerdeskTeamCommandRepository(supabase).replaceAccess(input);
  const parsed = replacedTeamMemberAccessSchema.safeParse(data);
  if (error || !parsed.success) commandError(error, "Choose a valid employee role and try again.");
  return parsed.data;
}

export async function suspendBrokerdeskTeamMember(supabase: SupabaseClient, input: {
  workspaceRef: string; memberRef: string; proofHash: string; idempotencyKey: string;
}) {
  const { data, error } = await new BrokerdeskTeamCommandRepository(supabase).suspend(input);
  const parsed = suspendedTeamMemberSchema.safeParse(data);
  if (error || !parsed.success) commandError(error, "Check the employee and try again.");
  return parsed.data;
}
