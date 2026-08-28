import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deletionReauthCompletionSchema,
  deletionReauthConsumptionSchema,
  deletionReauthStartSchema,
  deletionRequestSchema,
  deletionStatusSchema,
} from "./account.contract";
import { AccountRepository } from "./account.repository";

export class AccountPrivacyError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

/** Returns the authenticated user's portable JSON record. */
export async function exportAccountData(supabase: SupabaseClient) {
  const { data, error } = await new AccountRepository(supabase).exportAccount();
  if (error || !data) {
    throw new AccountPrivacyError("Your account export is temporarily unavailable.", "ACCOUNT_EXPORT_FAILED", 503);
  }
  return data;
}

/** Revokes publication immediately and schedules destructive deletion after the recovery window. */
export async function requestAccountDeletion(supabase: SupabaseClient) {
  const { data, error } = await new AccountRepository(supabase).requestDeletion();
  const parsed = deletionRequestSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new AccountPrivacyError("We could not schedule account deletion.", "ACCOUNT_DELETION_FAILED", 503);
  }
  if (parsed.data.status === "processing") {
    throw new AccountPrivacyError("Account deletion is already being processed and can no longer be changed.", "ACCOUNT_DELETION_PROCESSING", 409);
  }
  if (parsed.data.status === "completed") {
    throw new AccountPrivacyError("This account deletion has already completed.", "ACCOUNT_DELETION_COMPLETED", 409);
  }
  if (parsed.data.status === "unavailable") {
    throw new AccountPrivacyError("This account deletion request cannot be changed.", "ACCOUNT_DELETION_NOT_AVAILABLE", 409);
  }
  return parsed.data;
}

/** Creates a short-lived server-bound reauthentication challenge for the current live session. */
export async function startAccountDeletionReauth(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await new AccountRepository(supabase).startDeletionReauth(sessionId);
  const parsed = deletionReauthStartSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new AccountPrivacyError("We could not start deletion reauthentication.", "DELETION_REAUTH_START_FAILED", 503);
  }
  return parsed.data;
}

/** Records a same-user fresh session and its server-generated, one-time proof hash. */
export async function completeAccountDeletionReauth(supabase: SupabaseClient, challengeId: string, proofHash: string) {
  const { data, error } = await new AccountRepository(supabase).completeDeletionReauth(challengeId, proofHash);
  const parsed = deletionReauthCompletionSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new AccountPrivacyError("We could not verify deletion reauthentication.", "DELETION_REAUTH_CALLBACK_FAILED", 503);
  }
  return parsed.data;
}

/** Atomically consumes a proof before using the merged deletion scheduler. */
export async function consumeAccountDeletionReauth(supabase: SupabaseClient, proofHash: string) {
  const { data, error } = await new AccountRepository(supabase).consumeDeletionReauth(proofHash);
  const parsed = deletionReauthConsumptionSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new AccountPrivacyError("We could not schedule account deletion.", "ACCOUNT_DELETION_FAILED", 503);
  }
  if (parsed.data.status === "proof_invalid") {
    throw new AccountPrivacyError("Reauthenticate again before scheduling account deletion.", "DELETION_REAUTH_REQUIRED", 403);
  }
  if (parsed.data.status === "proof_expired") {
    throw new AccountPrivacyError("Deletion reauthentication expired. Please try again.", "DELETION_REAUTH_EXPIRED", 403);
  }
  return parsed.data;
}

/** Cancels a pending deletion request without republishing previously revoked content. */
export async function cancelAccountDeletion(supabase: SupabaseClient) {
  const { data, error } = await new AccountRepository(supabase).cancelDeletion();
  if (error || data !== "canceled") {
    throw new AccountPrivacyError("This deletion request can no longer be canceled.", "ACCOUNT_DELETION_NOT_CANCELABLE", 409);
  }
}

/** Returns a minimal owner-visible deletion state. */
export async function getAccountDeletionStatus(supabase: SupabaseClient) {
  const { data, error } = await new AccountRepository(supabase).getDeletionStatus();
  if (error) {
    throw new AccountPrivacyError("Account status is temporarily unavailable.", "ACCOUNT_STATUS_FAILED", 503);
  }
  const parsed = deletionStatusSchema.safeParse(data ? {
    status: data.status,
    scheduledFor: data.scheduled_for,
    requestedAt: data.requested_at,
  } : null);
  if (!parsed.success) {
    throw new AccountPrivacyError("Account status is temporarily unavailable.", "ACCOUNT_STATUS_FAILED", 503);
  }
  return parsed.data;
}

