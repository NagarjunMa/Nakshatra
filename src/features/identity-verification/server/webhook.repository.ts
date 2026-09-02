import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerifiedDiditWebhook } from "./didit.webhook";

/** Service-role-only persistence boundary for verified webhook receipts. */
export class IdentityVerificationWebhookRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  record(event: VerifiedDiditWebhook) {
    return this.supabase.rpc("record_identity_verification_webhook", {
      p_attempt_id: event.attemptId,
      p_payload_digest: event.payloadDigest,
      p_provider_event_hash: event.eventHash,
      p_provider_session_ref: event.providerSessionRef,
      p_provider_subject_ref: event.providerSubjectRef,
    });
  }
}
