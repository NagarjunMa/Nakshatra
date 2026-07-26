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

  async publishPortfolio(userId: string, payload: Record<string, unknown>) {
    return this.supabase
      .from("portfolios")
      .update(payload)
      .eq("user_id", userId);
  }

  /**
   * Stores the whitelisted public representation of a portfolio separately from owner data.
   * Input: one snapshot row keyed by portfolio ID. Output: the Supabase upsert result.
   */
  async savePublicSnapshot(payload: Record<string, unknown>) {
    return this.supabase
      .from("public_portfolio_snapshots")
      .upsert(payload, { onConflict: "portfolio_id" });
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

  /**
   * Updates lifecycle fields on the sanitized snapshot without exposing owner data.
   * Input: owner portfolio ID and safe snapshot lifecycle changes. Output: Supabase update result.
   */
  async updatePublicSnapshot(
    portfolioId: string,
    updates: Partial<Pick<PublicPortfolioSnapshotPayload, "share_token" | "expires_at" | "is_active">>
  ) {
    return this.supabase
      .from("public_portfolio_snapshots")
      .update(updates)
      .eq("portfolio_id", portfolioId);
  }

  /**
   * Disables the owner's public portfolio while retaining their private draft and generated snapshot.
   * Input: owner user ID. Output: Supabase update result for the owner portfolio row.
   */
  async unpublishPortfolio(userId: string) {
    return this.supabase
      .from("portfolios")
      .update({ is_published: false })
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
  }

  async renewPortfolioLink(userId: string, expiresAt: string) {
    return this.supabase
      .from("portfolios")
      .update({
        expires_at: expiresAt,
        last_renewed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  async saveCandidate(
    candidateId: string | null,
    payload: Record<string, unknown>
  ) {
    if (candidateId) {
      const { error } = await this.supabase
        .from("candidates")
        .update(payload)
        .eq("id", candidateId);
      return { candidateId, error };
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
      .eq("id", portfolioId);
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

  async replaceFamilyMembers(
    candidateId: string,
    members: Array<{ relationship: string; name?: string; occupation?: string }>
  ) {
    const { error: deleteError } = await this.supabase
      .from("candidate_family_members")
      .delete()
      .eq("candidate_id", candidateId);
    if (deleteError || !members.length) return { error: deleteError };

    return this.supabase.from("candidate_family_members").insert(
      members.map((member, sort_order) => ({ candidate_id: candidateId, ...member, sort_order }))
    );
  }

  async replaceEducationAndCareer(
    candidateId: string,
    education: Record<string, unknown> | null,
    career: Record<string, unknown> | null
  ) {
    const [educationDelete, careerDelete] = await Promise.all([
      this.supabase.from("candidate_education_entries").delete().eq("candidate_id", candidateId),
      this.supabase.from("candidate_career_entries").delete().eq("candidate_id", candidateId),
    ]);
    if (educationDelete.error || careerDelete.error) {
      return { error: educationDelete.error || careerDelete.error };
    }

    const writes = await Promise.all([
      education
        ? this.supabase
            .from("candidate_education_entries")
            .insert({ candidate_id: candidateId, ...education })
        : Promise.resolve({ error: null }),
      career
        ? this.supabase
            .from("candidate_career_entries")
            .insert({ candidate_id: candidateId, ...career })
        : Promise.resolve({ error: null }),
    ]);

    return { error: writes.find(({ error }) => error)?.error ?? null };
  }
}
