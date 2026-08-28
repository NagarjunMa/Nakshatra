import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { ensureOwnerPortfolio } from "@/features/auth/server/portfolio-bootstrap";
import { consumeRateLimit, rateLimitResponse } from "@/features/security/server/rate-limit.service";
import {
  AUTH_BODY_LIMIT,
  readJsonBody,
  RequestSecurityError,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { getRequestId, logServerError } from "@/lib/security/logging";
import { sanitizeInternalRedirect } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

const verificationSchema = z.object({
  purpose: z.enum(["owner_signup", "viewer_interest"]),
  email: z.string().trim().email().max(180),
  token: z.string().trim().regex(/^\d{6}$/),
  redirect: z.string().max(500).optional(),
});

/** Exchanges an emailed six-digit code for a verified Supabase session. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request);
    const parsed = verificationSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) {
      return NextResponse.json(
        { code: "OTP_INVALID", error: "Enter the six-digit code from your email." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const quota = await consumeRateLimit(supabase, request, "auth_email");
    if (!quota.allowed) return rateLimitResponse(quota.retryAfter);

    const { data, error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.token,
      type: parsed.data.purpose === "owner_signup" ? "signup" : "email",
    });
    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { code: "OTP_REJECTED", error: "That code is incorrect or has expired. Request a new code and try again." },
        { status: 400 }
      );
    }

    const verifiedEmail = data.user.email?.trim().toLowerCase();
    if (!verifiedEmail || verifiedEmail !== parsed.data.email.trim().toLowerCase()) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { code: "OTP_IDENTITY_MISMATCH", error: "We could not verify this email address." },
        { status: 400 }
      );
    }

    if (parsed.data.purpose === "owner_signup") {
      await ensureOwnerPortfolio(supabase, data.user.id);
    }

    return NextResponse.json(
      {
        verified: true,
        email: verifiedEmail,
        redirect: sanitizeInternalRedirect(parsed.data.redirect),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof RequestSecurityError) return requestSecurityErrorResponse(error);
    logServerError("auth.verify.failed", requestId, error);
    return NextResponse.json(
      { code: "OTP_VERIFY_FAILED", error: "We could not verify the code. Please try again." },
      { status: 503, headers: { "X-Request-Id": requestId } }
    );
  }
}
