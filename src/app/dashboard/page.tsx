import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let viewCount = 0;
  if (portfolio) {
    const { count } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_id", portfolio.id);
    viewCount = count ?? 0;
  }

  let shareUrl: string | null = null;
  if (portfolio?.share_token) {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    shareUrl = `${proto}://${host}/p/${portfolio.share_token}`;
  }

  let isExpired = false;
  let daysLeft: number | null = null;
  if (portfolio?.expires_at) {
    const expiresAt = new Date(portfolio.expires_at).getTime();
    // eslint-disable-next-line react-hooks/purity -- server component evaluated per request
    const now = Date.now();
    isExpired = expiresAt < now;
    daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86_400_000));
  }

  return (
    <DashboardClient
      portfolio={portfolio}
      viewCount={viewCount}
      userEmail={user.email ?? ""}
      shareUrl={shareUrl}
      isExpired={isExpired}
      daysLeft={daysLeft}
    />
  );
}
