import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import type { PortfolioHoroscope } from "@/types/portfolio";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "horoscope_view");
  if (rateLimited) return rateLimited;

  const { data: portfolio } = await auth.supabase
    .from("portfolios")
    .select("id")
    .eq("user_id", auth.user.id)
    .single();
  if (!portfolio) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });

  const { data: horoscopeRow } = await auth.supabase
    .from("portfolio_horoscopes")
    .select("id, portfolio_id, storage_path, mime_type, file_extension, byte_size, language_label, page_count, published_at, created_at, updated_at")
    .eq("portfolio_id", portfolio.id)
    .maybeSingle();
  if (!horoscopeRow) return NextResponse.json({ error: "Horoscope attachment not found" }, { status: 404 });
  const horoscope = horoscopeRow as PortfolioHoroscope;
  const download = horoscope.file_extension === "doc" || horoscope.file_extension === "docx"
    ? { download: `horoscope.${horoscope.file_extension}` }
    : undefined;
  const { data: signed, error } = await auth.supabase.storage
    .from("horoscopes")
    .createSignedUrl(horoscope.storage_path, 5 * 60, download);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Unable to open horoscope attachment" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
