import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Executes the narrow RPC and Storage operations used by public portfolio pages. */
export class PublicPortfolioRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  resolvePublic(token: string) {
    return this.supabase.rpc("resolve_public_portfolio", { p_share_token: token });
  }

  resolveApproved(token: string) {
    return this.supabase.rpc("resolve_approved_portfolio", { p_share_token: token });
  }

  resolveApprovedHoroscope(token: string) {
    return this.supabase.rpc("resolve_approved_horoscope", { p_share_token: token });
  }

  findOwnedPortfolio(token: string, userId: string) {
    return this.supabase
      .from("portfolios")
      .select("id")
      .eq("share_token", token)
      .eq("user_id", userId)
      .maybeSingle();
  }

  recordView(token: string) {
    return this.supabase.rpc("record_public_portfolio_view", { p_share_token: token });
  }

  createPhotoUrl(path: string, expiresInSeconds: number) {
    return this.supabase.storage.from("photos").createSignedUrl(path, expiresInSeconds);
  }

  createHoroscopeUrl(
    path: string,
    expiresInSeconds: number,
    download?: string
  ) {
    return this.supabase.storage
      .from("horoscopes")
      .createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
  }
}
