import "server-only";

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioData } from "@/types/portfolio";
import { DashboardRepository } from "./dashboard.repository";

/** Selects the persisted template ID from the dashboard template label. Input: optional template label. Output: supported database template ID. */
function templateIdFor(templateName?: string) {
  switch (templateName) {
    case "Celestial Union":
      return 2;
    case "Royal Heritage":
      return 3;
    case "Editorial Matrimonial":
      return 1;
    default:
      return 3;
  }
}

export class PortfolioPublishError extends Error {}

/**
 * Publishes an already-saved draft and creates its first share link when needed.
 * Input: authenticated Supabase client, owner ID, and validated portfolio data. Output: resolves after persistence.
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
    throw new PortfolioPublishError("Save your portfolio before publishing it");
  }

  const updates: Record<string, unknown> = {
    draft_data: data,
    published_data: data,
    is_published: true,
    published_at: new Date().toISOString(),
    sun_sign: data.astrology?.rashi || null,
    theme_color: data.style?.theme_color || null,
    template_id: templateIdFor(data.style?.template_name),
  };

  if (!portfolio.is_published) {
    updates.share_token = nanoid(8);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 90);
    updates.expires_at = expiry.toISOString();
  }

  const { error } = await repository.publishPortfolio(userId, updates);
  if (error) throw new PortfolioPublishError("Could not publish portfolio");
}
