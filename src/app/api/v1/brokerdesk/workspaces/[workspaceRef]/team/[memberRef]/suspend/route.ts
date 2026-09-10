import { NextResponse } from "next/server";
import { suspendTeamMemberCommandSchema } from "@/features/organization-access/server/brokerdesk-team-command.contract";
import { BrokerdeskTeamCommandError, suspendBrokerdeskTeamMember } from "@/features/organization-access/server/brokerdesk-team-command.service";
import { brokerdeskReauthCookieNames, clearBrokerdeskProofCookie, hashBrokerdeskProof, readBrokerdeskProofCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string; memberRef: string }> };
const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const body = suspendTeamMemberCommandSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!body.success) return NextResponse.json({ code: "BROKERDESK_TEAM_COMMAND_INVALID", error: "The suspension request is invalid." }, { status: 400, headers: noStore });
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_team_suspend");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }
    const { workspaceRef, memberRef } = await context.params;
    const proof = readBrokerdeskProofCookie(readRequestCookie(request, brokerdeskReauthCookieNames.proof));
    if (!proof || proof.workspaceRef !== workspaceRef || proof.purpose !== "team_suspend") {
      return NextResponse.json({ code: "BROKERDESK_STEP_UP_REQUIRED", error: "Complete the security check before suspending an employee." }, { status: 403, headers: noStore });
    }
    const result = await suspendBrokerdeskTeamMember(auth.supabase, {
      workspaceRef, memberRef, proofHash: hashBrokerdeskProof(proof.proof), idempotencyKey: body.data.idempotencyKey,
    });
    const response = NextResponse.json(result, { headers: noStore });
    response.cookies.set(clearBrokerdeskProofCookie(workspaceRef));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof BrokerdeskTeamCommandError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status, headers: noStore });
    logServerError("brokerdesk.team.suspend_failed", requestId, error);
    return NextResponse.json({ code: "BROKERDESK_TEAM_COMMAND_UNAVAILABLE", error: "The employee could not be suspended." }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
