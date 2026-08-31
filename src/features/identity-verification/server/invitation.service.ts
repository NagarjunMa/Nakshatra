import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { IdentityVerificationInvitationRepository } from "./invitation.repository";

const invitationExpirySchema = z.iso.datetime();

export class IdentityVerificationInvitationError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

/** Creates a candidate-bound link only after the database verifies the signed-in actor's authority. */
export async function createIdentityVerificationInvitation(input: {
  supabase: SupabaseClient;
  candidateId: string;
  tokenHash: string;
}) {
  const { data, error } = await new IdentityVerificationInvitationRepository(input.supabase)
    .create(input.candidateId, input.tokenHash);
  const expiry = invitationExpirySchema.safeParse(data);
  if (error?.code === "42501") {
    throw new IdentityVerificationInvitationError("You cannot create a verification invitation for this candidate.", "IDENTITY_VERIFICATION_FORBIDDEN", 403);
  }
  if (error || !expiry.success) {
    throw new IdentityVerificationInvitationError("We could not create a verification invitation. Please try again.", "IDENTITY_VERIFICATION_INVITATION_FAILED", 503);
  }
  return { expiresAt: expiry.data };
}
