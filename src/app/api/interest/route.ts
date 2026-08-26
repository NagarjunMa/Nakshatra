import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional()
);

const interestSchema = z.object({
  portfolioToken: z.string().min(8).max(160),
  name: z.string().trim().min(2).max(180),
  profileFor: z.enum(["self", "son", "daughter", "sibling", "relative"]),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(180),
  country: optionalText(100),
  state: optionalText(120),
  city: optionalText(120),
  location: optionalText(180),
  familyContext: optionalText(600),
  message: optionalText(600),
  portfolioUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().url().max(500).optional()
  ),
});

/** Accepts a short viewer introduction for an active public portfolio. */
export async function POST(request: Request) {
  try {
    const parsed = interestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Complete your name, who you are contacting for, phone number, and email." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: snapshot } = await supabase
      .from("public_portfolio_snapshots")
      .select("portfolio_id")
      .eq("share_token", parsed.data.portfolioToken)
      .eq("is_active", true)
      .single();
    if (!snapshot?.portfolio_id) return NextResponse.json({ error: "This portfolio is not available." }, { status: 404 });

    const { data: authData } = await supabase.auth.getUser();
    const prospectKey = createHash("sha256")
      .update(`${parsed.data.email.toLowerCase()}|${parsed.data.phone.replace(/\D/g, "")}`)
      .digest("hex");
    const location = [parsed.data.city, parsed.data.state, parsed.data.country]
      .filter(Boolean)
      .join(", ") || parsed.data.location || null;
    const { error } = await supabase.from("interest_requests").insert({
      portfolio_id: snapshot.portfolio_id,
      requester_user_id: authData.user?.id ?? null,
      viewer_name: parsed.data.name,
      viewer_phone: parsed.data.phone,
      viewer_email: parsed.data.email.toLowerCase(),
      viewer_family_context: parsed.data.familyContext ?? null,
      message: parsed.data.message ?? null,
      request_reason: parsed.data.message ?? null,
      requested_sections: ["full"],
      prospect_key_hash: prospectKey,
      metadata: {
        profile_for: parsed.data.profileFor,
        country: parsed.data.country ?? null,
        state: parsed.data.state ?? null,
        city: parsed.data.city ?? null,
        location,
        portfolio_url: parsed.data.portfolioUrl ?? null,
      },
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We could not send your interest. Please try again." }, { status: 500 });
  }
}
