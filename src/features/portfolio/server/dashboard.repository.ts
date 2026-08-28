import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

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

  async savePortfolio(
    userId: string,
    existingPortfolioId: string | undefined,
    payload: Record<string, unknown>
  ) {
    const query = existingPortfolioId
      ? this.supabase.from("portfolios").update(payload).eq("id", existingPortfolioId)
      : this.supabase.from("portfolios").insert({ user_id: userId, ...payload });

    return query.select("id, candidate_id").single();
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

  async saveCandidate(
    candidateId: string | null,
    payload: Record<string, unknown>
  ) {
    if (candidateId) {
      const { data, error } = await this.supabase
        .from("candidates")
        .update(payload)
        .eq("id", candidateId)
        .select("id")
        .single();
      return { candidateId: data?.id ?? null, error };
    }

    const { data, error } = await this.supabase
      .from("candidates")
      .insert(payload)
      .select("id")
      .single();
    return { candidateId: data?.id ?? null, error };
  }

  async linkCandidate(portfolioId: string, candidateId: string) {
    return this.supabase
      .from("portfolios")
      .update({ candidate_id: candidateId })
      .eq("id", portfolioId)
      .select("id")
      .single();
  }

  async saveCandidateDetails(candidateId: string, details: Record<string, Record<string, unknown>>) {
    return Promise.all([
      this.supabase
        .from("candidate_personal_details")
        .upsert({ candidate_id: candidateId, ...details.personal }),
      this.supabase
        .from("candidate_astrology_details")
        .upsert({ candidate_id: candidateId, ...details.astrology }),
      this.supabase
        .from("candidate_lifestyle_details")
        .upsert({ candidate_id: candidateId, ...details.lifestyle }),
      this.supabase
        .from("candidate_partner_preferences")
        .upsert({ candidate_id: candidateId, ...details.preferences }),
    ]);
  }

  async saveVisibilityRules(rules: Record<string, unknown>[]) {
    return this.supabase
      .from("visibility_rules")
      .upsert(rules, { onConflict: "portfolio_id,section_key" });
  }

  async replaceCandidateRelationshipsAndTimeline(
    candidateId: string,
    members: Array<{
      relationship: string;
      name?: string;
      occupation?: string;
      location?: string;
      marital_status?: string;
    }>,
    education: Record<string, unknown> | null,
    career: Record<string, unknown> | null
  ) {
    return this.supabase.rpc("replace_candidate_relationships_and_timeline", {
      p_candidate_id: candidateId,
      p_family_members: members,
      p_education: education,
      p_career: career,
    });
  }
}
