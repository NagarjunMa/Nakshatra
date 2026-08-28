import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Keeps account privacy queries behind one server-only data-access boundary. */
export class AccountRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  exportAccount() {
    return this.supabase.rpc("export_my_account_data");
  }

  requestDeletion() {
    return this.supabase.rpc("request_account_deletion");
  }

  startDeletionReauth(sessionId: string) {
    return this.supabase.rpc("start_account_deletion_reauth", { p_initiating_session_id: sessionId });
  }

  completeDeletionReauth(challengeId: string, proofHash: string) {
    return this.supabase.rpc("complete_account_deletion_reauth", {
      p_challenge_id: challengeId,
      p_proof_hash: proofHash,
    });
  }

  consumeDeletionReauth(proofHash: string) {
    return this.supabase.rpc("consume_account_deletion_reauth", { p_proof_hash: proofHash });
  }

  cancelDeletion() {
    return this.supabase.rpc("cancel_account_deletion");
  }

  getDeletionStatus() {
    return this.supabase
      .from("account_deletion_requests")
      .select("status, scheduled_for, requested_at")
      .maybeSingle();
  }
}

