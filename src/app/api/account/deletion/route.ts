import { NextResponse } from "next/server";
import {
  AccountPrivacyError,
  cancelAccountDeletion,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from "@/features/account/server/account.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";

function accountError(error: unknown) {
  const known = error instanceof AccountPrivacyError ? error : null;
  return NextResponse.json(
    { code: known?.code || "ACCOUNT_PRIVACY_FAILED", error: known?.message || "We could not update your account privacy settings." },
    { status: known?.status || 503 }
  );
}

/** Returns the current user's pending deletion state. */
export async function GET() {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  try {
    return NextResponse.json({ deletion: await getAccountDeletionStatus(auth.supabase) });
  } catch (error) {
    return accountError(error);
  }
}

/** Revokes public access and schedules deletion while preserving private recovery-window access. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "account_delete");
  if (rateLimited) return rateLimited;

  try {
    const result = await requestAccountDeletion(auth.supabase);
    return NextResponse.json(result, { status: result.status === "pending" ? 202 : 409 });
  } catch (error) {
    return accountError(error);
  }
}

/** Cancels a deletion request that has not been claimed by the maintenance worker. */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "account_delete");
  if (rateLimited) return rateLimited;
  try {
    await cancelAccountDeletion(auth.supabase);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return accountError(error);
  }
}
