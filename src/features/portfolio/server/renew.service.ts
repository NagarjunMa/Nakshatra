import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DashboardRepository } from "./dashboard.repository";

export class PortfolioRenewalError extends Error {
  constructor(
    message: string,
    readonly code = "PORTFOLIO_RENEWAL_FAILED",
    readonly status = 500
  ) {
    super(message);
  }
}

/**
 * Extends the authenticated owner's portfolio link by 90 days.
 * Input: authenticated Supabase client and owner ID. Output: resolves after the expiry update succeeds.
 */
export async function renewPortfolioLink({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const repository = new DashboardRepository(supabase);
  const { data: portfolio, error: findError } = await repository.findPortfolioForUser(userId);
  if (findError || !portfolio || !portfolio.is_published) {
    throw new PortfolioRenewalError("Generate your portfolio before renewing its link.", "PORTFOLIO_NOT_PUBLISHED", 400);
  }

  const { error } = await repository.renewPortfolioLink(userId, expiresAt.toISOString());
  if (error) throw new PortfolioRenewalError("We could not renew your portfolio link. Please try again.", "PORTFOLIO_RENEWAL_PERSISTENCE_FAILED");

  const { error: snapshotError } = await repository.updatePublicSnapshot(portfolio.id, {
    expires_at: expiresAt.toISOString(),
    is_active: true,
  });
  if (snapshotError) throw new PortfolioRenewalError("We could not renew your public portfolio. Please try again.", "PUBLIC_SNAPSHOT_RENEWAL_FAILED");
}
