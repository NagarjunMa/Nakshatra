import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioData, PortfolioHoroscope, PortfolioMedia } from "@/types/portfolio";
import { HoroscopeRepository } from "@/features/horoscope/server/horoscope.repository";
import { horoscopeFormatLabel } from "@/features/horoscope/server/horoscope.contract";
import { PortfolioMediaRepository } from "@/features/media/server/media.repository";
import { ensurePortfolioPhotoPreviews } from "@/features/media/server/media.service";
import { createPortfolioPhotoUrls } from "@/features/media/server/photo-url.service";
import { createApprovedPortfolioSnapshot } from "./approved-snapshot.service";
import { DashboardRepository } from "./dashboard.repository";
import { createPublicPortfolioSnapshot } from "./public-snapshot.service";

/** Loads the authenticated owner's draft as the privacy-safe public preview. */
export async function loadOwnerPublicPreview(supabase: SupabaseClient, userId: string) {
  const { data: portfolio } = await new DashboardRepository(supabase)
    .findOwnerPreviewPortfolioForUser(userId);
  if (!portfolio) return null;

  const data = createPublicPortfolioSnapshot(portfolio.draft_data as PortfolioData);
  await ensurePortfolioPhotoPreviews({ supabase, portfolioId: portfolio.id });
  const { data: mediaRows } = await new PortfolioMediaRepository(supabase)
    .findPortfolioPhotos(portfolio.id);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (mediaRows ?? []) as PortfolioMedia[],
    viewer: "public",
    privacyMode: data.privacy_mode,
  });

  return { portfolio, data, photos };
}

/** Loads the authenticated owner's draft using the same projection shown to approved viewers. */
export async function loadOwnerApprovedPreview(supabase: SupabaseClient, userId: string) {
  const { data: portfolio } = await new DashboardRepository(supabase)
    .findOwnerPreviewPortfolioForUser(userId);
  if (!portfolio) return null;

  const data = createApprovedPortfolioSnapshot(portfolio.draft_data as PortfolioData);
  const mediaRepository = new PortfolioMediaRepository(supabase);
  const horoscopeRepository = new HoroscopeRepository(supabase);
  const [mediaResult, horoscopeResult] = await Promise.all([
    mediaRepository.findPortfolioPhotos(portfolio.id),
    horoscopeRepository.findByPortfolio(portfolio.id),
  ]);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (mediaResult.data ?? []) as PortfolioMedia[],
    viewer: "approved",
    privacyMode: data.privacy_mode,
  });
  const horoscope = horoscopeResult.data as PortfolioHoroscope | null;
  const horoscopeAttachment = horoscope
    ? {
        href: "/api/portfolio-horoscope/view",
        formatLabel: horoscopeFormatLabel(horoscope.file_extension),
        languageLabel: horoscope.language_label,
        pageCount: horoscope.page_count,
      }
    : undefined;

  return { portfolio, data, photos, horoscopeAttachment };
}
