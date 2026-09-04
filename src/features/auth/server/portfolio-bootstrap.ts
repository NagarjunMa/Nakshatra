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
    .upsert(
      {
        user_id: userId,
        draft_data: {
          personal: {
            name: "",
            dob: "",
            gender: "male",
          },
        },
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (insertError) throw insertError;
  if (created?.id) return created.id as string;

  // A simultaneous first login may have created the row after our initial
  // lookup. The unique user_id constraint and conflict-safe upsert make that
  // race harmless; read back the winning row instead of failing authentication.
  const { data: concurrent, error: concurrentLookupError } = await supabase
    .from("portfolios")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (concurrentLookupError) throw concurrentLookupError;
  return concurrent.id as string;
}
