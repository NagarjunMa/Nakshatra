import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

export type ApiUserResult =
  | { status: "authenticated"; supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string; sessionId: string } }
  | { status: "missing_session" }
  | { status: "invalid_session" }
  | { status: "revoked_session" }
  | { status: "service_unavailable" };

type LiveSessionStatus = "active" | "revoked" | "unavailable";
const apiSessionClaimsSchema = z.object({ sub: z.uuid(), session_id: z.uuid() });

/** Resolves whether the verified JWT still has a matching row in Supabase Auth sessions. */
async function getLiveSessionStatus(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<LiveSessionStatus> {
  const { data, error } = await supabase.rpc("is_current_session_active");
  if (error) return "unavailable";
  return data === true ? "active" : "revoked";
}

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

  const sessionStatus = await getLiveSessionStatus(supabase);
  if (sessionStatus === "revoked") {
    redirect("/login?error=session_revoked");
  }
  if (sessionStatus === "unavailable") {
    throw new Error("Authentication service unavailable");
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
    const claims = apiSessionClaimsSchema.safeParse(authData.claims);
    if (!claims.success) return { status: "invalid_session" };
    const sessionStatus = await getLiveSessionStatus(supabase);
    if (sessionStatus === "unavailable") return { status: "service_unavailable" };
    if (sessionStatus === "revoked") return { status: "revoked_session" };

    return { status: "authenticated", supabase, user: { id: claims.data.sub, sessionId: claims.data.session_id } };
  } catch {
    return { status: "service_unavailable" };
  }
}

// Re-export for server-side usage
export { isAuthError } from "@/lib/auth-utils";
