import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const DASHBOARD_PORTFOLIO_COLUMNS = "id, user_id, candidate_id, share_token, draft_data, published_data, template_id, theme_color, sun_sign, is_published, published_at, expires_at, last_renewed_at, privacy_mode, visibility_settings, created_at, updated_at";
export const OWNER_PREVIEW_PORTFOLIO_COLUMNS = "id, draft_data, template_id, theme_color, sun_sign, privacy_mode";

export interface StoredPortfolio {
  id: string;
  candidate_id: string | null;
  theme_color: string | null;
  is_published: boolean;
  share_token: string | null;
  expires_at: string | null;
}

export interface PublicPortfolioSnapshotPayload {
  portfolio_id: string;
  share_token: string;
  data: Record<string, unknown>;
  template_id: number;
  theme_color: string | null;
  sun_sign: string | null;
  expires_at: string | null;
  published_at: string;
  is_active: boolean;
}

export interface PublishPortfolioTransactionPayload {
  portfolioId: string;
  draftData: Record<string, unknown>;
  publicData: Record<string, unknown>;
  approvedData: Record<string, unknown>;
  shareToken: string;
  expiresAt: string;
  templateId: number;
  themeColor: string | null;
  sunSign: string | null;
}

export interface SaveDashboardDraftTransactionPayload {
  portfolio: Record<string, unknown>;
  candidate: Record<string, unknown> | null;
  details: Record<string, Record<string, unknown>> | null;
  visibilityRules: Record<string, unknown>[];
  familyMembers: Array<{
    relationship: string;
    name?: string;
    occupation?: string;
    location?: string;
    marital_status?: string;
  }>;
  education: Record<string, unknown> | null;
  career: Record<string, unknown> | null;
}

/**
 * Performs dashboard persistence for server-side portfolio services.
 * Input: an authenticated Supabase client at construction and typed method arguments.
 * Output: Supabase query results for the service layer to validate and map.
 */
export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findPortfolioForUser(userId: string) {
    return this.supabase
      .from("portfolios")
      .select("id, candidate_id, theme_color, is_published, share_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
  }

  /** Loads the complete owner dashboard projection without using an unrestricted select. */
  async findDashboardPortfolioForUser(userId: string) {
    return this.supabase
      .from("portfolios")
      .select(DASHBOARD_PORTFOLIO_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
  }

  /** Loads only the portfolio fields needed by owner preview pages. */
  async findOwnerPreviewPortfolioForUser(userId: string) {
    return this.supabase
      .from("portfolios")
      .select(OWNER_PREVIEW_PORTFOLIO_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
  }

  async countPortfolioViews(portfolioId: string) {
    return this.supabase
      .from("portfolio_views")
      .select("id", { count: "exact", head: true })
      .eq("portfolio_id", portfolioId);
  }

  /** Persists the complete dashboard draft graph in one database transaction. */
  async saveDashboardDraftTransaction(payload: SaveDashboardDraftTransactionPayload) {
    return this.supabase.rpc("save_dashboard_draft_transaction", {
      p_payload: payload,
    });
  }

  /** Atomically persists owner, public, approved, and horoscope publication state. */
  async publishPortfolioTransaction(payload: PublishPortfolioTransactionPayload) {
    return this.supabase.rpc("publish_portfolio_transaction", {
      p_portfolio_id: payload.portfolioId,
      p_draft_data: payload.draftData,
      p_public_data: payload.publicData,
      p_approved_data: payload.approvedData,
      p_share_token: payload.shareToken,
      p_expires_at: payload.expiresAt,
      p_template_id: payload.templateId,
      p_theme_color: payload.themeColor,
      p_sun_sign: payload.sunSign,
    });
  }

  /**
   * Finds whether a portfolio has a photo intentionally selected for public hero display.
   * Input: portfolio ID. Output: a minimal public-hero row or null.
   */
  async findPublicHeroPhoto(portfolioId: string) {
    return this.supabase
      .from("portfolio_media")
      .select("id")
      .eq("portfolio_id", portfolioId)
      .eq("media_type", "hero")
      .eq("visibility", "public")
      .maybeSingle();
  }

  /** Atomically extends owner and public snapshot expiry. */
  async renewPortfolioTransaction(expiresAt: string) {
    return this.supabase.rpc("renew_portfolio_transaction", { p_expires_at: expiresAt });
  }

  /** Atomically rotates the canonical link and revokes grants bound to the old publication. */
  async rotatePortfolioTransaction(shareToken: string) {
    return this.supabase.rpc("rotate_portfolio_transaction", { p_share_token: shareToken });
  }

  /** Atomically disables public access and revokes every active reveal grant. */
  async unpublishPortfolioTransaction() {
    return this.supabase.rpc("unpublish_portfolio_transaction");
  }

}
