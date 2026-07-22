import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import {
  mediaVisibilitySchema,
  updatePortfolioMediaSchema,
} from "@/features/media/server/media.contract";
import {
  deletePortfolioPhoto,
  PortfolioMediaError,
  updatePortfolioPhoto,
  uploadPortfolioPhoto,
} from "@/features/media/server/media.service";

function errorResponse(error: unknown) {
  if (error instanceof PortfolioMediaError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Unable to manage photo" }, { status: 500 });
}

export async function POST(request: Request) {
  const { supabase, user } = await getApiUser();
  if (!supabase || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
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
      supabase,
      userId: user.id,
      portfolioId,
      file,
      visibility: visibility.data,
    });
    return NextResponse.json({ media });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getApiUser();
  if (!supabase || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = updatePortfolioMediaSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid photo update" }, { status: 400 });
  }

  const { mediaId, ...changes } = parsed.data;
  try {
    const media = await updatePortfolioPhoto({ supabase, mediaId, changes });
    return NextResponse.json({ media });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getApiUser();
  if (!supabase || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mediaId = new URL(request.url).searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "Photo is required" }, { status: 400 });

  try {
    await deletePortfolioPhoto({ supabase, mediaId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
