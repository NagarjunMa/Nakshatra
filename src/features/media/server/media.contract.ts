import { z } from "zod/v4";
import { MAX_PORTFOLIO_PHOTOS } from "../portfolio-photo";

export { MAX_PORTFOLIO_PHOTOS };
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 40_000_000;
export const MAX_PHOTO_DIMENSION = 16_000;
export const PHOTO_PROCESSING_TIMEOUT_SECONDS = 10;

export const PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const mediaVisibilitySchema = z.enum([
  "public",
  "blurred",
  "interest_required",
  "approved_only",
  "owner_only",
  "hidden",
]);

export const updatePortfolioMediaSchema = z
  .object({
    mediaId: z.string().uuid(),
    visibility: mediaVisibilitySchema.optional(),
    media_type: z.enum(["hero", "gallery"]).optional(),
    sort_order: z.number().int().nonnegative().optional(),
    alt_text: z.string().max(160).optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "mediaId"),
    "Provide at least one change"
  );
