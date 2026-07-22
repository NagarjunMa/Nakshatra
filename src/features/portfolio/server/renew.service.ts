import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DashboardRepository } from "./dashboard.repository";

export class PortfolioRenewalError extends Error {}

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
  const { error } = await repository.renewPortfolioLink(userId, expiresAt.toISOString());
  if (error) throw new PortfolioRenewalError("Could not renew portfolio link");
}
