import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type InterestDecisionResult =
  | "approved"
  | "rejected"
  | "not_found"
  | "signin_required"
  | "unauthorized";

/** Applies an owner decision atomically with grant creation or revocation. */
export async function decideInterestRequest(
  supabase: SupabaseClient,
  interestRequestId: string,
  decision: "approved" | "rejected"
): Promise<InterestDecisionResult> {
  const { data, error } = await supabase.rpc("decide_interest_request", {
    p_interest_request_id: interestRequestId,
    p_decision: decision,
  });
  if (error) throw new Error("Interest decision could not be stored");
  return data as InterestDecisionResult;
}
