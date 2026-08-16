import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { decideInterestRequest } from "@/features/interest/server/interest-decision.service";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

/** Lets a portfolio owner approve identity-bound Full View access or decline an interest. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose approve or decline." }, { status: 400 });
  }

  const { id } = await context.params;
  const requestId = z.string().uuid().safeParse(id);
  if (!requestId.success) {
    return NextResponse.json({ error: "This interest could not be found." }, { status: 404 });
  }
  const result = await decideInterestRequest(auth.supabase, requestId.data, parsed.data.decision)
    .catch(() => "failed" as const);

  if (result === "not_found") {
    return NextResponse.json({ error: "This interest could not be found." }, { status: 404 });
  }
  if (result === "signin_required") {
    return NextResponse.json(
      { error: "Ask this viewer to sign in before approving Full View." },
      { status: 409 }
    );
  }
  if (result === "unauthorized") {
    return NextResponse.json({ error: "You cannot manage this interest." }, { status: 403 });
  }
  if (result === "failed") {
    return NextResponse.json({ error: "This interest could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: result });
}
