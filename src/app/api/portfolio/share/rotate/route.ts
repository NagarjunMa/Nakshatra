import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  PortfolioShareLifecycleError,
  rotatePortfolioLink,
} from "@/features/portfolio/server/share-lifecycle.service";
import { requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

/** Rotates an authenticated owner's public portfolio URL and returns its replacement. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "portfolio_rotate");
  if (rateLimited) return rateLimited;

  try {
    return NextResponse.json(await rotatePortfolioLink({ supabase: auth.supabase }));
  } catch (error) {
    const lifecycleError = error instanceof PortfolioShareLifecycleError ? error : null;
    return NextResponse.json(
      {
        code: lifecycleError?.code || "PORTFOLIO_LINK_ROTATION_FAILED",
        error: lifecycleError?.message || "We could not rotate your portfolio link. Please try again.",
      },
      { status: lifecycleError?.status || 500 }
    );
  }
}
