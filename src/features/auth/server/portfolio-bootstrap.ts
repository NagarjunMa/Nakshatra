import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Ensures an authenticated portfolio owner has exactly one editable portfolio. */
export async function ensureOwnerPortfolio(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: existing, error: lookupError } = await supabase
    .from("portfolios")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("portfolios")
    .insert({
      user_id: userId,
      draft_data: {
        personal: {
          name: "",
          dob: "",
          gender: "male",
        },
      },
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id as string;
}
