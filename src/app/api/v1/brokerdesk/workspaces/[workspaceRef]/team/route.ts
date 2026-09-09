import { NextResponse } from "next/server";
import { resolveBrokerDeskTeam, OrganizationAccessError } from "@/features/organization-access/server/organization-access.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { getApiUser } from "@/lib/auth";
import { getRequestId, logServerError } from "@/lib/security/logging";

type Context = { params: Promise<{ workspaceRef: string }> };
const noStore = { "Cache-Control": "private, no-store" };

/** Returns a minimal, owner/admin-only employee projection for one opaque workspace reference. */
export async function GET(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_team_read");
    if (rateLimited) {
      rateLimited.headers.set("Cache-Control", "private, no-store");
      return rateLimited;
    }

    const { workspaceRef } = await context.params;
    const team = await resolveBrokerDeskTeam(auth.supabase, workspaceRef);
    return NextResponse.json(team, { headers: noStore });
  } catch (error) {
    if (error instanceof OrganizationAccessError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status, headers: noStore }
      );
    }
    logServerError("brokerdesk.team.read_failed", requestId, error);
    return NextResponse.json(
      { code: "BROKERDESK_TEAM_UNAVAILABLE", error: "Team access is temporarily unavailable." },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } }
    );
  }
}
