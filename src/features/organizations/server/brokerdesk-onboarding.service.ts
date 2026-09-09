import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceRefSchema } from "@/features/security/public-reference";
import {
  brokerdeskBootstrapSchema,
  brokerdeskBusinessProfileSchema,
  brokerdeskOnboardingResultSchema,
  brokerdeskOnboardingSchema,
  brokerdeskProfileUpdateSchema,
  type BrokerdeskBusinessProfile,
  type BrokerdeskProfileUpdate,
} from "./brokerdesk-onboarding.contract";
import { BrokerdeskOnboardingRepository } from "./brokerdesk-onboarding.repository";

export class BrokerdeskOnboardingError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

function persistenceError(error: { code?: string } | null, fallbackCode: string) {
  if (error?.code === "40001") {
    return new BrokerdeskOnboardingError(
      "This information changed in another window. Refresh and try again.",
      "BROKERDESK_ONBOARDING_CONFLICT",
      409
    );
  }
  if (error?.code === "22023") {
    return new BrokerdeskOnboardingError(
      "Some business details are invalid or incomplete.",
      "BROKERDESK_ONBOARDING_INVALID",
      400
    );
  }
  if (error?.code === "42501") {
    return new BrokerdeskOnboardingError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404);
  }
  return new BrokerdeskOnboardingError(
    "BrokerDesk onboarding is temporarily unavailable.",
    fallbackCode,
    503
  );
}

export async function getBrokerdeskBootstrap(supabase: SupabaseClient) {
  const { data, error } = await new BrokerdeskOnboardingRepository(supabase).bootstrap();
  const parsed = brokerdeskBootstrapSchema.safeParse(data);
  if (error || !parsed.success) throw persistenceError(error, "BROKERDESK_BOOTSTRAP_UNAVAILABLE");
  return parsed.data;
}

export async function createBrokerdeskWorkspace(
  supabase: SupabaseClient,
  profile: BrokerdeskBusinessProfile,
  idempotencyKey: string
) {
  const validated = brokerdeskBusinessProfileSchema.parse(profile);
  const { data, error } = await new BrokerdeskOnboardingRepository(supabase)
    .createWorkspace(validated, idempotencyKey);
  const parsed = brokerdeskOnboardingSchema.safeParse(data);
  if (error || !parsed.success) throw persistenceError(error, "BROKERDESK_WORKSPACE_CREATE_FAILED");
  return parsed.data;
}

export async function getBrokerdeskOnboarding(supabase: SupabaseClient, workspaceRef: string) {
  if (!workspaceRefSchema.safeParse(workspaceRef).success) return { available: false } as const;
  const { data, error } = await new BrokerdeskOnboardingRepository(supabase).resolveOnboarding(workspaceRef);
  const parsed = brokerdeskOnboardingResultSchema.safeParse(data);
  if (error || !parsed.success) throw persistenceError(error, "BROKERDESK_ONBOARDING_UNAVAILABLE");
  return parsed.data;
}

export async function saveBrokerdeskOnboarding(
  supabase: SupabaseClient,
  workspaceRef: string,
  profile: BrokerdeskProfileUpdate,
  expectedVersion: number,
  submitForVerification: boolean,
  idempotencyKey: string
) {
  if (!workspaceRefSchema.safeParse(workspaceRef).success) {
    throw new BrokerdeskOnboardingError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404);
  }
  const validated = brokerdeskProfileUpdateSchema.parse(profile);
  const { data, error } = await new BrokerdeskOnboardingRepository(supabase).saveOnboarding(
    workspaceRef, validated, expectedVersion, submitForVerification, idempotencyKey
  );
  const parsed = brokerdeskOnboardingSchema.safeParse(data);
  if (error || !parsed.success) throw persistenceError(error, "BROKERDESK_ONBOARDING_SAVE_FAILED");
  return parsed.data;
}
