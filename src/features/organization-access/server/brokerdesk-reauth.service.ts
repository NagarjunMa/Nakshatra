import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceRefSchema } from "@/features/security/public-reference";
import {
  brokerdeskReauthCompletionSchema,
  brokerdeskReauthPurposeSchema,
  brokerdeskReauthStartSchema,
  type BrokerdeskReauthPurpose,
} from "./brokerdesk-reauth.contract";
import { BrokerdeskReauthRepository } from "./brokerdesk-reauth.repository";

export class BrokerdeskReauthError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

/** Starts a short-lived challenge only after the database authorizes the exact workspace action. */
export async function startBrokerdeskReauth(
  supabase: SupabaseClient,
  workspaceRef: string,
  purpose: BrokerdeskReauthPurpose,
  sessionId: string
) {
  const parsedWorkspace = workspaceRefSchema.safeParse(workspaceRef);
  const parsedPurpose = brokerdeskReauthPurposeSchema.safeParse(purpose);
  if (!parsedWorkspace.success || !parsedPurpose.success) {
    throw new BrokerdeskReauthError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404);
  }

  const { data, error } = await new BrokerdeskReauthRepository(supabase)
    .start(parsedWorkspace.data, parsedPurpose.data, sessionId);
  const parsed = brokerdeskReauthStartSchema.safeParse(data);
  if (error?.code === "42501") {
    throw new BrokerdeskReauthError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404);
  }
  if (error || !parsed.success) {
    throw new BrokerdeskReauthError(
      "Fresh authentication is temporarily unavailable.",
      "BROKERDESK_REAUTH_UNAVAILABLE",
      503
    );
  }
  return parsed.data;
}

/** Records a same-user fresh session and a server-generated one-time proof hash. */
export async function completeBrokerdeskReauth(
  supabase: SupabaseClient,
  challengeId: string,
  proofHash: string
) {
  const { data, error } = await new BrokerdeskReauthRepository(supabase).complete(challengeId, proofHash);
  const parsed = brokerdeskReauthCompletionSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new BrokerdeskReauthError(
      "Fresh authentication could not be verified.",
      "BROKERDESK_REAUTH_CALLBACK_FAILED",
      503
    );
  }
  return parsed.data;
}
