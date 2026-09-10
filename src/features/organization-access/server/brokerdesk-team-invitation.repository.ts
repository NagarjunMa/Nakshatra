import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvitedRolePreset } from "./brokerdesk-team-invitation.contract";

export class BrokerdeskTeamInvitationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  create(input: {
    workspaceRef: string;
    rolePreset: InvitedRolePreset;
    emailHash: string;
    emailHint: string;
    tokenHash: string;
    proofHash: string;
    idempotencyKey: string;
  }) {
    return this.supabase.rpc("create_brokerdesk_team_invitation", {
      p_workspace_ref: input.workspaceRef,
      p_role_preset: input.rolePreset,
      p_email_hash: input.emailHash,
      p_email_hint: input.emailHint,
      p_token_hash: input.tokenHash,
      p_proof_hash: input.proofHash,
      p_idempotency_key: input.idempotencyKey,
    });
  }

  accept(tokenHash: string) {
    return this.supabase.rpc("accept_brokerdesk_team_invitation", { p_token_hash: tokenHash });
  }
}
