import "server-only";

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioHoroscope } from "@/types/portfolio";
import {
  detectHoroscopeFile,
  HOROSCOPE_PROCESSING_TIMEOUT_SECONDS,
  horoscopeLanguageSchema,
  MAX_HOROSCOPE_BYTES,
  MAX_HOROSCOPE_DIMENSION,
  MAX_HOROSCOPE_PIXELS,
} from "./horoscope.contract";
import { HoroscopeRepository } from "./horoscope.repository";

export class HoroscopeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function uploadError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "HOROSCOPE_DOCUMENT_DISABLED") {
    return new HoroscopeError("For security, upload a scanned JPG, PNG, WebP, or HEIC image", 415);
  }
  return new HoroscopeError("Use a scanned JPG, PNG, WebP, or HEIC image", 415);
}

/** Validates, sanitizes where possible, and replaces the owner's one horoscope attachment. */
export async function uploadHoroscope({ supabase, userId, portfolioId, file, language }: {
  supabase: SupabaseClient;
  userId: string;
  portfolioId: string;
  file: File;
  language: string;
}) {
  if (!file.size) throw new HoroscopeError("Choose a non-empty horoscope file", 400);
  if (file.size > MAX_HOROSCOPE_BYTES) throw new HoroscopeError("Use a horoscope file up to 20MB", 413);
  const parsedLanguage = horoscopeLanguageSchema.safeParse(language);
  if (!parsedLanguage.success) throw new HoroscopeError(parsedLanguage.error.issues[0]?.message || "Invalid language label", 400);

  const repository = new HoroscopeRepository(supabase);
  const { data: portfolio, error: portfolioError } = await repository.findOwnedPortfolio(portfolioId, userId);
  if (portfolioError || !portfolio) throw new HoroscopeError("Portfolio not found", 404);

  const source = Buffer.from(await file.arrayBuffer());
  let detected;
  try {
    detected = detectHoroscopeFile(file.name, source);
  } catch (error) {
    throw uploadError(error);
  }

  let output: Buffer<ArrayBufferLike>;
  const pageCount = 1;
  try {
    const input = sharp(source, {
      failOn: "warning",
      limitInputPixels: MAX_HOROSCOPE_PIXELS,
      sequentialRead: true,
    }).timeout({ seconds: HOROSCOPE_PROCESSING_TIMEOUT_SECONDS });
    const metadata = await input.metadata();
    if (!metadata.width || !metadata.height
      || metadata.width > MAX_HOROSCOPE_DIMENSION
      || metadata.height > MAX_HOROSCOPE_DIMENSION
      || metadata.width * metadata.height > MAX_HOROSCOPE_PIXELS
      || (metadata.pages ?? 1) !== 1
      || (metadata.channels ?? 4) > 4) {
      throw new Error("unsafe image dimensions");
    }
    output = await sharp(source, {
      failOn: "warning",
      limitInputPixels: MAX_HOROSCOPE_PIXELS,
      sequentialRead: true,
    })
      .timeout({ seconds: HOROSCOPE_PROCESSING_TIMEOUT_SECONDS })
      .rotate()
      .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    throw new HoroscopeError("We could not safely process that scanned image", 415);
  }
  if (output.byteLength > MAX_HOROSCOPE_BYTES) throw new HoroscopeError("The processed horoscope is larger than 20MB", 413);

  const { data: previous, error: previousError } = await repository.findByPortfolio(portfolioId);
  if (previousError) throw new HoroscopeError("Could not check the current horoscope attachment", 500);

  const storagePath = `${userId}/${portfolioId}/${crypto.randomUUID()}.${detected.extension}`;
  const { error: storageError } = await repository.upload(storagePath, output, detected.mimeType);
  if (storageError) throw new HoroscopeError("Horoscope upload failed", 500);

  const { data: horoscope, error: saveError } = await repository.save({
    portfolio_id: portfolioId,
    storage_path: storagePath,
    mime_type: detected.mimeType,
    file_extension: detected.extension,
    byte_size: output.byteLength,
    language_label: parsedLanguage.data,
    page_count: pageCount,
    published_at: null,
  });
  if (saveError || !horoscope) {
    await repository.remove([storagePath]);
    throw new HoroscopeError("Could not save the horoscope attachment", 500);
  }

  if (previous?.storage_path && previous.storage_path !== storagePath) {
    const { error: removeError } = await repository.remove([previous.storage_path]);
    if (removeError) {
      await repository.save({ ...(previous as PortfolioHoroscope) });
      await repository.remove([storagePath]);
      throw new HoroscopeError("Could not safely replace the previous horoscope", 500);
    }
  }

  return horoscope as PortfolioHoroscope;
}

/** Revokes access in the database before removing the underlying private object. */
export async function deleteHoroscope({ supabase, horoscopeId }: { supabase: SupabaseClient; horoscopeId: string }) {
  const repository = new HoroscopeRepository(supabase);
  const { data: horoscope, error } = await repository.delete(horoscopeId);
  if (error || !horoscope) throw new HoroscopeError("Horoscope attachment not found", 404);
  const { error: storageError } = await repository.remove([horoscope.storage_path]);
  if (storageError) throw new HoroscopeError("The attachment was revoked, but storage cleanup is still pending", 500);
}

/** Makes the current ready attachment visible to active approved viewers on publish. */
export async function publishHoroscope({ supabase, portfolioId, publishedAt }: { supabase: SupabaseClient; portfolioId: string; publishedAt: string }) {
  const repository = new HoroscopeRepository(supabase);
  const { error } = await repository.publish(portfolioId, publishedAt);
  if (error) throw new HoroscopeError("Could not publish the horoscope attachment", 500);
}
