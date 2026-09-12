import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [action = "", email = ""] = process.argv.slice(2);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before managing pilot creators.");
}
if (!['grant', 'revoke'].includes(action) || !email.includes('@') || email.length > 180) {
  throw new Error("Usage: npm run pilot:creator -- <grant|revoke> person@example.com");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await supabase.rpc("manage_b2c_creator_entitlement", {
  p_email: email,
  p_action: action,
});
if (error || !data || data.status !== (action === 'grant' ? 'granted' : 'revoked')) {
  throw new Error("The pilot creator entitlement operation did not complete.");
}

console.log(`Pilot creator entitlement ${data.status}.`);
