import { NextResponse } from "next/server";
import { CustomerInvitationError, resolveCustomerBrokerRelationships } from "@/features/broker-relationships/server/customer-invitation.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "customer_broker_relationships_read");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }
    return NextResponse.json(await resolveCustomerBrokerRelationships(auth.supabase), { headers: noStore });
  } catch (error) {
    if (error instanceof CustomerInvitationError) {
      return NextResponse.json({ available: false }, { status: error.status, headers: noStore });
    }
    logServerError("customer.broker_relationships_read_failed", requestId, error);
    return NextResponse.json({ available: false }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
