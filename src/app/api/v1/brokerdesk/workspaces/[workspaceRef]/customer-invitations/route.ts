import { NextResponse } from "next/server";
import { createCustomerInvitationCommandSchema } from "@/features/broker-relationships/server/customer-invitation.contract";
import { createCustomerInvitation, CustomerInvitationError } from "@/features/broker-relationships/server/customer-invitation.service";
import { deriveCustomerInvitationToken, hashCustomerInvitationToken } from "@/features/broker-relationships/server/customer-invitation.token";
import {
  hashInvitationEmail,
  invitationEmailHint,
  normalizeInvitationEmail,
} from "@/features/organization-access/server/brokerdesk-team-invitation.token";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { getApiUser } from "@/lib/auth";
import { createCanonicalAppUrl } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string }> };
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const body = createCustomerInvitationCommandSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!body.success) {
      return NextResponse.json(
        { code: "BROKERDESK_CUSTOMER_INVITATION_INVALID", error: "Enter a valid customer email and try again." },
        { status: 400, headers: noStore }
      );
    }
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_customer_invite");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }

    const { workspaceRef } = await context.params;
    const email = normalizeInvitationEmail(body.data.email);
    const token = deriveCustomerInvitationToken({
      actorUserId: auth.user.id,
      workspaceRef,
      email,
      idempotencyKey: body.data.idempotencyKey,
    });
    const result = await createCustomerInvitation(auth.supabase, {
      workspaceRef,
      emailHash: hashInvitationEmail(email),
      emailHint: invitationEmailHint(email),
      tokenHash: hashCustomerInvitationToken(token),
      idempotencyKey: body.data.idempotencyKey,
    });
    const base = createCanonicalAppUrl("/join/customer", request.url);
    return NextResponse.json({ ...result, invitationUrl: `${base}#token=${token}` }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof CustomerInvitationError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status, headers: noStore });
    }
    logServerError("brokerdesk.customer.invitation_create_failed", requestId, error);
    return NextResponse.json(
      { code: "BROKERDESK_CUSTOMER_INVITATION_UNAVAILABLE", error: "The invitation could not be created." },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } }
    );
  }
}

