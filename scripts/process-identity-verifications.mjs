import { createClient } from "@supabase/supabase-js";
import { createIdentityVerificationWorker } from "./identity-verification-worker.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before processing identity verifications.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const limit = Math.min(Math.max(Number.parseInt(process.env.IDENTITY_VERIFICATION_BATCH_SIZE || "10", 10) || 10, 1), 50);
const result = await createIdentityVerificationWorker(supabase).run(limit);
console.log(`Identity verification run complete: ${result.completed} completed, ${result.deferred} deferred.`);
