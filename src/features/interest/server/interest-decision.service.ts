import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";

const interestDecisionResultSchema = z.enum([
  "approved",
  "rejected",
  "reopened",
  "already_approved",
  "already_rejected",
  "already_open",
  "invalid_transition",
  "not_found",
  "signin_required",
  "unauthorized",
]);

export type InterestDecisionResult = z.infer<typeof interestDecisionResultSchema>;

/** Applies an owner decision atomically with grant creation or revocation. */
export async function decideInterestRequest(
  supabase: SupabaseClient,
  interestRequestId: string,
  decision: "approved" | "rejected" | "reopened"
): Promise<InterestDecisionResult> {
  const { data, error } = await supabase.rpc("decide_interest_request", {
    p_interest_request_id: interestRequestId,
    p_decision: decision,
  });
  const result = interestDecisionResultSchema.safeParse(data);
  if (error || !result.success) throw new Error("Interest decision could not be stored");
  return result.data;
}
