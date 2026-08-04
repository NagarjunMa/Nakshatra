import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { deleteHoroscope, HoroscopeError, uploadHoroscope } from "@/features/horoscope/server/horoscope.service";

function errorResponse(error: unknown) {
  if (error instanceof HoroscopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Unable to manage horoscope attachment" }, { status: 500 });
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

  const formData = await request.formData();
  const file = formData.get("horoscope");
  const portfolioId = z.string().uuid().safeParse(formData.get("portfolioId"));
  const language = formData.get("language");
  if (!(file instanceof File) || !portfolioId.success || (language !== null && typeof language !== "string")) {
    return NextResponse.json({ error: "Horoscope file and portfolio are required" }, { status: 400 });
  }

  try {
    const horoscope = await uploadHoroscope({
      supabase: auth.supabase,
      userId: auth.user.id,
      portfolioId: portfolioId.data,
      file,
      language: language || "",
    });
    return NextResponse.json({ horoscope });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const horoscopeId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("horoscopeId"));
  if (!horoscopeId.success) return NextResponse.json({ error: "Horoscope attachment is required" }, { status: 400 });

  try {
    await deleteHoroscope({ supabase: auth.supabase, horoscopeId: horoscopeId.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
