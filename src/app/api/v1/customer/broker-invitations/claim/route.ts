import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { clearCustomerInvitationExchangeCookie, customerInvitationCookieName, readCustomerInvitationExchangeCookie } from "@/features/broker-relationships/server/customer-invitation.cookie";
import { CustomerInvitationError, claimCustomerInvitation } from "@/features/broker-relationships/server/customer-invitation.service";
import { hashCustomerInvitationToken } from "@/features/broker-relationships/server/customer-invitation.token";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { readRequestCookie } from "@/features/account/server/reauth-cookie";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

const consentSchema = z.object({ consent: z.literal(true) }).strict();
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    if (!consentSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT)).success) {
      return NextResponse.json({ available: false }, { status: 400, headers: noStore });
    }
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_customer_invitation_claim");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }
    const token = readCustomerInvitationExchangeCookie(readRequestCookie(request, customerInvitationCookieName));
    if (!token) return NextResponse.json({ available: false }, { status: 403, headers: noStore });
    const result = await claimCustomerInvitation(auth.supabase, hashCustomerInvitationToken(token));
    const response = result.available
      ? NextResponse.json(result, { headers: noStore })
      : NextResponse.json(result, { status: 403, headers: noStore });
    response.cookies.set(clearCustomerInvitationExchangeCookie());
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof CustomerInvitationError) {
      const response = NextResponse.json({ available: false }, { status: error.status, headers: noStore });
      response.cookies.set(clearCustomerInvitationExchangeCookie());
      return response;
    }
    logServerError("customer.broker_invitation_claim_failed", requestId, error);
    return NextResponse.json({ available: false }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}

