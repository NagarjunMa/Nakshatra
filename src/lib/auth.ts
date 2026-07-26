import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ApiUserResult =
  | { status: "authenticated"; supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string } }
  | { status: "missing_session" }
  | { status: "invalid_session" }
  | { status: "service_unavailable" };

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
 * Resolves API authentication without redirecting the request.
 * Input: the current request's Supabase cookies. Output: an authenticated actor or a precise failure category.
 */
export async function getApiUser(): Promise<ApiUserResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.getClaims();

    if (error) return { status: "invalid_session" };
    if (!authData?.claims.sub) return { status: "missing_session" };

    return { status: "authenticated", supabase, user: { id: authData.claims.sub } };
  } catch {
    return { status: "service_unavailable" };
  }
}

// Re-export for server-side usage
export { isAuthError } from "@/lib/auth-utils";
