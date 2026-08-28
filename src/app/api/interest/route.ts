import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  interestRequestSchema,
  interestRequestValidationMessage,
} from "@/features/interest/server/interest.contract";
import {
  InterestSubmissionError,
  submitInterestRequest,
} from "@/features/interest/server/interest.service";
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
          error: interestRequestValidationMessage(parsed.error),
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
    if (error instanceof InterestSubmissionError && error.reason === "own_portfolio") {
      return NextResponse.json(
        {
          code: "OWN_PORTFOLIO_INTEREST",
          error: "You cannot send an interest request to your own portfolio. To test the viewer journey, use a different verified email in a private browser window.",
        },
        { status: 409 }
      );
    }
    if (error instanceof InterestSubmissionError && error.reason === "existing_request") {
      return NextResponse.json(
        {
          code: "INTEREST_REQUEST_EXISTS",
          error: "An interest request with these contact details already exists. The portfolio owner can review the existing request.",
        },
        { status: 409 }
      );
    }
    if (error instanceof InterestSubmissionError && error.reason === "verification_required") {
      return NextResponse.json(
        {
          code: "VERIFIED_EMAIL_REQUIRED",
          error: "Your verified email session could not be confirmed. Sign in again and retry.",
        },
        { status: 403 }
      );
    }
    if (error instanceof InterestSubmissionError && error.reason === "invalid_request") {
      return NextResponse.json(
        {
          code: "INTEREST_REQUEST_REJECTED",
          error: "The request contains a value the database cannot accept. Check the phone number and optional portfolio link.",
        },
        { status: 400 }
      );
    }
    if (error instanceof InterestSubmissionError && error.reason === "database_update_required") {
      return NextResponse.json(
        {
          code: "INTEREST_DATABASE_UPDATE_REQUIRED",
          error: "The interest-request database update has not been applied yet. Apply the latest Supabase migrations and try again.",
        },
        { status: 503 }
      );
    }
    if (error instanceof InterestSubmissionError) {
      console.error("Interest submission failed", {
        reason: error.reason,
        databaseCode: error.databaseCode || "unknown",
      });
    }
    return NextResponse.json(
      { code: "INTEREST_REQUEST_FAILED", error: "We could not send your interest. Please try again." },
      { status: 500 }
    );
  }
}
