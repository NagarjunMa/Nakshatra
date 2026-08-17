import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { interestRequestSchema } from "@/features/interest/server/interest.contract";
import { submitInterestRequest } from "@/features/interest/server/interest.service";

/** Accepts a short viewer introduction for an active public portfolio. */
export async function POST(request: Request) {
  try {
    const auth = await getApiUser();
    if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
    const parsed = interestRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { code: "INTEREST_REQUEST_INVALID", error: "Please check the form and complete every required field." },
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
  } catch {
    return NextResponse.json(
      { code: "INTEREST_REQUEST_FAILED", error: "We could not send your interest. Please try again." },
      { status: 500 }
    );
  }
}
