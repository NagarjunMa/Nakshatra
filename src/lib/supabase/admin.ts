import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { env } from "@/lib/env";

const serviceRoleKeySchema = z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required");

/** Creates a non-persistent service client for narrowly scoped server-to-server work. */
export function createServiceRoleClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKeySchema.parse(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
