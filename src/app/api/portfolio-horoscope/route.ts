import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import { deleteHoroscope, HoroscopeError, uploadHoroscope } from "@/features/horoscope/server/horoscope.service";
import { MAX_HOROSCOPE_BYTES } from "@/features/horoscope/server/horoscope.contract";
import { readFormDataBody, requestSecurityErrorResponse, requireSameOrigin } from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

const HOROSCOPE_FORM_LIMIT = MAX_HOROSCOPE_BYTES + 1024 * 1024;

function errorResponse(error: unknown) {
  if (error instanceof HoroscopeError) {
    const code = error.status === 413
      ? "HOROSCOPE_TOO_LARGE"
      : error.status === 415
        ? "HOROSCOPE_TYPE_INVALID"
        : error.status === 404
          ? "HOROSCOPE_NOT_FOUND"
          : "HOROSCOPE_OPERATION_FAILED";
    return NextResponse.json({ code, error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { code: "HOROSCOPE_OPERATION_FAILED", error: "Unable to manage horoscope attachment" },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "horoscope_upload");
  if (rateLimited) return rateLimited;

  let formData: FormData;
  try {
    formData = await readFormDataBody(request, HOROSCOPE_FORM_LIMIT);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
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
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "horoscope_delete");
  if (rateLimited) return rateLimited;
  const horoscopeId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("horoscopeId"));
  if (!horoscopeId.success) return NextResponse.json({ error: "Horoscope attachment is required" }, { status: 400 });

  try {
    await deleteHoroscope({ supabase: auth.supabase, horoscopeId: horoscopeId.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
