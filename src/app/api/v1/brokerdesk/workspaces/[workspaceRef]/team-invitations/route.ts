import { NextResponse } from "next/server";
import { createTeamInvitationCommandSchema } from "@/features/organization-access/server/brokerdesk-team-invitation.contract";
import { createBrokerdeskTeamInvitation, BrokerdeskTeamInvitationError } from "@/features/organization-access/server/brokerdesk-team-invitation.service";
import {
  deriveTeamInvitationToken,
  hashInvitationEmail,
  hashTeamInvitationToken,
  invitationEmailHint,
  normalizeInvitationEmail,
} from "@/features/organization-access/server/brokerdesk-team-invitation.token";
import {
  brokerdeskReauthCookieNames,
  clearBrokerdeskProofCookie,
  hashBrokerdeskProof,
  readBrokerdeskProofCookie,
} from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import { getApiUser } from "@/lib/auth";
import { createCanonicalAppUrl } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string }> };
const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const body = createTeamInvitationCommandSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!body.success) {
      return NextResponse.json({ code: "BROKERDESK_TEAM_INVITATION_INVALID", error: "Enter a valid email, role, and request." }, { status: 400, headers: noStore });
    }
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_team_invite");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }

    const { workspaceRef } = await context.params;
    const proof = readBrokerdeskProofCookie(readRequestCookie(request, brokerdeskReauthCookieNames.proof));
    if (!proof || proof.workspaceRef !== workspaceRef || proof.purpose !== "team_invite") {
      return NextResponse.json({ code: "BROKERDESK_STEP_UP_REQUIRED", error: "Complete the security check before inviting an employee." }, { status: 403, headers: noStore });
    }

    const email = normalizeInvitationEmail(body.data.email);
    const token = deriveTeamInvitationToken({
      actorUserId: auth.user.id,
      workspaceRef,
      email,
      rolePreset: body.data.rolePreset,
      idempotencyKey: body.data.idempotencyKey,
    });
    const result = await createBrokerdeskTeamInvitation(auth.supabase, {
      workspaceRef,
      rolePreset: body.data.rolePreset,
      emailHash: hashInvitationEmail(email),
      emailHint: invitationEmailHint(email),
      tokenHash: hashTeamInvitationToken(token),
      proofHash: hashBrokerdeskProof(proof.proof),
      idempotencyKey: body.data.idempotencyKey,
    });
    const base = createCanonicalAppUrl("/join/team", request.url);
    const response = NextResponse.json({ ...result, invitationUrl: `${base}#token=${token}` }, { headers: noStore });
    response.cookies.set(clearBrokerdeskProofCookie(workspaceRef));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof BrokerdeskTeamInvitationError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status, headers: noStore });
    }
    logServerError("brokerdesk.team.invitation_create_failed", requestId, error);
    return NextResponse.json({ code: "BROKERDESK_TEAM_INVITATION_UNAVAILABLE", error: "The invitation could not be created." }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
