import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import {
  MAX_PHOTO_BYTES,
  mediaVisibilitySchema,
  updatePortfolioMediaSchema,
} from "@/features/media/server/media.contract";
import {
  deletePortfolioPhoto,
  PortfolioMediaError,
  updatePortfolioPhoto,
  uploadPortfolioPhoto,
} from "@/features/media/server/media.service";
import { createOwnerPortfolioMediaPreviewUrls } from "@/features/media/server/photo-url.service";
import {
  readFormDataBody,
  readJsonBody,
  requestSecurityErrorResponse,
  requireSameOrigin,
} from "@/lib/api/request-security";
import { enforceRateLimit } from "@/features/security/server/rate-limit.service";

const PHOTO_FORM_LIMIT = MAX_PHOTO_BYTES + 1024 * 1024;

function errorResponse(error: unknown) {
  if (error instanceof PortfolioMediaError) {
    const code = error.status === 413
      ? "PHOTO_TOO_LARGE"
      : error.status === 415
        ? "PHOTO_TYPE_INVALID"
        : error.status === 404
          ? "PHOTO_NOT_FOUND"
          : "PHOTO_OPERATION_FAILED";
    return NextResponse.json({ code, error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { code: "PHOTO_OPERATION_FAILED", error: "Unable to manage photo" },
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
  const rateLimited = await enforceRateLimit(auth.supabase, request, "photo_upload");
  if (rateLimited) return rateLimited;

  let formData: FormData;
  try {
    formData = await readFormDataBody(request, PHOTO_FORM_LIMIT);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const file = formData.get("photo");
  const portfolioId = formData.get("portfolioId");
  const visibility = mediaVisibilitySchema.safeParse(
    formData.get("visibility") || "interest_required"
  );

  if (!(file instanceof File) || typeof portfolioId !== "string") {
    return NextResponse.json({ error: "Photo and portfolio are required" }, { status: 400 });
  }
  if (!visibility.success) {
    return NextResponse.json({ error: "Invalid photo visibility" }, { status: 400 });
  }

  try {
    const media = await uploadPortfolioPhoto({
      supabase: auth.supabase,
      userId: auth.user.id,
      portfolioId,
      file,
      visibility: visibility.data,
    });
    const previewUrls = await createOwnerPortfolioMediaPreviewUrls({
      supabase: auth.supabase,
      media: [media],
    });
    return NextResponse.json({ media, previewUrl: previewUrls[media.id] ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);
  const rateLimited = await enforceRateLimit(auth.supabase, request, "photo_mutation");
  if (rateLimited) return rateLimited;

  let payload: unknown;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    return requestSecurityErrorResponse(error);
  }
  const parsed = updatePortfolioMediaSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid photo update" }, { status: 400 });
  }

  const { mediaId, ...changes } = parsed.data;
  try {
    const media = await updatePortfolioPhoto({ supabase: auth.supabase, mediaId, changes });
    return NextResponse.json({ media });
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
  const rateLimited = await enforceRateLimit(auth.supabase, request, "photo_mutation");
  if (rateLimited) return rateLimited;

  const mediaId = new URL(request.url).searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "Photo is required" }, { status: 400 });

  try {
    await deletePortfolioPhoto({ supabase: auth.supabase, mediaId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
