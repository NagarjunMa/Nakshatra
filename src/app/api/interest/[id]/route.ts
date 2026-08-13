import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";

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
  const { data: interest, error: interestError } = await auth.supabase
    .from("interest_requests")
    .select("id, portfolio_id, requester_user_id, status")
    .eq("id", id)
    .single();

  if (interestError || !interest) {
    return NextResponse.json({ error: "This interest could not be found." }, { status: 404 });
  }

  if (parsed.data.decision === "approved" && !interest.requester_user_id) {
    return NextResponse.json(
      { error: "Ask this viewer to sign in before approving Full View." },
      { status: 409 }
    );
  }

  if (parsed.data.decision === "approved") {
    const { data: existingGrant } = await auth.supabase
      .from("reveal_grants")
      .select("id")
      .eq("interest_request_id", interest.id)
      .eq("viewer_user_id", interest.requester_user_id)
      .is("revoked_at", null)
      .maybeSingle();

    if (!existingGrant) {
      const { error: grantError } = await auth.supabase.from("reveal_grants").insert({
        interest_request_id: interest.id,
        portfolio_id: interest.portfolio_id,
        viewer_user_id: interest.requester_user_id,
        access_level: "full",
        granted_sections: ["full"],
        granted_by: auth.user.id,
      });
      if (grantError) {
        return NextResponse.json({ error: "Full View access could not be created." }, { status: 500 });
      }
    }
  }

  const { error: updateError } = await auth.supabase
    .from("interest_requests")
    .update({
      status: parsed.data.decision,
      decided_at: new Date().toISOString(),
      decided_by: auth.user.id,
    })
    .eq("id", interest.id);

  if (updateError) {
    return NextResponse.json({ error: "This interest could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: parsed.data.decision });
}
