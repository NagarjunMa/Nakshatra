import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { createDiditVerificationSession, DiditProviderError } from "./didit.provider";
import { IdentityVerificationSessionRepository } from "./session.repository";

const preparedSessionSchema = z.object({
  attempt_id: z.uuid(),
  provider_subject_ref: z.uuid(),
  legal_name: z.string().min(1),
  birth_date: z.iso.date(),
});

const linkStatusSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("invitation"), status: z.literal("ready") }).strict(),
  z.object({
    kind: z.literal("management"),
    status: z.enum(["pending", "created", "invited", "in_progress", "verified", "declined", "failed", "expired", "redacted", "revoked"]),
    canRetry: z.boolean(),
    canWithdraw: z.boolean(),
  }).strict(),
]);

export type IdentityVerificationLinkStatus = z.infer<typeof linkStatusSchema>;

export class IdentityVerificationSessionError extends Error {
  constructor(message: string, readonly code: string, readonly status: number, readonly managementToken?: string) {
    super(message);
  }
}

function preparedSession(data: unknown) {
  const parsed = preparedSessionSchema.safeParse(Array.isArray(data) ? data[0] : data);
  if (!parsed.success) {
    throw new IdentityVerificationSessionError("We could not prepare identity verification. Please try again.", "IDENTITY_VERIFICATION_START_FAILED", 503);
  }
  return parsed.data;
}

function unavailableFromDatabase(error: { code?: string } | null, fallback: string, managementToken?: string): never {
  if (error?.code === "42501") {
    throw new IdentityVerificationSessionError("This verification action is not available.", "IDENTITY_VERIFICATION_FORBIDDEN", 403, managementToken);
  }
  if (error?.code === "22023") {
    throw new IdentityVerificationSessionError("This verification link is unavailable or has expired.", "IDENTITY_VERIFICATION_LINK_INVALID", 400, managementToken);
  }
  throw new IdentityVerificationSessionError("We could not complete identity verification. Please try again.", fallback, 503, managementToken);
}

async function attachProviderSession(input: {
  repository: IdentityVerificationSessionRepository;
  prepared: z.infer<typeof preparedSessionSchema>;
  managementTokenHash: string;
  callbackUrl: string;
  managementToken: string;
}) {
  let didit;
  try {
    didit = await createDiditVerificationSession({
      attemptId: input.prepared.attempt_id,
      providerSubjectRef: input.prepared.provider_subject_ref,
      legalName: input.prepared.legal_name,
      birthDate: input.prepared.birth_date,
      callbackUrl: input.callbackUrl,
    });
  } catch (error) {
    const code = error instanceof DiditProviderError ? error.code : "IDENTITY_VERIFICATION_PROVIDER_UNAVAILABLE";
    throw new IdentityVerificationSessionError("Identity verification is temporarily unavailable. Please try again.", code, 503, input.managementToken);
  }
  const { error } = await input.repository.attachProviderSession(
    input.prepared.attempt_id,
    didit.sessionId,
    input.managementTokenHash
  );
  if (error) unavailableFromDatabase(error, "IDENTITY_VERIFICATION_START_FAILED", input.managementToken);
  return { url: didit.url };
}

/** Atomically authorizes, records consent, and starts one hosted Didit verification. */
export async function startIdentityVerification(input: {
  supabase: SupabaseClient;
  candidateId: string | null;
  invitationTokenHash: string | null;
  managementToken: string;
  managementTokenHash: string;
  callbackUrl: string;
}) {
  const repository = new IdentityVerificationSessionRepository(input.supabase);
  const { data, error } = await repository.begin(input.candidateId, input.invitationTokenHash, input.managementTokenHash);
  if (error) unavailableFromDatabase(error, "IDENTITY_VERIFICATION_START_FAILED");
  return attachProviderSession({
    repository,
    prepared: preparedSession(data),
    managementTokenHash: input.managementTokenHash,
    callbackUrl: input.callbackUrl,
    managementToken: input.managementToken,
  });
}

/** Reads only generic invitation/management state; no candidate or provider data crosses this boundary. */
export async function getIdentityVerificationLinkStatus(supabase: SupabaseClient, tokenHash: string) {
  const { data, error } = await new IdentityVerificationSessionRepository(supabase).getLinkStatus(tokenHash);
  if (error?.code === "22023") {
    throw new IdentityVerificationSessionError("This verification link is unavailable or has expired.", "IDENTITY_VERIFICATION_LINK_INVALID", 400);
  }
  if (error) unavailableFromDatabase(error, "IDENTITY_VERIFICATION_STATUS_FAILED");
  const parsed = linkStatusSchema.safeParse(data);
  if (!parsed.success) {
    throw new IdentityVerificationSessionError("We could not load this verification link. Please try again.", "IDENTITY_VERIFICATION_STATUS_FAILED", 503);
  }
  return parsed.data;
}

/** Revokes Nakshatra's verification projection immediately after one valid withdrawal request. */
export async function withdrawIdentityVerificationConsent(supabase: SupabaseClient, tokenHash: string) {
  const { error } = await new IdentityVerificationSessionRepository(supabase).withdrawConsent(tokenHash);
  if (error) unavailableFromDatabase(error, "IDENTITY_VERIFICATION_WITHDRAW_FAILED");
}

/** Creates a fresh attempt from an unwithdrawn consent record and starts the hosted flow again. */
export async function retryIdentityVerification(input: {
  supabase: SupabaseClient;
  tokenHash: string;
  managementToken: string;
  managementTokenHash: string;
  callbackUrl: string;
}) {
  const repository = new IdentityVerificationSessionRepository(input.supabase);
  const { data, error } = await repository.retry(input.tokenHash, input.managementTokenHash);
  if (error) unavailableFromDatabase(error, "IDENTITY_VERIFICATION_RETRY_FAILED");
  return attachProviderSession({
    repository,
    prepared: preparedSession(data),
    managementTokenHash: input.managementTokenHash,
    callbackUrl: input.callbackUrl,
    managementToken: input.managementToken,
  });
}
