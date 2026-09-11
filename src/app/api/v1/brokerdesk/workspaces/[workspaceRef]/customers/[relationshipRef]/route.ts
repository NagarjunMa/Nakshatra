import { NextResponse } from "next/server";
import { CustomerInvitationError, resolveBrokerdeskCustomer } from "@/features/broker-relationships/server/customer-invitation.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string; relationshipRef: string }> };
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth); response.headers.set("Cache-Control", noStore["Cache-Control"]); return response;
    }
    const limited = await enforceRateLimit(auth.supabase, request, "brokerdesk_customer_read");
    if (limited) { limited.headers.set("Cache-Control", noStore["Cache-Control"]); return limited; }
    const { workspaceRef, relationshipRef } = await context.params;
    const result = await resolveBrokerdeskCustomer(auth.supabase, workspaceRef, relationshipRef);
    return result.available
      ? NextResponse.json(result, { headers: noStore })
      : NextResponse.json(result, { status: 404, headers: noStore });
  } catch (error) {
    if (error instanceof CustomerInvitationError) {
      return NextResponse.json({ available: false }, { status: error.status, headers: noStore });
    }
    logServerError("brokerdesk.customer_read_failed", requestId, error);
    return NextResponse.json({ available: false }, { status: 503, headers: { ...noStore, "X-Request-Id": requestId } });
  }
}
