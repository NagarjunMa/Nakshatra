import { createClient } from "@supabase/supabase-js";
import { createIdentityVerificationWorker } from "./identity-verification-worker.mjs";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before processing identity verifications.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const limit = Math.min(Math.max(Number.parseInt(process.env.IDENTITY_VERIFICATION_BATCH_SIZE || "10", 10) || 10, 1), 50);
const result = await createIdentityVerificationWorker(supabase).run(limit);
console.log(
  `Identity verification run complete: ${result.completed} completed, ${result.pending} pending, ${result.deferred} deferred.`,
);

// A pending provider decision is normal and is rescheduled by the database.
// A deferred item means a provider, network, or persistence operation failed;
// fail the scheduled run so the operational alert job can notify an owner.
if (result.deferred > 0) {
  throw new Error("IDENTITY_VERIFICATION_WORK_DEFERRED");
}
