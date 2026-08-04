import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  MAX_PHOTO_BYTES,
  MAX_PORTFOLIO_PHOTOS,
  PHOTO_MIME_TYPES,
  type updatePortfolioMediaSchema,
} from "./media.contract";
import { classifyPhotoOrientation } from "../portfolio-photo";
import { PortfolioMediaRepository } from "./media.repository";
import type { PortfolioMedia, PortfolioMediaMetadata } from "@/types/portfolio";

export class PortfolioMediaError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

type MediaUpdate = Omit<ReturnType<typeof updatePortfolioMediaSchema.parse>, "mediaId">;

const PROTECTED_VISIBILITIES = new Set(["blurred", "interest_required"]);

/** Removes identifying facial detail while retaining enough color and shape to signal a protected photo. */
async function createBlurredPreview(source: Buffer) {
  const lowDetail = await sharp(source)
    .rotate()
    .resize(96, 96, { fit: "inside", withoutEnlargement: true })
    .blur(10)
    .webp({ quality: 52 })
    .toBuffer();

  return sharp(lowDetail)
    .resize(640, 640, { fit: "inside", kernel: "nearest" })
    .webp({ quality: 58 })
    .toBuffer();
}

function blurPathFor(storagePath: string) {
  const withoutExtension = storagePath.replace(/\.[^/.]+$/, "");
  return `${withoutExtension}-blur.webp`;
}

/** Validates a user-selected upload before any database or storage access. Input: File. Output: nothing or PortfolioMediaError. */
function requireSupportedPhoto(file: File) {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new PortfolioMediaError("Use an image up to 10MB", 413);
  }
  if (!PHOTO_MIME_TYPES.has(file.type)) {
    throw new PortfolioMediaError("Use a JPEG, PNG, HEIC, or WebP image", 415);
  }
}

/**
 * Processes, stores, and records one owner-authorized portfolio photo.
 * Input: authenticated Supabase client, owner ID, portfolio ID, image file, and visibility. Output: persisted media metadata.
 */
export async function uploadPortfolioPhoto({
  supabase,
  userId,
  portfolioId,
  file,
  visibility,
}: {
  supabase: SupabaseClient;
  userId: string;
  portfolioId: string;
  file: File;
  visibility: string;
}) {
  requireSupportedPhoto(file);
  const repository = new PortfolioMediaRepository(supabase);
  const { data: portfolio, error: portfolioError } = await repository.findOwnedPortfolio(
    portfolioId,
    userId
  );
  if (portfolioError || !portfolio) {
    throw new PortfolioMediaError("Portfolio not found", 404);
  }

  const { count, error: countError } = await repository.countProfilePhotos(portfolio.id);
  if (countError) throw new PortfolioMediaError("Could not check your photo gallery", 500);
  if ((count ?? 0) >= MAX_PORTFOLIO_PHOTOS) {
    throw new PortfolioMediaError(`A portfolio can contain up to ${MAX_PORTFOLIO_PHOTOS} photos`, 400);
  }

  try {
    const source = Buffer.from(await file.arrayBuffer());
    const [imageOutput, thumbnail, blurredPreview] = await Promise.all([
      sharp(source)
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer({ resolveWithObject: true }),
      sharp(source)
        .rotate()
        .resize(360, 360, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer(),
      createBlurredPreview(source),
    ]);
    const image = imageOutput.data;
    const width = imageOutput.info.width;
    const height = imageOutput.info.height;
    const id = crypto.randomUUID();
    const path = `${userId}/${portfolio.id}/${id}.webp`;
    const thumbnailPath = `${userId}/${portfolio.id}/${id}-thumb.webp`;
    const blurredPreviewPath = `${userId}/${portfolio.id}/${id}-blur.webp`;
    const [imageResult, thumbnailResult, blurredPreviewResult] = await Promise.all([
      repository.upload(path, image),
      repository.upload(thumbnailPath, thumbnail),
      repository.upload(blurredPreviewPath, blurredPreview),
    ]);
    if (imageResult.error || thumbnailResult.error || blurredPreviewResult.error) {
      await repository.remove([path, thumbnailPath, blurredPreviewPath]);
      throw new PortfolioMediaError("Photo upload failed", 500);
    }

    const { data: media, error } = await repository.createMedia({
      portfolio_id: portfolio.id,
      candidate_id: portfolio.candidate_id,
      media_type: count ? "gallery" : "hero",
      storage_path: path,
      thumbnail_path: thumbnailPath,
      visibility,
      sort_order: count ?? 0,
      metadata: {
        width,
        height,
        aspectRatio: width / height,
        orientation: classifyPhotoOrientation(width, height),
        blurPath: blurredPreviewPath,
      },
    });
    if (error || !media) {
      await repository.remove([path, thumbnailPath, blurredPreviewPath]);
      throw new PortfolioMediaError("Could not save photo", 500);
    }
    return media;
  } catch (error) {
    if (error instanceof PortfolioMediaError) throw error;
    throw new PortfolioMediaError("Could not process that image", 500);
  }
}

/**
 * Updates allowed media metadata and enforces a single hero photo.
 * Input: authenticated Supabase client, media ID, and validated update fields. Output: updated media metadata.
 */
export async function updatePortfolioPhoto({
  supabase,
  mediaId,
  changes,
}: {
  supabase: SupabaseClient;
  mediaId: string;
  changes: MediaUpdate;
}) {
  const repository = new PortfolioMediaRepository(supabase);
  let safeChanges: Record<string, unknown> = changes;
  if (changes.visibility && PROTECTED_VISIBILITIES.has(changes.visibility)) {
    const { data: existing, error: findError } = await repository.findMedia(mediaId);
    if (findError || !existing) throw new PortfolioMediaError("Photo not found", 404);
    const metadata = (existing.metadata ?? {}) as PortfolioMediaMetadata;
    if (!metadata.blurPath) {
      safeChanges = {
        ...changes,
        metadata: await createAndStoreBlurredPreview(repository, existing as PortfolioMedia),
      };
    }
  }

  const { data: media, error } = await repository.updateMedia(mediaId, safeChanges);
  if (error || !media) {
    throw new PortfolioMediaError("Photo not found", 404);
  }
  if (changes.media_type === "hero") {
    const { error: demoteError } = await repository.demoteOtherHeroPhotos(media.portfolio_id, media.id);
    if (demoteError) throw new PortfolioMediaError("Could not update the hero photo", 500);
  }
  return media;
}

/** Ensures legacy protected photos gain safe derivatives before a public snapshot is updated. */
export async function ensureProtectedPortfolioPhotoPreviews({
  supabase,
  portfolioId,
}: {
  supabase: SupabaseClient;
  portfolioId: string;
}) {
  const repository = new PortfolioMediaRepository(supabase);
  const { data, error } = await repository.findProtectedPortfolioPhotos(portfolioId);
  if (error) throw new PortfolioMediaError("Could not prepare protected photos", 500);

  for (const item of (data ?? []) as PortfolioMedia[]) {
    if (item.metadata?.blurPath) continue;
    const metadata = await createAndStoreBlurredPreview(repository, item);
    const { error: updateError } = await repository.updateMedia(item.id, { metadata });
    if (updateError) throw new PortfolioMediaError("Could not prepare protected photos", 500);
  }
}

async function createAndStoreBlurredPreview(
  repository: PortfolioMediaRepository,
  media: PortfolioMedia
) {
  const { data, error } = await repository.download(media.storage_path);
  if (error || !data) throw new PortfolioMediaError("Could not prepare protected photo", 500);
  const preview = await createBlurredPreview(Buffer.from(await data.arrayBuffer()));
  const blurPath = blurPathFor(media.storage_path);
  const { error: uploadError } = await repository.upload(blurPath, preview);
  if (uploadError && !String(uploadError.message).toLowerCase().includes("already exists")) {
    throw new PortfolioMediaError("Could not prepare protected photo", 500);
  }
  return { ...(media.metadata ?? {}), blurPath };
}

/**
 * Removes one authorized media record and its associated private Storage objects.
 * Input: authenticated Supabase client and media ID. Output: resolves after both deletion steps complete.
 */
export async function deletePortfolioPhoto({
  supabase,
  mediaId,
}: {
  supabase: SupabaseClient;
  mediaId: string;
}) {
  const repository = new PortfolioMediaRepository(supabase);
  const { data: media, error } = await repository.deleteMedia(mediaId);
  if (error || !media) {
    throw new PortfolioMediaError("Photo not found", 404);
  }
  const blurPath = (media.metadata as PortfolioMediaMetadata | null)?.blurPath;
  const paths = [media.storage_path, media.thumbnail_path, blurPath].filter(
    (path): path is string => Boolean(path)
  );
  const { error: storageError } = await repository.remove(paths);
  if (storageError) throw new PortfolioMediaError("Photo was removed from the portfolio but not storage", 500);
}
