import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { deletionRequestSchema, deletionStatusSchema } from "./account.contract";
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
