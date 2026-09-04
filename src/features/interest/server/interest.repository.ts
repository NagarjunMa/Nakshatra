import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterestRequestInput } from "./interest.contract";

/** Calls the database-owned interest command so clients cannot set workflow fields. */
export class InterestRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  submit(input: InterestRequestInput) {
    const location = [input.city, input.state, input.country]
      .filter((value): value is string => Boolean(value))
      .join(", ") || null;

    return this.supabase.rpc("submit_public_interest", {
      p_share_token: input.portfolioToken,
      p_name: input.name,
      p_profile_for: input.profileFor,
      p_phone: input.phone,
      p_email: input.email,
      p_location: location,
      p_family_context: input.familyContext ?? null,
      p_message: input.message ?? null,
      p_portfolio_url: input.portfolioUrl || null,
      p_country: input.country ?? null,
      p_state: input.state ?? null,
      p_city: input.city ?? null,
    });
  }

  /** Lists the newest owner-visible requests without exposing verification internals. */
  listForPortfolio(portfolioId: string, limit = 12) {
    return this.supabase
      .from("interest_requests")
      .select("id, viewer_name, viewer_phone, viewer_email, viewer_family_context, message, status, requester_user_id, metadata, created_at")
      .eq("portfolio_id", portfolioId)
      .order("created_at", { ascending: false })
      .limit(limit);
  }
}
