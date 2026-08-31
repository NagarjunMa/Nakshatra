import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Executes owner-authorized invitation RPCs without exposing private tables to the Data API. */
export class IdentityVerificationInvitationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  create(candidateId: string, tokenHash: string) {
    return this.supabase.rpc("create_identity_verification_invitation", {
      p_candidate_id: candidateId,
      p_token_hash: tokenHash,
    });
  }
}
