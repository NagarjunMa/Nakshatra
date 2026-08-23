import "server-only";

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
  "session_manage",
]);

export type RateLimitAction = z.infer<typeof rateLimitActionSchema>;

const resultSchema = z.object({
  allowed: z.boolean(),
  retryAfter: z.number().int().nonnegative(),
});

export class RateLimitServiceError extends Error {}

/** Hashes network hints before persistence so rate limiting never stores raw IP addresses. */
async function anonymousSubjectHash(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("cf-connecting-ip")
    || (process.env.NODE_ENV !== "production"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : null)
    || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const bytes = new TextEncoder().encode(`${forwarded}|${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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
