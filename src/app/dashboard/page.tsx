import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";
import { loadDashboardView } from "@/features/portfolio/server/dashboard-view.service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const query = await searchParams;
  const { supabase, user } = await getAuthenticatedUser();
  const dashboard = await loadDashboardView({ supabase, userId: user.id });
  const { portfolio } = dashboard;

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

  const dashboardRevision = [
    portfolio?.updated_at ?? "new",
    dashboard.interests[0]?.id ?? "no-interest",
    dashboard.accessSummary.events[0]?.id ?? "no-access-event",
  ].join(":");

  return (
    <DashboardClient
      key={dashboardRevision}
      portfolio={portfolio}
      viewCount={dashboard.viewCount}
      userEmail={user.email ?? ""}
      shareUrl={shareUrl}
      isExpired={isExpired}
      daysLeft={daysLeft}
      media={dashboard.media}
      mediaUrls={dashboard.mediaUrls}
      horoscope={dashboard.horoscope}
      initialEditorOpen={query.edit === "1"}
      interests={dashboard.interests}
      accessSummary={dashboard.accessSummary}
    />
  );
}
