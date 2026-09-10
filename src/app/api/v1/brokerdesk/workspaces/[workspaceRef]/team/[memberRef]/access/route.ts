import { NextResponse } from "next/server";
import { replaceTeamMemberAccessCommandSchema } from "@/features/organization-access/server/brokerdesk-team-command.contract";
import { BrokerdeskTeamCommandError, replaceBrokerdeskTeamMemberAccess } from "@/features/organization-access/server/brokerdesk-team-command.service";
import { brokerdeskReauthCookieNames, clearBrokerdeskProofCookie, hashBrokerdeskProof, readBrokerdeskProofCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string; memberRef: string }> };
const noStore = { "Cache-Control": "private, no-store" };

export async function PUT(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const body = replaceTeamMemberAccessCommandSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!body.success) return NextResponse.json({ code: "BROKERDESK_TEAM_COMMAND_INVALID", error: "Choose a valid employee role and request." }, { status: 400, headers: noStore });
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_team_access_replace");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }
    const { workspaceRef, memberRef } = await context.params;
    const proof = readBrokerdeskProofCookie(readRequestCookie(request, brokerdeskReauthCookieNames.proof));
    if (!proof || proof.workspaceRef !== workspaceRef || proof.purpose !== "team_access_replace") {
      return NextResponse.json({ code: "BROKERDESK_STEP_UP_REQUIRED", error: "Complete the security check before changing employee access." }, { status: 403, headers: noStore });
    }
    const result = await replaceBrokerdeskTeamMemberAccess(auth.supabase, {
      workspaceRef, memberRef, rolePreset: body.data.rolePreset,
      proofHash: hashBrokerdeskProof(proof.proof), idempotencyKey: body.data.idempotencyKey,
    });
    const response = NextResponse.json(result, { headers: noStore });
    response.cookies.set(clearBrokerdeskProofCookie(workspaceRef));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof BrokerdeskTeamCommandError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status, headers: noStore });
    logServerError("brokerdesk.team.access_replace_failed", requestId, error);
    return NextResponse.json({ code: "BROKERDESK_TEAM_COMMAND_UNAVAILABLE", error: "The team change could not be saved." }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
