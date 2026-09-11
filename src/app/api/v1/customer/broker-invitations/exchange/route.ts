import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createCustomerInvitationExchangeCookie } from "@/features/broker-relationships/server/customer-invitation.cookie";
import { isCustomerInvitationToken } from "@/features/broker-relationships/server/customer-invitation.token";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { AUTH_BODY_LIMIT, RequestSecurityError, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { createClient } from "@/lib/supabase/server";
import { getRequestId, logServerError } from "@/lib/security/logging";

const schema = z.object({ token: z.string().refine(isCustomerInvitationToken) }).strict();
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

/** Moves the fragment credential into a short-lived HttpOnly cookie without consuming it. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const supabase = await createClient();
    const limited = await enforceRateLimit(supabase, request, "brokerdesk_customer_invitation_exchange");
    if (limited) return limited;
    const parsed = schema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) return NextResponse.json({ ready: true }, { headers: noStore });
    const response = NextResponse.json({ ready: true }, { headers: noStore });
    response.cookies.set(createCustomerInvitationExchangeCookie(parsed.data.token));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    logServerError("customer.broker_invitation_exchange_failed", requestId, error);
    return NextResponse.json({ ready: false }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}

