import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";
import type { PortfolioHoroscope, PortfolioMedia } from "@/types/portfolio";
import { getPortfolioAccessSummary } from "@/features/access/server/access.service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<{ edit?: string | string[] }>;
} = {}) {
  const query = await searchParams;
  const { supabase, user } = await getAuthenticatedUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const dashboardData = portfolio
    ? await Promise.all([
      supabase
        .from("portfolio_views")
        .select("*", { count: "exact", head: true })
        .eq("portfolio_id", portfolio.id),
      supabase
        .from("portfolio_media")
        .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text, metadata")
        .eq("portfolio_id", portfolio.id)
        .in("media_type", ["hero", "gallery"])
        .order("sort_order"),
      supabase
        .from("portfolio_horoscopes")
        .select("id, portfolio_id, storage_path, mime_type, file_extension, byte_size, language_label, page_count, published_at, created_at, updated_at")
        .eq("portfolio_id", portfolio.id)
        .maybeSingle(),
      supabase
        .from("interest_requests")
        .select("id, viewer_name, viewer_phone, viewer_email, viewer_family_context, message, status, requester_user_id, metadata, created_at")
        .eq("portfolio_id", portfolio.id)
        .order("created_at", { ascending: false })
        .limit(12),
      getPortfolioAccessSummary(supabase),
    ])
    : null;
  const viewCount = dashboardData?.[0].count ?? 0;
  const media = (dashboardData?.[1].data ?? []) as PortfolioMedia[];
  const horoscope = (dashboardData?.[2].data as PortfolioHoroscope | null) ?? null;
  const interestRows = dashboardData?.[3].data ?? [];
  const accessSummary = dashboardData?.[4] ?? { grants: [], events: [] };

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
    interestRows?.[0]?.id ?? "no-interest",
    accessSummary.events[0]?.id ?? "no-access-event",
  ].join(":");

  return (
    <DashboardClient
      key={dashboardRevision}
      portfolio={portfolio}
      viewCount={viewCount}
      userEmail={user.email ?? ""}
      shareUrl={shareUrl}
      isExpired={isExpired}
      daysLeft={daysLeft}
      media={media}
      horoscope={horoscope}
      initialEditorOpen={query.edit === "1"}
      interests={interestRows}
      accessSummary={accessSummary}
    />
  );
}
