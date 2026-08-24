import { createClient } from "@supabase/supabase-js";
import { createAccountDeletionWorker } from "./account-deletion-worker.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before processing deletions.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const limit = Math.min(Math.max(Number.parseInt(process.env.DELETION_BATCH_SIZE || "10", 10) || 10, 1), 50);
const result = await createAccountDeletionWorker(supabase).run(limit);
console.log(`Account deletion run complete: ${result.completed} completed, ${result.deferred} deferred.`);
