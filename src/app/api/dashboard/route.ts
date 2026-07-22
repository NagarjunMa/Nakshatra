import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { portfolioDraftSchema, type PortfolioData } from "@/types/portfolio";
import {
  DashboardSaveError,
  saveDashboardDraft,
} from "@/features/portfolio/server/dashboard.service";

export async function PUT(request: Request) {
  const { supabase, user } = await getApiUser();
  if (!supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = portfolioDraftSchema.safeParse(payload?.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dashboard data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await saveDashboardDraft({
      supabase,
      userId: user.id,
      data: parsed.data as PortfolioData,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof DashboardSaveError
      ? error.message
      : "Unable to save portfolio details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
