import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  PortfolioRenewalError,
  renewPortfolioLink,
} from "@/features/portfolio/server/renew.service";
import { requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "portfolio_renew");
  if (rateLimited) return rateLimited;

  try {
    return NextResponse.json(await renewPortfolioLink({ supabase: auth.supabase }));
  } catch (error) {
    const renewalError = error instanceof PortfolioRenewalError ? error : null;
    return NextResponse.json(
      {
        code: renewalError?.code || "PORTFOLIO_RENEWAL_FAILED",
        error: renewalError?.message || "We could not renew your portfolio link. Please try again.",
      },
      { status: renewalError?.status || 500 }
    );
  }
}
