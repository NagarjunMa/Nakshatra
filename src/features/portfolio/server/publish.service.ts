import "server-only";

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioData } from "@/types/portfolio";
import {
  CELESTIAL_UNION_TEMPLATE_ID,
  withCanonicalTemplate,
} from "@/features/portfolio/template";
import { DashboardRepository } from "./dashboard.repository";
import { createPublicPortfolioSnapshot } from "./public-snapshot.service";
import {
  PortfolioPublishReadinessError,
  requirePortfolioPublishReadiness,
} from "./publish-readiness.service";
import { getCelestialBackground } from "@/features/portfolio/celestial-theme";
import { createShareUrl } from "./share-url.service";
import { ensureProtectedPortfolioPhotoPreviews } from "@/features/media/server/media.service";
import { publishHoroscope } from "@/features/horoscope/server/horoscope.service";

export class PortfolioPublishError extends Error {
  constructor(
    message: string,
    readonly code = "PORTFOLIO_PUBLISH_FAILED",
    readonly status = 500
  ) {
    super(message);
  }
}

/**
 * Publishes an already-saved draft and creates its first safe public snapshot when needed.
 * Input: authenticated Supabase client, owner ID, and validated portfolio data. Output: resolves after owner and public persistence.
 */
export async function publishPortfolio({
  supabase,
  userId,
  data,
}: {
  supabase: SupabaseClient;
  userId: string;
  data: PortfolioData;
}) {
  const repository = new DashboardRepository(supabase);
  const { data: portfolio, error: findError } = await repository.findPortfolioForUser(userId);
  if (findError || !portfolio) {
    throw new PortfolioPublishError("Save your portfolio before generating it.", "PORTFOLIO_DRAFT_MISSING", 400);
  }

  const { data: publicHeroPhoto, error: publicHeroPhotoError } =
    await repository.findPublicHeroPhoto(portfolio.id);
  if (publicHeroPhotoError) {
    throw new PortfolioPublishError("We could not verify your public hero photo. Please try again.", "PUBLIC_HERO_CHECK_FAILED");
  }

  try {
    requirePortfolioPublishReadiness({
      data,
      hasPublicHeroPhoto: Boolean(publicHeroPhoto),
    });
  } catch (error) {
    if (error instanceof PortfolioPublishReadinessError) {
      throw new PortfolioPublishError(error.message, "PORTFOLIO_NOT_READY", 400);
    }
    throw error;
  }

  const canonicalData = {
    ...data,
    style: withCanonicalTemplate(data.style),
  } as PortfolioData;

  try {
    await ensureProtectedPortfolioPhotoPreviews({ supabase, portfolioId: portfolio.id });
  } catch {
    throw new PortfolioPublishError(
      "We could not safely prepare your protected photos. Please try again.",
      "PROTECTED_PHOTO_PREVIEW_FAILED"
    );
  }

  const publishedAt = new Date().toISOString();
  const updates: Record<string, unknown> = {
    draft_data: canonicalData,
    published_data: canonicalData,
    is_published: true,
    published_at: publishedAt,
    sun_sign: data.astrology?.rashi || null,
    theme_color: getCelestialBackground(data.style),
    template_id: CELESTIAL_UNION_TEMPLATE_ID,
  };

  const shareToken = portfolio.share_token || nanoid(21);
  const expiresAt = portfolio.expires_at ?? (() => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);
    return expiry.toISOString();
  })();

  if (!portfolio.is_published || !portfolio.share_token) {
    updates.share_token = shareToken;
    updates.expires_at = expiresAt;
  }

  const { error } = await repository.publishPortfolio(userId, updates);
  if (error) throw new PortfolioPublishError("We could not publish your portfolio. Please try again.", "PORTFOLIO_PERSISTENCE_FAILED");

  const { error: snapshotError } = await repository.savePublicSnapshot({
    portfolio_id: portfolio.id,
    share_token: shareToken,
    data: createPublicPortfolioSnapshot(canonicalData),
    template_id: updates.template_id,
    theme_color: updates.theme_color,
    sun_sign: updates.sun_sign,
    expires_at: expiresAt,
    published_at: updates.published_at,
    is_active: true,
  });
  if (snapshotError) {
    throw new PortfolioPublishError("We could not create the public portfolio safely. Please try again.", "PUBLIC_SNAPSHOT_PERSISTENCE_FAILED");
  }

  try {
    await publishHoroscope({ supabase, portfolioId: portfolio.id, publishedAt });
  } catch {
    throw new PortfolioPublishError(
      "Your portfolio was updated, but we could not publish its horoscope attachment. Please try again.",
      "HOROSCOPE_PUBLISH_FAILED"
    );
  }

  return {
    action: portfolio.is_published ? "updated" : "created",
    expiresAt,
    shareToken,
    shareUrl: createShareUrl(shareToken),
  } as const;
}
