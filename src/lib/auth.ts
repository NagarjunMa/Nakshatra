import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Get authenticated user or redirect to login.
 * Use in server components and API routes.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

/**
 * Get authenticated user for API routes (returns null instead of redirect).
 */
export async function getApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase: null, user: null };
  }

  return { supabase, user };
}

// Re-export for server-side usage
export { isAuthError } from "@/lib/auth-utils";
