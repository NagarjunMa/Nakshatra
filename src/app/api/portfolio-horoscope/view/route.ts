import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";
import {
  createOwnerHoroscopeViewUrl,
  HoroscopeError,
} from "@/features/horoscope/server/horoscope.service";

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "horoscope_view");
  if (rateLimited) return rateLimited;

  try {
    const signedUrl = await createOwnerHoroscopeViewUrl({
      supabase: auth.supabase,
      userId: auth.user.id,
    });
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    if (error instanceof HoroscopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to open horoscope attachment" }, { status: 500 });
  }
}
