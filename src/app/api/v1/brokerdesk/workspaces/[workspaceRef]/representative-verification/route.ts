import { NextResponse } from "next/server";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import {
  brokerdeskReauthCookieNames,
  clearBrokerdeskProofCookie,
  hashBrokerdeskProof,
  readBrokerdeskProofCookie,
} from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import { startBrokerdeskRepresentativeVerificationSchema } from "@/features/organizations/server/brokerdesk-onboarding.contract";
import {
  createIdentityVerificationToken,
  hashIdentityVerificationToken,
} from "@/features/identity-verification/server/identity-verification.tokens";
import {
  IdentityVerificationSessionError,
  startBrokerdeskRepresentativeVerification,
} from "@/features/identity-verification/server/session.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  AUTH_BODY_LIMIT,
  RequestSecurityError,
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { getApiUser } from "@/lib/auth";
import { createCanonicalAppUrl } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string }> };
const noStore = { "Cache-Control": "private, no-store" };

function managementUrl(token: string, request: Request) {
  return createCanonicalAppUrl(`/verify/${token}`, request.url);
}

/** Starts representative identity verification only after exact workspace-scoped AAL2 proof consumption. */
export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request);
  let workspaceRef = "";
  try {
    requireSameOrigin(request);
    const parsed = startBrokerdeskRepresentativeVerificationSchema.safeParse(
      await readJsonBody(request, AUTH_BODY_LIMIT)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { code: "BROKERDESK_REPRESENTATIVE_VERIFICATION_INVALID", error: "Review the notice and enter a valid adult date of birth." },
        { status: 400, headers: noStore }
      );
    }

    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth);
      response.headers.set("Cache-Control", noStore["Cache-Control"]);
      return response;
    }
    const limited = await enforceRateLimit(
      auth.supabase,
      request,
      "brokerdesk_representative_verification_start"
    );
    if (limited) {
      limited.headers.set("Cache-Control", noStore["Cache-Control"]);
      return limited;
    }

    ({ workspaceRef } = await context.params);
    const proof = readBrokerdeskProofCookie(
      readRequestCookie(request, brokerdeskReauthCookieNames.proof)
    );
    if (!proof || proof.workspaceRef !== workspaceRef || proof.purpose !== "verification_manage") {
      return NextResponse.json(
        { code: "BROKERDESK_STEP_UP_REQUIRED", error: "Complete the security check before verifying your identity." },
        { status: 403, headers: noStore }
      );
    }

    const managementToken = createIdentityVerificationToken();
    const result = await startBrokerdeskRepresentativeVerification({
      supabase: auth.supabase,
      workspaceRef,
      birthDate: parsed.data.birthDate,
      proofHash: hashBrokerdeskProof(proof.proof),
      managementToken,
      managementTokenHash: await hashIdentityVerificationToken(managementToken),
      callbackUrl: createCanonicalAppUrl("/verification/result", request.url),
    });
    const response = NextResponse.json(
      { url: result.url, managementUrl: managementUrl(managementToken, request) },
      { headers: noStore }
    );
    response.cookies.set(clearBrokerdeskProofCookie(workspaceRef));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof IdentityVerificationSessionError) {
      const response = NextResponse.json(
        {
          code: error.code,
          error: error.message,
          ...(error.managementToken
            ? { managementUrl: managementUrl(error.managementToken, request) }
            : {}),
        },
        { status: error.status, headers: noStore }
      );
      if (workspaceRef) response.cookies.set(clearBrokerdeskProofCookie(workspaceRef));
      return response;
    }
    logServerError("brokerdesk.representative_verification.start_failed", requestId, error);
    return NextResponse.json(
      { code: "BROKERDESK_REPRESENTATIVE_VERIFICATION_UNAVAILABLE", error: "Identity verification is temporarily unavailable." },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } }
    );
  }
}
