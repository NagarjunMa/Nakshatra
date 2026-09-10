import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { brokerdeskReauthPurposeSchema } from "@/features/organization-access/server/brokerdesk-reauth.contract";
import { createBrokerdeskReauthTransactionCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import {
  BrokerdeskReauthError,
  startBrokerdeskReauth,
} from "@/features/organization-access/server/brokerdesk-reauth.service";
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

type Context = { params: Promise<{ workspaceRef: string }> };
const startSchema = z.object({
  method: z.enum(["google", "email"]),
  purpose: brokerdeskReauthPurposeSchema,
}).strict();
const noStore = { "Cache-Control": "private, no-store" };

/** Begins a purpose-bound fresh-auth flow; it does not itself grant or mutate BrokerDesk access. */
export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const parsed = startSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) {
      return NextResponse.json(
        { code: "BROKERDESK_REAUTH_REQUEST_INVALID", error: "Choose a valid verification method and action." },
        { status: 400, headers: noStore }
      );
    }

    const auth = await getApiUser();
    if (auth.status !== "authenticated") {
      const response = apiAuthFailureResponse(auth);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    const rateLimited = await enforceRateLimit(auth.supabase, request, "brokerdesk_privileged_reauth");
    if (rateLimited) {
      rateLimited.headers.set("Cache-Control", "private, no-store");
      return rateLimited;
    }

    const { data: userData, error: userError } = await auth.supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user || user.id !== auth.user.id || !user.email || !user.email_confirmed_at) {
      return NextResponse.json(
        { code: "BROKERDESK_REAUTH_UNAVAILABLE", error: "Fresh authentication is temporarily unavailable." },
        { status: 503, headers: noStore }
      );
    }

    const { workspaceRef } = await context.params;
    const challenge = await startBrokerdeskReauth(
      auth.supabase,
      workspaceRef,
      parsed.data.purpose,
      auth.user.sessionId
    );
    const transactionCookie = createBrokerdeskReauthTransactionCookie({
      challengeId: challenge.challengeId,
      workspaceRef: challenge.workspaceRef,
      purpose: challenge.purpose,
    });
    const callbackUrl = createCanonicalAppUrl("/api/auth/callback?reauth=brokerdesk_action", request.url);
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
    response.cookies.set(transactionCookie);
    return response;
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    if (error instanceof BrokerdeskReauthError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status, headers: noStore }
      );
    }
    logServerError("brokerdesk.reauth.start_failed", requestId, error);
    return NextResponse.json(
      { code: "BROKERDESK_REAUTH_UNAVAILABLE", error: "Fresh authentication is temporarily unavailable." },
      { status: 503, headers: { ...noStore, "X-Request-Id": requestId } }
    );
  }
}
