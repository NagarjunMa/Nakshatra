import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Performs private photo storage and portfolio-media persistence operations.
 * Input: an authenticated Supabase client at construction and typed method arguments.
 * Output: Supabase query and storage results for the media service to validate.
 */
export class PortfolioMediaRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findOwnedPortfolio(portfolioId: string, userId: string) {
    return this.supabase
      .from("portfolios")
      .select("id, candidate_id")
      .eq("id", portfolioId)
      .eq("user_id", userId)
      .single();
  }

  async countProfilePhotos(portfolioId: string) {
    return this.supabase
      .from("portfolio_media")
      .select("id", { count: "exact", head: true })
      .eq("portfolio_id", portfolioId)
      .in("media_type", ["hero", "gallery"]);
  }

  async upload(path: string, body: Buffer) {
    return this.supabase.storage.from("photos").upload(path, body, {
      contentType: "image/webp",
    });
  }

  async remove(paths: string[]) {
    if (!paths.length) return { error: null };
    return this.supabase.storage.from("photos").remove(paths);
  }

  async createMedia(payload: Record<string, unknown>) {
    return this.supabase
      .from("portfolio_media")
      .insert(payload)
      .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text")
      .single();
  }

  async updateMedia(mediaId: string, updates: Record<string, unknown>) {
    return this.supabase
      .from("portfolio_media")
      .update(updates)
      .eq("id", mediaId)
      .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text")
      .single();
  }

  async demoteOtherHeroPhotos(portfolioId: string, mediaId: string) {
    return this.supabase
      .from("portfolio_media")
      .update({ media_type: "gallery" })
      .eq("portfolio_id", portfolioId)
      .neq("id", mediaId)
      .eq("media_type", "hero");
  }

  async deleteMedia(mediaId: string) {
    return this.supabase
      .from("portfolio_media")
      .delete()
      .eq("id", mediaId)
      .select("storage_path, thumbnail_path")
      .single();
  }
}
