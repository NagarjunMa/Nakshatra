import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import {
  PortfolioRenewalError,
  renewPortfolioLink,
} from "@/features/portfolio/server/renew.service";

export async function POST() {
  const { supabase, user } = await getApiUser();
  if (!supabase || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await renewPortfolioLink({ supabase, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof PortfolioRenewalError
      ? error.message
      : "Unable to renew portfolio link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
