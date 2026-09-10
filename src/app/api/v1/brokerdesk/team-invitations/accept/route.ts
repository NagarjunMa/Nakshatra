import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { acceptBrokerdeskTeamInvitation, BrokerdeskTeamInvitationError } from "@/features/organization-access/server/brokerdesk-team-invitation.service";
import { clearTeamInvitationExchangeCookie, readTeamInvitationExchangeCookie, teamInvitationCookieName } from "@/features/organization-access/server/brokerdesk-team-invitation.cookie";
import { hashTeamInvitationToken } from "@/features/organization-access/server/brokerdesk-team-invitation.token";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

const empty = z.object({}).strict();
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    if (!empty.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT)).success) {
      return NextResponse.json({ code: "TEAM_INVITATION_INVALID", error: "The invitation is unavailable." }, { status: 400, headers: noStore });
    }
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_team_invitation_accept");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }
    const token = readTeamInvitationExchangeCookie(readRequestCookie(request, teamInvitationCookieName));
    if (!token) return NextResponse.json({ available: false }, { status: 403, headers: noStore });
    const result = await acceptBrokerdeskTeamInvitation(auth.supabase, hashTeamInvitationToken(token));
    const response = result.available
      ? NextResponse.json(result, { headers: noStore })
      : NextResponse.json(result, { status: 403, headers: noStore });
    response.cookies.set(clearTeamInvitationExchangeCookie());
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof BrokerdeskTeamInvitationError) {
      const response = NextResponse.json({ available: false }, { status: error.status, headers: noStore });
      response.cookies.set(clearTeamInvitationExchangeCookie());
      return response;
    }
    logServerError("brokerdesk.team.invitation_accept_failed", requestId, error);
    return NextResponse.json({ available: false }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
