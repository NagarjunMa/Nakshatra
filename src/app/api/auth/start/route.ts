import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { ensureOwnerPortfolio } from "@/features/auth/server/portfolio-bootstrap";
import {
  consumeRateLimit,
  rateLimitResponse,
} from "@/features/security/server/rate-limit.service";
import {
  AUTH_BODY_LIMIT,
  readJsonBody,
  RequestSecurityError,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { getRequestId, logServerError } from "@/lib/security/logging";
import { createCanonicalAppUrl, sanitizeInternalRedirect } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

const password = z.string().min(8).max(72);
const email = z.string().trim().email().max(180);

const authStartSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("google"), redirect: z.string().max(500).optional() }),
  z.object({
    method: z.literal("password_signup"),
    name: z.string().trim().min(2).max(120),
    email,
    password,
    redirect: z.string().max(500).optional(),
  }),
  z.object({
    method: z.literal("password_signin"),
    email,
    password: z.string().min(1).max(72),
    redirect: z.string().max(500).optional(),
  }),
  z.object({
    method: z.literal("email_otp"),
    email,
    redirect: z.string().max(500).optional(),
  }),
  z.object({
    method: z.literal("resend_signup"),
    email,
    redirect: z.string().max(500).optional(),
  }),
  z.object({
    method: z.literal("password_recovery"),
    email,
  }),
]);

/** Starts owner authentication or viewer email verification behind one guarded endpoint. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const parsed = authStartSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) {
      return NextResponse.json(
        { code: "AUTH_REQUEST_INVALID", error: "Check the information and try again." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const quota = await consumeRateLimit(
      supabase,
      request,
      parsed.data.method === "google" ? "auth_google" : "auth_email"
    );
    if (!quota.allowed) return rateLimitResponse(quota.retryAfter);

    if (parsed.data.method === "google") {
      const redirect = sanitizeInternalRedirect(parsed.data.redirect);
      const callbackUrl = createCanonicalAppUrl(
        `/api/auth/callback?next=${encodeURIComponent(redirect)}`,
        request.url
      );
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error || new Error("OAuth URL missing");
      return NextResponse.json(
        { url: data.url },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (parsed.data.method === "password_signup") {
      const redirect = sanitizeInternalRedirect(parsed.data.redirect);
      const callbackUrl = createCanonicalAppUrl(
        `/api/auth/callback?next=${encodeURIComponent(redirect)}`,
        request.url
      );
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: callbackUrl,
          data: { full_name: parsed.data.name, account_type: "portfolio_owner" },
        },
      });
      if (error) {
        return NextResponse.json(
          { code: "SIGNUP_FAILED", error: "We could not create the account. Check the details or sign in if you already have one." },
          { status: 400 }
        );
      }
      if (data.session && data.user) {
        await ensureOwnerPortfolio(supabase, data.user.id);
        return NextResponse.json(
          { authenticated: true, redirect },
          { headers: { "Cache-Control": "private, no-store" } }
        );
      }
      return NextResponse.json(
        { verificationRequired: true, email: parsed.data.email.toLowerCase() },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (parsed.data.method === "password_signin") {
      const redirect = sanitizeInternalRedirect(parsed.data.redirect);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error || !data.user) {
        return NextResponse.json(
          { code: "SIGNIN_FAILED", error: "The email or password is incorrect." },
          { status: 401 }
        );
      }
      await ensureOwnerPortfolio(supabase, data.user.id);
      return NextResponse.json(
        { authenticated: true, redirect },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (parsed.data.method === "email_otp") {
      const redirect = sanitizeInternalRedirect(parsed.data.redirect, "/");
      const callbackUrl = createCanonicalAppUrl(
        `/api/auth/callback?next=${encodeURIComponent(redirect)}`,
        request.url
      );
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: callbackUrl,
          data: { account_type: "portfolio_viewer" },
        },
      });
      if (error) throw error;
      return NextResponse.json(
        { sent: true },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    if (parsed.data.method === "resend_signup") {
      const redirect = sanitizeInternalRedirect(parsed.data.redirect);
      const callbackUrl = createCanonicalAppUrl(
        `/api/auth/callback?next=${encodeURIComponent(redirect)}`,
        request.url
      );
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: parsed.data.email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) throw error;
      return NextResponse.json(
        { sent: true },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const recoveryUrl = createCanonicalAppUrl(
      "/api/auth/callback?next=%2Freset-password",
      request.url
    );
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: recoveryUrl,
    });
    if (error) throw error;
    return NextResponse.json(
      { sent: true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    logServerError("auth.start.failed", requestId, error);
    return NextResponse.json(
      { code: "AUTH_START_FAILED", error: "Authentication is temporarily unavailable. Please try again." },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  }
}
