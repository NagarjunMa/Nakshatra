import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterestRequestInput } from "./interest.contract";
import { InterestRepository } from "./interest.repository";

export type InterestSubmissionFailureReason =
  | "own_portfolio"
  | "existing_request"
  | "verification_required"
  | "invalid_request"
  | "database_update_required"
  | "persistence_failed";

export class InterestSubmissionError extends Error {
  constructor(
    message: string,
    readonly reason: InterestSubmissionFailureReason = "persistence_failed",
    readonly databaseCode?: string
  ) {
    super(message);
    this.name = "InterestSubmissionError";
  }
}

/** Submits an interest request and distinguishes unavailable links from server failures. */
export async function submitInterestRequest(
  supabase: SupabaseClient,
  input: InterestRequestInput
): Promise<"created" | "unavailable"> {
  const { data, error } = await new InterestRepository(supabase).submit(input);
  if (error) {
    const message = error.message.toLowerCase();
    if (error.code === "22023" && message.includes("portfolio owner cannot request own portfolio")) {
      throw new InterestSubmissionError("Portfolio owners cannot request their own portfolio", "own_portfolio", error.code);
    }
    if (error.code === "23505" && message.includes("idx_interest_requests_candidate_prospect")) {
      throw new InterestSubmissionError("A matching interest request already exists", "existing_request", error.code);
    }
    if (error.code === "42501" && message.includes("verified email required")) {
      throw new InterestSubmissionError("A verified email session is required", "verification_required", error.code);
    }
    if (error.code === "22023") {
      throw new InterestSubmissionError("The database rejected the request details", "invalid_request", error.code);
    }
    if (["PGRST202", "PGRST203", "PGRST204", "42703", "42883"].includes(error.code)) {
      throw new InterestSubmissionError("The interest database update has not been applied", "database_update_required", error.code);
    }
    throw new InterestSubmissionError("Interest request could not be stored", "persistence_failed", error.code);
  }
  return data === true ? "created" : "unavailable";
}
