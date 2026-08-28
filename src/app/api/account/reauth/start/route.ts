import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { startAccountDeletionReauth } from "@/features/account/server/account.service";
import { createReauthTransactionCookie } from "@/features/account/server/reauth-cookie";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  AUTH_BODY_LIMIT,
  RequestSecurityError,
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { getApiUser } from "@/lib/auth";
import { createCanonicalAppUrl } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";

const reauthStartSchema = z.object({ method: z.enum(["google", "email"]) }).strict();
const noStore = { "Cache-Control": "private, no-store" };

/** Begins a deletion-only Google or verified-account email reauthentication flow. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const parsed = reauthStartSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) {
      return NextResponse.json(
        { code: "DELETION_REAUTH_REQUEST_INVALID", error: "Choose a reauthentication method." },
        { status: 400, headers: noStore }
      );
    }

    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    const rateLimited = await enforceRateLimit(auth.supabase, request, "account_delete_reauth");
    if (rateLimited) {
      rateLimited.headers.set("Cache-Control", "private, no-store");
      return rateLimited;
    }

    const { data: userData, error: userError } = await auth.supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user || user.id !== auth.user.id || !user.email || !user.email_confirmed_at) {
      return NextResponse.json(
        { code: "DELETION_REAUTH_UNAVAILABLE", error: "Deletion reauthentication is temporarily unavailable." },
        { status: 503, headers: noStore }
      );
    }

    const challenge = await startAccountDeletionReauth(auth.supabase, auth.user.sessionId);
    const callbackUrl = createCanonicalAppUrl("/api/auth/callback?reauth=account_deletion", request.url);
    let response: NextResponse;
    if (parsed.data.method === "google") {
      const { data, error } = await auth.supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error || new Error("OAuth URL missing");
      response = NextResponse.json({ url: data.url }, { headers: noStore });
    } else {
      const { error } = await auth.supabase.auth.signInWithOtp({
        email: user.email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) throw error;
      response = NextResponse.json({ sent: true }, { headers: noStore });
    }
    response.cookies.set(createReauthTransactionCookie(challenge.challengeId));
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    logServerError("account.deletion_reauth.start_failed", requestId, error);
    return NextResponse.json(
      { code: "DELETION_REAUTH_START_FAILED", error: "We could not start deletion reauthentication. Please try again." },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } }
    );
  }
}

