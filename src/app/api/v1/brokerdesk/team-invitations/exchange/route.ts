import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createTeamInvitationExchangeCookie } from "@/features/organization-access/server/brokerdesk-team-invitation.cookie";
import { isTeamInvitationToken } from "@/features/organization-access/server/brokerdesk-team-invitation.token";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { createClient } from "@/lib/supabase/server";
import { getRequestId, logServerError } from "@/lib/security/logging";

const schema = z.object({ token: z.string().refine(isTeamInvitationToken) }).strict();
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

/** Moves a fragment credential into a short-lived HttpOnly cookie without consuming it. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const supabase = await createClient();
    const limited = await enforceRateLimit(supabase, request, "brokerdesk_team_invitation_exchange");
    if (limited) return limited;
    const parsed = schema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) return NextResponse.json({ ready: true }, { headers: noStore });
    const response = NextResponse.json({ ready: true }, { headers: noStore });
    response.cookies.set(createTeamInvitationExchangeCookie(parsed.data.token));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    logServerError("brokerdesk.team.invitation_exchange_failed", requestId, error);
    return NextResponse.json({ ready: false }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
