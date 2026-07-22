import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { portfolioDataSchema } from "@/types/portfolio";
import {
  PortfolioPublishError,
  publishPortfolio,
} from "@/features/portfolio/server/publish.service";
import { saveDashboardDraft } from "@/features/portfolio/server/dashboard.service";

export async function POST(request: Request) {
  const { supabase, user } = await getApiUser();
  if (!supabase || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = portfolioDataSchema.safeParse(payload?.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid portfolio data" }, { status: 400 });
  }

  try {
    await saveDashboardDraft({ supabase, userId: user.id, data: parsed.data });
    await publishPortfolio({ supabase, userId: user.id, data: parsed.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof PortfolioPublishError
      ? error.message
      : "Unable to publish portfolio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
