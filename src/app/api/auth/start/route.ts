import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_BODY_LIMIT,
  RequestSecurityError,
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { createCanonicalAppUrl, sanitizeInternalRedirect } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/features/security/server/rate-limit.service";

const authStartSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("google"), redirect: z.string().max(500).optional() }),
  z.object({
    method: z.literal("email"),
    email: z.string().trim().email().max(180),
    redirect: z.string().max(500).optional(),
  }),
]);

/** Starts OAuth or passwordless authentication behind origin, body-size, redirect, and rate-limit controls. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const parsed = authStartSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) {
      return NextResponse.json(
        { code: "AUTH_REQUEST_INVALID", error: "Enter a valid email or choose Google sign in." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const action = parsed.data.method === "google" ? "auth_google" : "auth_email";
    const quota = await consumeRateLimit(supabase, request, action);
    if (!quota.allowed) return rateLimitResponse(quota.retryAfter);

    const redirect = sanitizeInternalRedirect(parsed.data.redirect);
    const callbackUrl = createCanonicalAppUrl(
      `/api/auth/callback?next=${encodeURIComponent(redirect)}`,
      request.url
    );

    if (parsed.data.method === "google") {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error || new Error("OAuth URL missing");
      return NextResponse.json({ url: data.url }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: callbackUrl },
    });
    if (error) throw error;
    return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return requestSecurityErrorResponse(error);
    }
    logServerError("auth.start.failed", requestId, error);
    return NextResponse.json(
      { code: "AUTH_START_FAILED", error: "We could not start sign in. Please try again." },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  }
}
