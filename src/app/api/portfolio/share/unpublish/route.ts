import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  PortfolioShareLifecycleError,
  unpublishPortfolio,
} from "@/features/portfolio/server/share-lifecycle.service";

/** Disables public access to the authenticated owner's portfolio without removing its private draft. */
export async function POST() {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

  try {
    return NextResponse.json(await unpublishPortfolio({ supabase: auth.supabase }));
  } catch (error) {
    const lifecycleError = error instanceof PortfolioShareLifecycleError ? error : null;
    return NextResponse.json(
      {
        code: lifecycleError?.code || "PORTFOLIO_UNPUBLISH_FAILED",
        error: lifecycleError?.message || "We could not unpublish your portfolio. Please try again.",
      },
      { status: lifecycleError?.status || 500 }
    );
  }
}
