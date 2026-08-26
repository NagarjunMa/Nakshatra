import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InterestRequestInput } from "./interest.contract";
import { InterestRepository } from "./interest.repository";

export class InterestSubmissionError extends Error {}

/** Submits an interest request and distinguishes unavailable links from server failures. */
export async function submitInterestRequest(
  supabase: SupabaseClient,
  input: InterestRequestInput
): Promise<"created" | "unavailable"> {
  const { data, error } = await new InterestRepository(supabase).submit(input);
  if (error) throw new InterestSubmissionError("Interest request could not be stored");
  return data === true ? "created" : "unavailable";
}
