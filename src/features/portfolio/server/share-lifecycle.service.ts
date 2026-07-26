import "server-only";

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DashboardRepository } from "./dashboard.repository";
import { createShareUrl } from "./share-url.service";

export class PortfolioShareLifecycleError extends Error {
  constructor(
    message: string,
    readonly code = "PORTFOLIO_SHARE_LIFECYCLE_FAILED",
    readonly status = 500
  ) {
    super(message);
  }
}

/**
 * Rotates a published portfolio's canonical token and invalidates its former public URL.
 * Input: authenticated Supabase client and owner user ID. Output: the replacement absolute share URL.
 */
export async function rotatePortfolioLink({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const repository = new DashboardRepository(supabase);
  const { data: portfolio, error: findError } = await repository.findPortfolioForUser(userId);
  if (findError || !portfolio?.is_published) {
    throw new PortfolioShareLifecycleError("Generate your portfolio before rotating its link.", "PORTFOLIO_NOT_PUBLISHED", 400);
  }

  const shareToken = nanoid(21);
  const { error: portfolioError } = await repository.publishPortfolio(userId, { share_token: shareToken });
  if (portfolioError) throw new PortfolioShareLifecycleError("We could not rotate your portfolio link. Please try again.", "PORTFOLIO_LINK_ROTATION_PERSISTENCE_FAILED");

  const { error: snapshotError } = await repository.updatePublicSnapshot(portfolio.id, {
    share_token: shareToken,
    is_active: true,
  });
  if (snapshotError) throw new PortfolioShareLifecycleError("We could not update your public portfolio link. Please try again.", "PUBLIC_SNAPSHOT_ROTATION_FAILED");

  return { shareToken, shareUrl: createShareUrl(shareToken) };
}

/**
 * Disables public access to an owner's portfolio while keeping all private draft data intact.
 * Input: authenticated Supabase client and owner user ID. Output: resolves after public access is disabled.
 */
export async function unpublishPortfolio({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const repository = new DashboardRepository(supabase);
  const { data: portfolio, error: portfolioError } = await repository.unpublishPortfolio(userId);
  if (portfolioError || !portfolio) {
    throw new PortfolioShareLifecycleError("We could not unpublish your portfolio. Please try again.", "PORTFOLIO_UNPUBLISH_PERSISTENCE_FAILED");
  }

  const { error: snapshotError } = await repository.updatePublicSnapshot(portfolio.id, {
    is_active: false,
  });
  if (snapshotError) throw new PortfolioShareLifecycleError("We could not disable your public portfolio safely. Please try again.", "PUBLIC_SNAPSHOT_UNPUBLISH_FAILED");
}
