import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createIdentityVerificationToken, hashIdentityVerificationToken, isIdentityVerificationToken } from "@/features/identity-verification/server/identity-verification.tokens";
import { IdentityVerificationSessionError, startIdentityVerification } from "@/features/identity-verification/server/session.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { createCanonicalAppUrl } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

const tokenSchema = z.string().refine(isIdentityVerificationToken, "Invalid verification token");
const startSchema = z.discriminatedUnion("authorization", [
  z.object({ authorization: z.literal("self"), candidateId: z.uuid(), consent: z.literal(true) }).strict(),
  z.object({ authorization: z.literal("invitation"), token: tokenSchema, consent: z.literal(true) }).strict(),
]);
const noStore = { "Cache-Control": "private, no-store" };

function managementUrl(token: string, request: Request) {
  return createCanonicalAppUrl(`/verify/${token}`, request.url);
}

/** Records the standalone consent before creating a hosted session for a self-managed or invited candidate. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", noStore["Cache-Control"]);
    return response;
  }
  let body: unknown;
  try {
    body = await readJsonBody(request, AUTH_BODY_LIMIT);
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", noStore["Cache-Control"]);
    return response;
  }
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "IDENTITY_VERIFICATION_CONSENT_REQUIRED", error: "Review and accept the identity-verification notice before continuing." },
      { status: 400, headers: noStore }
    );
  }

  let supabase;
  if (parsed.data.authorization === "self") {
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth);
      response.headers.set("Cache-Control", noStore["Cache-Control"]);
      return response;
    }
    supabase = auth.supabase;
  } else {
    supabase = await createClient();
  }
  const rateLimited = await enforceRateLimit(supabase, request, "identity_verification_start");
  if (rateLimited) {
    rateLimited.headers.set("Cache-Control", noStore["Cache-Control"]);
    return rateLimited;
  }

  const managementToken = createIdentityVerificationToken();
  try {
    const result = await startIdentityVerification({
      supabase,
      candidateId: parsed.data.authorization === "self" ? parsed.data.candidateId : null,
      invitationTokenHash: parsed.data.authorization === "invitation" ? await hashIdentityVerificationToken(parsed.data.token) : null,
      managementToken,
      managementTokenHash: await hashIdentityVerificationToken(managementToken),
      callbackUrl: createCanonicalAppUrl("/verification/result", request.url),
    });
    return NextResponse.json({ url: result.url, managementUrl: managementUrl(managementToken, request) }, { headers: noStore });
  } catch (error) {
    const known = error instanceof IdentityVerificationSessionError ? error : null;
    return NextResponse.json(
      {
        code: known?.code || "IDENTITY_VERIFICATION_START_FAILED",
        error: known?.message || "We could not start identity verification. Please try again.",
        ...(known?.managementToken ? { managementUrl: managementUrl(known.managementToken, request) } : {}),
      },
      { status: known?.status || 503, headers: noStore }
    );
  }
}
