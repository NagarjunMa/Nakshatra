import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Keeps all public verification RPC calls at a small server-only persistence boundary. */
export class IdentityVerificationSessionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  begin(candidateId: string | null, invitationTokenHash: string | null, managementTokenHash: string) {
    return this.supabase.rpc("begin_identity_verification", {
      p_candidate_id: candidateId,
      p_invitation_token_hash: invitationTokenHash,
      p_management_token_hash: managementTokenHash,
    });
  }

  attachProviderSession(attemptId: string, providerSessionRef: string, managementTokenHash: string) {
    return this.supabase.rpc("attach_identity_verification_provider_session", {
      p_attempt_id: attemptId,
      p_provider_session_ref: providerSessionRef,
      p_management_token_hash: managementTokenHash,
    });
  }

  getLinkStatus(tokenHash: string) {
    return this.supabase.rpc("get_identity_verification_link_status", { p_token_hash: tokenHash });
  }

  withdrawConsent(tokenHash: string) {
    return this.supabase.rpc("withdraw_identity_verification_consent", { p_token_hash: tokenHash });
  }

  retry(tokenHash: string, replacementManagementTokenHash: string) {
    return this.supabase.rpc("retry_identity_verification", {
      p_token_hash: tokenHash,
      p_management_token_hash: replacementManagementTokenHash,
    });
  }
}
