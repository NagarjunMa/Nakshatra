import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Executes owner-scoped access lifecycle RPCs. */
export class AccessRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  listPortfolioAccess() {
    return this.supabase.rpc("list_portfolio_access");
  }

  manageGrant(grantId: string, action: "renew" | "revoke") {
    return this.supabase.rpc("manage_reveal_grant", {
      p_grant_id: grantId,
      p_action: action,
    });
  }
}
