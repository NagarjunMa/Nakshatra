import "server-only";

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioHoroscope } from "@/types/portfolio";
import { detectHoroscopeFile, horoscopeLanguageSchema, MAX_HOROSCOPE_BYTES } from "./horoscope.contract";
import { HoroscopeRepository } from "./horoscope.repository";

export class HoroscopeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function uploadError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "PDF_ACTIVE_CONTENT") return new HoroscopeError("Use a PDF without scripts, embedded files, or launch actions", 415);
  if (code === "WORD_ACTIVE_CONTENT") return new HoroscopeError("Use a Word document without macros or embedded objects", 415);
  if (code === "WORD_INVALID_CONTAINER") return new HoroscopeError("That DOCX file is damaged or is not a Word document", 415);
  return new HoroscopeError("Use a PDF, DOC, DOCX, JPG, PNG, or HEIC file", 415);
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

  let output: Buffer<ArrayBufferLike> = source;
  let pageCount: number | null = null;
  if (detected.kind === "image") {
    try {
      output = await sharp(source).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
      pageCount = 1;
    } catch {
      throw new HoroscopeError("We could not safely process that image. Try a PDF, JPG, or PNG instead", 415);
    }
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
