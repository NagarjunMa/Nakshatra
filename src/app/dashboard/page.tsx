import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";
import {
  normalizePortfolioPrivacyMode,
  portfolioDataSchema,
  portfolioDraftSchema,
  type Portfolio,
  type PortfolioHoroscope,
  type PortfolioMedia,
} from "@/types/portfolio";
import type { Database, Json } from "@/types/database.generated";
import { getPortfolioAccessSummary } from "@/features/access/server/access.service";

export const metadata: Metadata = {
  title: "Dashboard",
};

type PortfolioRow = Database["public"]["Tables"]["portfolios"]["Row"];

/** Validates JSON columns before moving a database row into the dashboard domain model. */
function mapPortfolioRow(row: PortfolioRow | null): Portfolio | null {
  if (!row) return null;
  const draft = portfolioDraftSchema.safeParse(row.draft_data);
  const published = portfolioDataSchema.safeParse(row.published_data);
  return {
    ...row,
    draft_data: draft.success ? draft.data : { personal: {} },
    published_data: published.success ? published.data : null,
    privacy_mode: normalizePortfolioPrivacyMode(row.privacy_mode),
    visibility_settings: jsonObject(row.visibility_settings) ?? {},
  };
}

/** Narrows JSON values to objects before client code reads named metadata fields. */
function jsonObject(value: Json): Record<string, Json | undefined> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
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
  const dashboardPortfolio = mapPortfolioRow(portfolio);
  const media = (dashboardData?.[1].data ?? []) as PortfolioMedia[];
  const horoscope = (dashboardData?.[2].data as PortfolioHoroscope | null) ?? null;
  const interestRows = (dashboardData?.[3].data ?? []).map((interest) => ({
    ...interest,
    metadata: jsonObject(interest.metadata),
  }));
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
      portfolio={dashboardPortfolio}
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
