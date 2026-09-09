import { NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  brokerdeskReauthCookieNames,
  clearBrokerdeskMfaPendingCookie,
  createBrokerdeskProof,
  createBrokerdeskProofCookie,
  hashBrokerdeskProof,
  readBrokerdeskMfaPendingCookie,
} from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import {
  BrokerdeskReauthError,
  completeBrokerdeskReauth,
} from "@/features/organization-access/server/brokerdesk-reauth.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  AUTH_BODY_LIMIT,
  RequestSecurityError,
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

const noStore = { "Cache-Control": "private, no-store" };
const emptyBodySchema = z.object({}).strict();

function nextPath(workspaceRef: string, purpose: string) {
  return purpose === "verification_manage"
    ? "/brokerdesk/onboarding?reauth=complete"
    : `/brokerdesk/w/${workspaceRef}/settings/team?reauth=complete`;
}

/** Issues a purpose-bound proof only after PostgreSQL verifies a live AAL2 session. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    if (!emptyBodySchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT)).success) {
      return NextResponse.json(
        { code: "BROKERDESK_REAUTH_REQUEST_INVALID", error: "The security request is invalid." },
        { status: 400, headers: noStore }
      );
    }
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth);
      response.headers.set("Cache-Control", noStore["Cache-Control"]);
      return response;
    }

    const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_mfa_complete");
    if (rateLimited) {
      rateLimited.headers.set("Cache-Control", noStore["Cache-Control"]);
      return rateLimited;
    }

    const pending = readBrokerdeskMfaPendingCookie(
      readRequestCookie(request, brokerdeskReauthCookieNames.mfaPending)
    );
    if (!pending) {
      const response = NextResponse.json(
        { code: "BROKERDESK_REAUTH_INVALID", error: "This security check has expired. Please start again." },
        { status: 403, headers: noStore }
      );
      response.cookies.set(clearBrokerdeskMfaPendingCookie());
      return response;
    }

    const proof = createBrokerdeskProof();
    const outcome = await completeBrokerdeskReauth(
      auth.supabase,
      pending.challengeId,
      hashBrokerdeskProof(proof)
    );
    if (outcome === "mfa_required") {
      return NextResponse.json(
        { code: "BROKERDESK_MFA_REQUIRED", error: "Enter your authenticator code to continue." },
        { status: 403, headers: noStore }
      );
    }
    if (outcome !== "verified") {
      const response = NextResponse.json(
        { code: "BROKERDESK_REAUTH_INVALID", error: "This security check has expired. Please start again." },
        { status: outcome === "expired" ? 410 : 403, headers: noStore }
      );
      response.cookies.set(clearBrokerdeskMfaPendingCookie());
      return response;
    }

    const response = NextResponse.json(
      { next: nextPath(pending.workspaceRef, pending.purpose) },
      { headers: noStore }
    );
    response.cookies.set(createBrokerdeskProofCookie({ ...pending, proof }));
    response.cookies.set(clearBrokerdeskMfaPendingCookie());
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof BrokerdeskReauthError) {
      logServerError("brokerdesk.reauth.mfa_completion_failed", requestId, error);
    } else {
      logServerError("brokerdesk.reauth.mfa_completion_failed", requestId, error);
    }
    return NextResponse.json(
      { code: "BROKERDESK_REAUTH_UNAVAILABLE", error: "The security check is temporarily unavailable." },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } }
    );
  }
}
