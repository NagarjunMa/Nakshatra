import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { apiAuthFailureResponse } from "@/lib/api/auth-response";
import sharp from "sharp";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.status !== "authenticated") return apiAuthFailureResponse(auth);

  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, or WebP" },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process with sharp: main photo (800px) + thumbnail (200px)
    const [mainBuffer, thumbBuffer] = await Promise.all([
      sharp(buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      sharp(buffer)
        .resize(200, 200, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer(),
    ]);

    const mainPath = `${auth.user.id}/photo.webp`;
    const thumbPath = `${auth.user.id}/thumb.webp`;

    // Upload both (upsert to overwrite on re-upload)
    const [mainResult, thumbResult] = await Promise.all([
      auth.supabase.storage.from("photos").upload(mainPath, mainBuffer, {
        contentType: "image/webp",
        upsert: true,
      }),
      auth.supabase.storage.from("photos").upload(thumbPath, thumbBuffer, {
        contentType: "image/webp",
        upsert: true,
      }),
    ]);

    if (mainResult.error) {
      console.error("Main photo upload failed:", mainResult.error);
      return NextResponse.json(
        { error: "Photo upload failed" },
        { status: 500 }
      );
    }

    if (thumbResult.error) {
      console.error("Thumbnail upload failed:", thumbResult.error);
      return NextResponse.json(
        { error: "Thumbnail upload failed" },
        { status: 500 }
      );
    }

    const { data: { publicUrl: photoUrl } } = auth.supabase.storage
      .from("photos")
      .getPublicUrl(mainPath);

    const { data: { publicUrl: thumbUrl } } = auth.supabase.storage
      .from("photos")
      .getPublicUrl(thumbPath);

    return NextResponse.json({
      photo_url: photoUrl,
      photo_thumb_url: thumbUrl,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload processing failed" },
      { status: 500 }
    );
  }
}
