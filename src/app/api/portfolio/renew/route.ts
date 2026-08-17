import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  PortfolioRenewalError,
  renewPortfolioLink,
} from "@/features/portfolio/server/renew.service";

export async function POST() {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

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
