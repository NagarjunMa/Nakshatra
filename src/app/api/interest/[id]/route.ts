import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { decideInterestRequest } from "@/features/interest/server/interest-decision.service";
import {
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "reopened"]),
});

/** Lets a portfolio owner approve identity-bound Full View access or decline an interest. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "interest_decision");
  if (rateLimited) return rateLimited;

  let payload: unknown;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INTEREST_DECISION_INVALID", error: "Choose approve, decline, or reopen." },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const requestId = z.string().uuid().safeParse(id);
  if (!requestId.success) {
    return NextResponse.json({ code: "INTEREST_NOT_FOUND", error: "This interest could not be found." }, { status: 404 });
  }
  const result = await decideInterestRequest(auth.supabase, requestId.data, parsed.data.decision)
    .catch(() => "failed" as const);

  if (result === "not_found") {
    return NextResponse.json({ code: "INTEREST_NOT_FOUND", error: "This interest could not be found." }, { status: 404 });
  }
  if (result === "signin_required") {
    return NextResponse.json(
      { code: "INTEREST_SIGNIN_REQUIRED", error: "This request is not connected to a viewer account." },
      { status: 409 }
    );
  }
  if (result === "verification_required") {
    return NextResponse.json(
      { code: "INTEREST_VERIFICATION_REQUIRED", error: "This viewer must verify their email before Full View can be approved." },
      { status: 409 }
    );
  }
  if (result === "unauthorized") {
    return NextResponse.json({ code: "INTEREST_FORBIDDEN", error: "You cannot manage this interest." }, { status: 403 });
  }
  if (result === "invalid_transition") {
    return NextResponse.json(
      { code: "INTEREST_INVALID_TRANSITION", error: "Reopen this request before approving it again." },
      { status: 409 }
    );
  }
  if (result === "failed") {
    return NextResponse.json({ code: "INTEREST_DECISION_FAILED", error: "This interest could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: result });
}
