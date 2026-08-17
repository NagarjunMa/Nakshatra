import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { portfolioDataSchema } from "@/types/portfolio";
import {
  PortfolioPublishError,
  publishPortfolio,
} from "@/features/portfolio/server/publish.service";
import { saveDashboardDraft } from "@/features/portfolio/server/dashboard.service";
import { readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "portfolio_publish");
  if (rateLimited) return rateLimited;

  let payload: { data?: unknown } | null;
  try {
    payload = await readJsonBody(request) as { data?: unknown } | null;
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const parsed = portfolioDataSchema.safeParse(payload?.data);
  if (!parsed.success) {
    return NextResponse.json({ code: "PORTFOLIO_DATA_INVALID", error: "Some portfolio details are invalid." }, { status: 400 });
  }

  try {
    await saveDashboardDraft({ supabase: auth.supabase, userId: auth.user.id, data: parsed.data });
    const result = await publishPortfolio({ supabase: auth.supabase, userId: auth.user.id, data: parsed.data });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const portfolioError = error instanceof PortfolioPublishError ? error : null;
    return NextResponse.json(
      {
        code: portfolioError?.code || "PORTFOLIO_PUBLISH_FAILED",
        error: portfolioError?.message || "We could not publish your portfolio. Please try again.",
      },
      { status: portfolioError?.status || 500 }
    );
  }
}
