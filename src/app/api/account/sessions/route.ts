import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";

/** Revokes all other Supabase sessions while keeping the current browser signed in. */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "session_manage");
  if (rateLimited) return rateLimited;

  const { error } = await auth.supabase.auth.signOut({ scope: "others" });
  if (error) {
    return NextResponse.json(
      { code: "SESSION_REVOCATION_FAILED", error: "We could not sign out your other devices." },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}

