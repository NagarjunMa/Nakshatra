import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterestRequestInput } from "./interest.contract";

/** Calls the database-owned interest command so clients cannot set workflow fields. */
export class InterestRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  submit(input: InterestRequestInput) {
    return this.supabase.rpc("submit_public_interest", {
      p_share_token: input.portfolioToken,
      p_name: input.name,
      p_profile_for: input.profileFor,
      p_phone: input.phone,
      p_email: input.email,
      p_location: input.location,
      p_family_context: input.familyContext,
      p_message: input.message,
      p_portfolio_url: input.portfolioUrl || null,
    });
  }
}
