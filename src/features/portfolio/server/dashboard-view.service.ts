import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.generated";
import {
  normalizePortfolioPrivacyMode,
  portfolioDataSchema,
  portfolioDraftSchema,
  type Portfolio,
  type PortfolioHoroscope,
  type PortfolioMedia,
} from "@/types/portfolio";
import { getPortfolioAccessSummary } from "@/features/access/server/access.service";
import { HoroscopeRepository } from "@/features/horoscope/server/horoscope.repository";
import { InterestRepository } from "@/features/interest/server/interest.repository";
import { PortfolioMediaRepository } from "@/features/media/server/media.repository";
import { createOwnerPortfolioMediaPreviewUrls } from "@/features/media/server/photo-url.service";
import { DashboardRepository } from "./dashboard.repository";

type PortfolioRow = Database["public"]["Tables"]["portfolios"]["Row"];

function jsonObject(value: Json): Record<string, Json | undefined> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

/** Validates persisted JSON before returning the owner dashboard projection. */
export function mapDashboardPortfolio(row: PortfolioRow | null): Portfolio | null {
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

/** Loads and validates every owner dashboard read through feature repositories. */
export async function loadDashboardView({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const dashboardRepository = new DashboardRepository(supabase);
  const { data: portfolioRow } = await dashboardRepository.findDashboardPortfolioForUser(userId);
  const portfolio = mapDashboardPortfolio(portfolioRow as PortfolioRow | null);

  if (!portfolio) {
    return {
      portfolio: null,
      viewCount: 0,
      media: [] as PortfolioMedia[],
      mediaUrls: {} as Record<string, string>,
      horoscope: null as PortfolioHoroscope | null,
      interests: [],
      accessSummary: { grants: [], events: [] },
    };
  }

  const mediaRepository = new PortfolioMediaRepository(supabase);
  const horoscopeRepository = new HoroscopeRepository(supabase);
  const interestRepository = new InterestRepository(supabase);
  const [views, mediaResult, horoscopeResult, interestsResult, accessSummary] = await Promise.all([
    dashboardRepository.countPortfolioViews(portfolio.id),
    mediaRepository.findPortfolioPhotos(portfolio.id),
    horoscopeRepository.findByPortfolio(portfolio.id),
    interestRepository.listForPortfolio(portfolio.id),
    getPortfolioAccessSummary(supabase),
  ]);
  const media = (mediaResult.data ?? []) as PortfolioMedia[];
  const mediaUrls = await createOwnerPortfolioMediaPreviewUrls({ supabase, media });
  const interests = (interestsResult.data ?? []).map((interest) => ({
    ...interest,
    metadata: jsonObject(interest.metadata),
  }));

  return {
    portfolio,
    viewCount: views.count ?? 0,
    media,
    mediaUrls,
    horoscope: (horoscopeResult.data as PortfolioHoroscope | null) ?? null,
    interests,
    accessSummary,
  };
}
