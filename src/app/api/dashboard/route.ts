import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { portfolioDraftSchema, type PortfolioData } from "@/types/portfolio";
import {
  DashboardSaveError,
  saveDashboardDraft,
} from "@/features/portfolio/server/dashboard.service";

export async function PUT(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

  const payload = await request.json().catch(() => null);
  const parsed = portfolioDraftSchema.safeParse(payload?.data);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "DASHBOARD_DATA_INVALID", error: "Some dashboard details are invalid.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await saveDashboardDraft({
      supabase: auth.supabase,
      userId: auth.user.id,
      data: parsed.data as PortfolioData,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof DashboardSaveError
      ? error.message
      : "Unable to save portfolio details";
    return NextResponse.json({ code: "DASHBOARD_SAVE_FAILED", error: message }, { status: 500 });
  }
}
