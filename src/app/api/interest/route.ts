import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interestRequestSchema } from "@/features/interest/server/interest.contract";
import { submitInterestRequest } from "@/features/interest/server/interest.service";

/** Accepts a short viewer introduction for an active public portfolio. */
export async function POST(request: Request) {
  try {
    const parsed = interestRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form and complete every required field." }, { status: 400 });
    }
    const supabase = await createClient();
    const result = await submitInterestRequest(supabase, parsed.data);
    if (result === "unavailable") {
      return NextResponse.json({ error: "This portfolio is not available." }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We could not send your interest. Please try again." }, { status: 500 });
  }
}
