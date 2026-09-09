import "server-only";

import { isIP } from "node:net";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";

export const rateLimitActionSchema = z.enum([
  "auth_google",
  "auth_email",
  "interest_submit",
  "interest_decision",
  "grant_manage",
  "dashboard_save",
  "photo_upload",
  "photo_mutation",
  "horoscope_upload",
  "horoscope_delete",
  "portfolio_publish",
  "portfolio_renew",
  "portfolio_rotate",
  "portfolio_unpublish",
  "horoscope_view",
  "location_search",
  "account_export",
  "account_delete",
  "account_delete_reauth",
  "session_manage",
  "identity_verification_invitation",
  "identity_verification_start",
  "identity_verification_status",
  "identity_verification_retry",
  "brokerdesk_bootstrap",
  "brokerdesk_workspace_create",
  "brokerdesk_onboarding_read",
  "brokerdesk_onboarding_write",
  "brokerdesk_privileged_reauth",
]);

export type RateLimitAction = z.infer<typeof rateLimitActionSchema>;

const resultSchema = z.object({
  allowed: z.boolean(),
  retryAfter: z.number().int().nonnegative(),
});

export class RateLimitServiceError extends Error {}

const hmacKeySchema = z
  .string()
  .min(32, "RATE_LIMIT_SUBJECT_HMAC_KEY must contain at least 32 characters");

function rateLimitHmacKey() {
  const configured = process.env.RATE_LIMIT_SUBJECT_HMAC_KEY;
  if (!configured && process.env.NODE_ENV === "test") {
    return "nakshatra-test-rate-limit-key-not-for-production";
  }
  return hmacKeySchema.parse(configured);
}

function normalizeAddress(value: string | null) {
  if (!value) return "unknown";
  let candidate = value.split(",")[0]?.trim() ?? "";
  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else {
    const ipv4WithPort = candidate.match(/^([^:]+):\d+$/);
    if (ipv4WithPort) candidate = ipv4WithPort[1];
  }
  return isIP(candidate) ? candidate.toLowerCase() : "unknown";
}

/** Uses forwarding headers only when the configured deployment boundary makes them trustworthy. */
function trustedNetworkHint(request: Request) {
  if (process.env.VERCEL === "1") {
    return normalizeAddress(request.headers.get("x-vercel-forwarded-for"));
  }
  if (process.env.NAKSHATRA_TRUSTED_PROXY === "cloudflare") {
    return normalizeAddress(request.headers.get("cf-connecting-ip"));
  }
  if (process.env.NODE_ENV !== "production") {
    return normalizeAddress(request.headers.get("x-forwarded-for"));
  }
  return "unknown";
}

/** HMACs bounded network hints before persistence so raw or correlatable IP values are never stored. */
async function anonymousSubjectHash(request: Request) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(rateLimitHmacKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 256);
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${trustedNetworkHint(request)}|${userAgent}`)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/** Consumes one database-backed quota unit for the current authenticated identity or hashed anonymous client. */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  request: Request,
  action: RateLimitAction
) {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_action: action,
    p_subject_hash: await anonymousSubjectHash(request),
  });
  const parsed = resultSchema.safeParse(data);
  if (error || !parsed.success) throw new RateLimitServiceError("Rate limit unavailable");
  return parsed.data;
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { code: "RATE_LIMITED", error: "Too many requests. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

/** Fails closed when quota persistence is unavailable and returns null only when the action may proceed. */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  request: Request,
  action: RateLimitAction
): Promise<NextResponse | null> {
  try {
    const result = await consumeRateLimit(supabase, request, action);
    return result.allowed ? null : rateLimitResponse(result.retryAfter);
  } catch {
    return NextResponse.json(
      { code: "RATE_LIMIT_UNAVAILABLE", error: "This action is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
