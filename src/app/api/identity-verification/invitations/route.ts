import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createIdentityVerificationInvitation, IdentityVerificationInvitationError } from "@/features/identity-verification/server/invitation.service";
import { createIdentityVerificationToken, hashIdentityVerificationToken } from "@/features/identity-verification/server/identity-verification.tokens";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { createCanonicalAppUrl } from "@/lib/security/redirect";

const invitationSchema = z.object({ candidateId: z.uuid() }).strict();
const noStore = { "Cache-Control": "private, no-store" };

/** Creates one short-lived, candidate-bound accountless verification link for an authorized owner. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", noStore["Cache-Control"]);
    return response;
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") {
    const response = apiAuthFailureResponse(auth);
    response.headers.set("Cache-Control", noStore["Cache-Control"]);
    return response;
  }
  const rateLimited = await enforceRateLimit(auth.supabase, request, "identity_verification_invitation");
  if (rateLimited) {
    rateLimited.headers.set("Cache-Control", noStore["Cache-Control"]);
    return rateLimited;
  }
  let body: unknown;
  try {
    body = await readJsonBody(request, AUTH_BODY_LIMIT);
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", noStore["Cache-Control"]);
    return response;
  }
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "IDENTITY_VERIFICATION_INVITATION_INVALID", error: "Choose a valid candidate before creating an invitation." },
      { status: 400, headers: noStore }
    );
  }

  const token = createIdentityVerificationToken();
  try {
    const invitation = await createIdentityVerificationInvitation({
      supabase: auth.supabase,
      candidateId: parsed.data.candidateId,
      tokenHash: await hashIdentityVerificationToken(token),
    });
    return NextResponse.json({
      invitationUrl: createCanonicalAppUrl(`/verify/${token}`, request.url),
      expiresAt: invitation.expiresAt,
    }, { headers: noStore });
  } catch (error) {
    const known = error instanceof IdentityVerificationInvitationError ? error : null;
    return NextResponse.json(
      { code: known?.code || "IDENTITY_VERIFICATION_INVITATION_FAILED", error: known?.message || "We could not create a verification invitation. Please try again." },
      { status: known?.status || 503, headers: noStore }
    );
  }
}
