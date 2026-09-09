import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrokerdeskReauthPurpose } from "./brokerdesk-reauth.contract";

/** Keeps privileged BrokerDesk reauthentication persistence server-only. */
export class BrokerdeskReauthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  start(workspaceRef: string, purpose: BrokerdeskReauthPurpose, sessionId: string) {
    return this.supabase.rpc("start_brokerdesk_action_reauth", {
      p_initiating_session_id: sessionId,
      p_purpose: purpose,
      p_workspace_ref: workspaceRef,
    });
  }

  complete(challengeId: string, proofHash: string) {
    return this.supabase.rpc("complete_brokerdesk_action_reauth", {
      p_challenge_id: challengeId,
      p_proof_hash: proofHash,
    });
  }
}
