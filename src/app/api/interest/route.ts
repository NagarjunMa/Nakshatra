import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { interestRequestSchema } from "@/features/interest/server/interest.contract";
import { submitInterestRequest } from "@/features/interest/server/interest.service";
import {
  readJsonBody,
  RequestSecurityError,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

/** Accepts a short viewer introduction for an active public portfolio. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const auth = await getApiUser();
    if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
    const rateLimited = await enforceRateLimit(auth.supabase, request, "interest_submit");
    if (rateLimited) return rateLimited;
    const parsed = interestRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "INTEREST_REQUEST_INVALID",
          error: "Complete your name, who you are contacting for, phone number, and email.",
        },
        { status: 400 }
      );
    }
    const result = await submitInterestRequest(auth.supabase, parsed.data);
    if (result === "unavailable") {
      return NextResponse.json(
        { code: "PORTFOLIO_UNAVAILABLE", error: "This portfolio is not available." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return requestSecurityErrorResponse(error);
    }
    return NextResponse.json(
      { code: "INTEREST_REQUEST_FAILED", error: "We could not send your interest. Please try again." },
      { status: 500 }
    );
  }
}
