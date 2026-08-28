import "server-only";

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { DashboardRepository } from "./dashboard.repository";
import { createShareUrl } from "./share-url.service";

const rotateResultSchema = z.object({
  status: z.enum(["rotated", "not_published", "unauthorized"]),
  shareToken: z.string().optional(),
});

const unpublishResultSchema = z.object({
  status: z.enum(["unpublished", "already_unpublished", "not_found", "unauthorized"]),
});

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
 * Input: authenticated Supabase client. Output: the replacement absolute share URL.
 */
export async function rotatePortfolioLink({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const repository = new DashboardRepository(supabase);
  const shareToken = nanoid(21);
  const { data, error } = await repository.rotatePortfolioTransaction(shareToken);
  const result = rotateResultSchema.safeParse(data);
  if (error || !result.success) {
    throw new PortfolioShareLifecycleError("We could not rotate your portfolio link. Please try again.", "PORTFOLIO_LINK_ROTATION_FAILED");
  }
  if (result.data.status !== "rotated" || !result.data.shareToken) {
    throw new PortfolioShareLifecycleError("Generate your portfolio before rotating its link.", "PORTFOLIO_NOT_PUBLISHED", 400);
  }
  return { shareToken: result.data.shareToken, shareUrl: createShareUrl(result.data.shareToken) };
}

/**
 * Disables public access to an owner's portfolio while keeping all private draft data intact.
 * Input: authenticated Supabase client. Output: the resulting unpublish status.
 */
export async function unpublishPortfolio({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const repository = new DashboardRepository(supabase);
  const { data, error } = await repository.unpublishPortfolioTransaction();
  const result = unpublishResultSchema.safeParse(data);
  if (error || !result.success) {
    throw new PortfolioShareLifecycleError("We could not unpublish your portfolio. Please try again.", "PORTFOLIO_UNPUBLISH_PERSISTENCE_FAILED");
  }
  if (result.data.status === "not_found") {
    throw new PortfolioShareLifecycleError("Portfolio not found.", "PORTFOLIO_NOT_FOUND", 404);
  }
  if (result.data.status === "unauthorized") {
    throw new PortfolioShareLifecycleError("Your session cannot manage this portfolio.", "PORTFOLIO_FORBIDDEN", 403);
  }
  return { status: result.data.status };
}
