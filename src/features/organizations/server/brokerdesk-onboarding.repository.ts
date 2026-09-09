import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/database.generated";
import type { BrokerdeskBusinessProfile, BrokerdeskProfileUpdate } from "./brokerdesk-onboarding.contract";

export class BrokerdeskOnboardingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  bootstrap() {
    return this.supabase.rpc("resolve_brokerdesk_bootstrap");
  }

  createWorkspace(profile: BrokerdeskBusinessProfile, idempotencyKey: string) {
    return this.supabase.rpc("create_brokerdesk_workspace", {
      p_profile: profile as Json,
      p_idempotency_key: idempotencyKey,
    });
  }

  resolveOnboarding(workspaceRef: string) {
    return this.supabase.rpc("resolve_brokerdesk_onboarding", { p_workspace_ref: workspaceRef });
  }

  saveOnboarding(
    workspaceRef: string,
    profile: BrokerdeskProfileUpdate,
    expectedVersion: number,
    submitForVerification: boolean,
    idempotencyKey: string
  ) {
    return this.supabase.rpc("save_brokerdesk_onboarding_profile", {
      p_workspace_ref: workspaceRef,
      p_profile: profile as Json,
      p_expected_version: expectedVersion,
      p_submit_for_verification: submitForVerification,
      p_idempotency_key: idempotencyKey,
    });
  }
}
