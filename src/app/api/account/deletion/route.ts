import { NextResponse } from "next/server";
import {
  AccountPrivacyError,
  cancelAccountDeletion,
  consumeAccountDeletionReauth,
  getAccountDeletionStatus,
} from "@/features/account/server/account.service";
import {
  clearDeletionProofCookie,
  deletionReauthCookieNames,
  hashDeletionProof,
  readDeletionProofCookie,
  readRequestCookie,
} from "@/features/account/server/reauth-cookie";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  AUTH_BODY_LIMIT,
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { z } from "zod/v4";

const deletionConfirmationSchema = z.object({ confirmation: z.literal("DELETE") }).strict();
const noStore = { "Cache-Control": "private, no-store" };

function accountError(error: unknown, clearProof = false) {
  const known = error instanceof AccountPrivacyError ? error : null;
  const response = NextResponse.json(
    { code: known?.code || "ACCOUNT_PRIVACY_FAILED", error: known?.message || "We could not update your account privacy settings." },
    { status: known?.status || 503, headers: noStore }
  );
  if (clearProof) response.cookies.set(clearDeletionProofCookie());
  return response;
}

/** Returns the current user's pending deletion state. */
export async function GET() {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") {
    const response = apiAuthFailureResponse(auth);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  try {
    return NextResponse.json({ deletion: await getAccountDeletionStatus(auth.supabase) }, { headers: noStore });
  } catch (error) {
    return accountError(error);
  }
}

/** Schedules deletion only after exact confirmation and atomically consumed fresh-session proof. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") {
    const response = apiAuthFailureResponse(auth);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const rateLimited = await enforceRateLimit(auth.supabase, request, "account_delete");
  if (rateLimited) {
    rateLimited.headers.set("Cache-Control", "private, no-store");
    return rateLimited;
  }

  const confirmation = deletionConfirmationSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
  if (!confirmation.success) {
    return NextResponse.json(
      { code: "ACCOUNT_DELETION_CONFIRMATION_INVALID", error: "Type DELETE exactly to schedule account deletion." },
      { status: 400, headers: noStore }
    );
  }

  const rawProofCookie = readRequestCookie(request, deletionReauthCookieNames.proof);
  const proof = readDeletionProofCookie(rawProofCookie);
  if (!proof) {
    const response = NextResponse.json(
      { code: "DELETION_REAUTH_REQUIRED", error: "Reauthenticate again before scheduling account deletion." },
      { status: 403, headers: noStore }
    );
    if (rawProofCookie) response.cookies.set(clearDeletionProofCookie());
    return response;
  }

  try {
    const result = await consumeAccountDeletionReauth(auth.supabase, hashDeletionProof(proof.proof));
    const response = NextResponse.json(result, {
      status: result.status === "pending" ? 202 : 409,
      headers: noStore,
    });
    response.cookies.set(clearDeletionProofCookie());
    return response;
  } catch (error) {
    return accountError(error, true);
  }
}

/** Cancels a deletion request that has not been claimed by the maintenance worker. */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") {
    const response = apiAuthFailureResponse(auth);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const rateLimited = await enforceRateLimit(auth.supabase, request, "account_delete");
  if (rateLimited) {
    rateLimited.headers.set("Cache-Control", "private, no-store");
    return rateLimited;
  }
  try {
    await cancelAccountDeletion(auth.supabase);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return accountError(error);
  }
}
