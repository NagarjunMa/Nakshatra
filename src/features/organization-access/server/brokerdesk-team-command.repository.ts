import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MutableTeamRolePreset } from "./brokerdesk-team-command.contract";

export class BrokerdeskTeamCommandRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  replaceAccess(input: { workspaceRef: string; memberRef: string; rolePreset: MutableTeamRolePreset; proofHash: string; idempotencyKey: string }) {
    return this.supabase.rpc("replace_brokerdesk_team_member_access", {
      p_workspace_ref: input.workspaceRef,
      p_member_ref: input.memberRef,
      p_role_preset: input.rolePreset,
      p_proof_hash: input.proofHash,
      p_idempotency_key: input.idempotencyKey,
    });
  }

  suspend(input: { workspaceRef: string; memberRef: string; proofHash: string; idempotencyKey: string }) {
    return this.supabase.rpc("suspend_brokerdesk_team_member", {
      p_workspace_ref: input.workspaceRef,
      p_member_ref: input.memberRef,
      p_proof_hash: input.proofHash,
      p_idempotency_key: input.idempotencyKey,
    });
  }
}
