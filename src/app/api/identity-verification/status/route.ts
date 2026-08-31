import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { hashIdentityVerificationToken, isIdentityVerificationToken } from "@/features/identity-verification/server/identity-verification.tokens";
import { getIdentityVerificationLinkStatus, IdentityVerificationSessionError, withdrawIdentityVerificationConsent } from "@/features/identity-verification/server/session.service";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import { AUTH_BODY_LIMIT, readJsonBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { createClient } from "@/lib/supabase/server";

const tokenSchema = z.object({ token: z.string().refine(isIdentityVerificationToken, "Invalid verification token") }).strict();
const noStore = { "Cache-Control": "private, no-store" };

async function requestToken(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = tokenSchema.safeParse(await readJsonBody(request, AUTH_BODY_LIMIT));
    if (!parsed.success) return { response: NextResponse.json({ code: "IDENTITY_VERIFICATION_LINK_INVALID", error: "This verification link is unavailable or has expired." }, { status: 400, headers: noStore }) };
    const supabase = await createClient();
    const rateLimited = await enforceRateLimit(supabase, request, "identity_verification_status");
    if (rateLimited) {
      rateLimited.headers.set("Cache-Control", noStore["Cache-Control"]);
      return { response: rateLimited };
    }
    return { supabase, tokenHash: await hashIdentityVerificationToken(parsed.data.token) };
  } catch (error) {
    const response = requestSecurityErrorResponse(error);
    response.headers.set("Cache-Control", noStore["Cache-Control"]);
    return { response };
  }
}

/** Resolves a bearer link to generic invitation or management state without revealing candidate information. */
export async function POST(request: Request) {
  const input = await requestToken(request);
  if ("response" in input) return input.response;
  try {
    return NextResponse.json({ link: await getIdentityVerificationLinkStatus(input.supabase, input.tokenHash) }, { headers: noStore });
  } catch (error) {
    const known = error instanceof IdentityVerificationSessionError ? error : null;
    return NextResponse.json(
      { code: known?.code || "IDENTITY_VERIFICATION_STATUS_FAILED", error: known?.message || "We could not load this verification link." },
      { status: known?.status || 503, headers: noStore }
    );
  }
}

/** Uses a management bearer credential once to withdraw consent and revoke Nakshatra verification. */
export async function DELETE(request: Request) {
  const input = await requestToken(request);
  if ("response" in input) return input.response;
  try {
    await withdrawIdentityVerificationConsent(input.supabase, input.tokenHash);
    return NextResponse.json({ withdrawn: true }, { headers: noStore });
  } catch (error) {
    const known = error instanceof IdentityVerificationSessionError ? error : null;
    return NextResponse.json(
      { code: known?.code || "IDENTITY_VERIFICATION_WITHDRAW_FAILED", error: known?.message || "We could not withdraw verification consent." },
      { status: known?.status || 503, headers: noStore }
    );
  }
}
