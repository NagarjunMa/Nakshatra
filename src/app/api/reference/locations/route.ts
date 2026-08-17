import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

const querySchema = z.discriminatedUnion("level", [
  z.object({ level: z.literal("countries") }),
  z.object({
    level: z.literal("regions"),
    country: z.string().length(2),
  }),
  z.object({
    level: z.literal("cities"),
    country: z.string().length(2),
    region: z.string().max(30).optional(),
    q: z.string().max(80).optional(),
  }),
]);

function safePrefix(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "location_search");
  if (rateLimited) return rateLimited;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    level: url.searchParams.get("level"),
    country: url.searchParams.get("country") || undefined,
    region: url.searchParams.get("region") || undefined,
    q: url.searchParams.get("q")?.trim() || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { code: "LOCATION_QUERY_INVALID", error: "Choose a valid location level." },
      { status: 400 }
    );
  }

  let query;
  if (parsed.data.level === "countries") {
    query = auth.supabase
      .from("reference_countries")
      .select("country_code, name")
      .eq("is_active", true)
      .order("name")
      .limit(300);
  } else if (parsed.data.level === "regions") {
    query = auth.supabase
      .from("reference_regions")
      .select("region_code, name")
      .eq("country_code", parsed.data.country.toUpperCase())
      .eq("is_active", true)
      .order("name")
      .limit(1000);
  } else {
    query = auth.supabase
      .from("reference_cities")
      .select("geoname_id, name, region_code")
      .eq("country_code", parsed.data.country.toUpperCase())
      .eq("is_active", true);
    if (parsed.data.region) query = query.eq("region_code", parsed.data.region);
    if (parsed.data.q) query = query.ilike("name", `${safePrefix(parsed.data.q)}%`);
    query = query.order("population", { ascending: false }).order("name").limit(100);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      {
        code: "LOCATION_REFERENCE_UNAVAILABLE",
        error: "Location suggestions are temporarily unavailable. You can enter a location manually.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ options: data ?? [] });
}
