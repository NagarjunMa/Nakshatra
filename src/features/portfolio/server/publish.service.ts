import "server-only";

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import {
  normalizePortfolioPrivacyMode,
  type PortfolioData,
} from "@/types/portfolio";
import {
  CELESTIAL_UNION_TEMPLATE_ID,
  withCanonicalTemplate,
} from "@/features/portfolio/template";
import { DashboardRepository } from "./dashboard.repository";
import { createPublicPortfolioSnapshot } from "./public-snapshot.service";
import { createApprovedPortfolioSnapshot } from "./approved-snapshot.service";
import {
  PortfolioPublishReadinessError,
  requirePortfolioPublishReadiness,
} from "./publish-readiness.service";
import { getCelestialBackground } from "@/features/portfolio/celestial-theme";
import { createShareUrl } from "./share-url.service";
import { ensurePortfolioPhotoPreviews } from "@/features/media/server/media.service";

const publishTransactionResultSchema = z.object({
  status: z.enum(["ok", "unauthorized", "not_found", "not_ready"]),
  action: z.enum(["created", "updated"]).optional(),
  shareToken: z.string().optional(),
  expiresAt: z.string().optional(),
});

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
    throw new PortfolioPublishError("We could not verify your public primary photo. Please try again.", "PUBLIC_HERO_CHECK_FAILED");
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
    privacy_mode: normalizePortfolioPrivacyMode(data.privacy_mode),
    style: withCanonicalTemplate(data.style),
  } as PortfolioData;

  try {
    await ensurePortfolioPhotoPreviews({ supabase, portfolioId: portfolio.id });
  } catch {
    throw new PortfolioPublishError(
      "We could not safely prepare your protected photos. Please try again.",
      "PROTECTED_PHOTO_PREVIEW_FAILED"
    );
  }

  const shareToken = portfolio.share_token || nanoid(21);
  const expiresAt = portfolio.expires_at ?? (() => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);
    return expiry.toISOString();
  })();

  const themeColor = getCelestialBackground(data.style);
  const { data: transactionData, error: transactionError } =
    await repository.publishPortfolioTransaction({
      portfolioId: portfolio.id,
      draftData: canonicalData,
      publicData: createPublicPortfolioSnapshot(canonicalData),
      approvedData: createApprovedPortfolioSnapshot(canonicalData),
      shareToken,
      expiresAt,
      templateId: CELESTIAL_UNION_TEMPLATE_ID,
      themeColor,
      sunSign: data.astrology?.rashi || null,
    });
  const transaction = publishTransactionResultSchema.safeParse(transactionData);
  if (transactionError || !transaction.success) {
    throw new PortfolioPublishError("We could not publish your portfolio. Please try again.", "PORTFOLIO_TRANSACTION_FAILED");
  }
  if (transaction.data.status === "not_ready") {
    throw new PortfolioPublishError("Choose one public primary photo before publishing.", "PORTFOLIO_NOT_READY", 400);
  }
  if (transaction.data.status !== "ok" || !transaction.data.action || !transaction.data.shareToken || !transaction.data.expiresAt) {
    throw new PortfolioPublishError("We could not authorize this portfolio update.", "PORTFOLIO_NOT_FOUND", 404);
  }

  return {
    action: transaction.data.action,
    expiresAt: transaction.data.expiresAt,
    shareToken: transaction.data.shareToken,
    shareUrl: createShareUrl(transaction.data.shareToken),
  } as const;
}
