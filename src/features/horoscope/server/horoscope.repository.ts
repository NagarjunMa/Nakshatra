import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const HOROSCOPE_COLUMNS = "id, portfolio_id, storage_path, mime_type, file_extension, byte_size, language_label, page_count, published_at, created_at, updated_at";

export class HoroscopeRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  findOwnedPortfolio(portfolioId: string, userId: string) {
    return this.supabase.from("portfolios").select("id").eq("id", portfolioId).eq("user_id", userId).single();
  }

  findPortfolioForOwner(userId: string) {
    return this.supabase.from("portfolios").select("id").eq("user_id", userId).maybeSingle();
  }

  findByPortfolio(portfolioId: string) {
    return this.supabase.from("portfolio_horoscopes").select(HOROSCOPE_COLUMNS).eq("portfolio_id", portfolioId).maybeSingle();
  }

  findById(id: string) {
    return this.supabase.from("portfolio_horoscopes").select(HOROSCOPE_COLUMNS).eq("id", id).single();
  }

  save(payload: Record<string, unknown>) {
    return this.supabase.from("portfolio_horoscopes").upsert(payload, { onConflict: "portfolio_id" }).select(HOROSCOPE_COLUMNS).single();
  }

  delete(id: string) {
    return this.supabase.from("portfolio_horoscopes").delete().eq("id", id).select(HOROSCOPE_COLUMNS).single();
  }

  publish(portfolioId: string, publishedAt: string) {
    return this.supabase.from("portfolio_horoscopes").update({ published_at: publishedAt }).eq("portfolio_id", portfolioId);
  }

  upload(path: string, body: Buffer, contentType: string) {
    return this.supabase.storage.from("horoscopes").upload(path, body, {
      contentType,
      cacheControl: "0",
      upsert: false,
    });
  }

  remove(paths: string[]) {
    if (!paths.length) return Promise.resolve({ error: null });
    return this.supabase.storage.from("horoscopes").remove(paths);
  }

  createSignedUrl(path: string, expiresInSeconds: number, download?: string) {
    return this.supabase.storage
      .from("horoscopes")
      .createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);
  }
}
