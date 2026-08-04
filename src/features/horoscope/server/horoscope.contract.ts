import { z } from "zod/v4";

export const MAX_HOROSCOPE_BYTES = 20 * 1024 * 1024;

export const horoscopeLanguageSchema = z
  .string()
  .trim()
  .max(80, "Keep the language label under 80 characters")
  .transform((value) => value || null);

export interface DetectedHoroscopeFile {
  extension: "pdf" | "doc" | "docx" | "webp";
  mimeType:
    | "application/pdf"
    | "application/msword"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "image/webp";
  kind: "pdf" | "word" | "image";
}

const PDF_DANGEROUS_MARKERS = ["/JavaScript", "/JS", "/Launch", "/EmbeddedFile"];
const OFFICE_DANGEROUS_MARKERS = ["vbaProject.bin", "_VBA_PROJECT", "Macros/", "embeddings/oleObject"];

function startsWith(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function extensionOf(filename: string) {
  return filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

/** Detects a supported document from bytes and filename while rejecting active content. */
export function detectHoroscopeFile(filename: string, bytes: Buffer): DetectedHoroscopeFile {
  const extension = extensionOf(filename);
  const sample = bytes.toString("latin1");

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) && extension === "pdf") {
    if (PDF_DANGEROUS_MARKERS.some((marker) => sample.includes(marker))) {
      throw new Error("PDF_ACTIVE_CONTENT");
    }
    return { extension: "pdf", mimeType: "application/pdf", kind: "pdf" };
  }

  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && extension === "doc") {
    if (OFFICE_DANGEROUS_MARKERS.some((marker) => sample.includes(marker))) {
      throw new Error("WORD_ACTIVE_CONTENT");
    }
    return { extension: "doc", mimeType: "application/msword", kind: "word" };
  }

  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && extension === "docx") {
    if (!sample.includes("[Content_Types].xml") || !sample.includes("word/")) {
      throw new Error("WORD_INVALID_CONTAINER");
    }
    if (OFFICE_DANGEROUS_MARKERS.some((marker) => sample.includes(marker))) {
      throw new Error("WORD_ACTIVE_CONTENT");
    }
    return {
      extension: "docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      kind: "word",
    };
  }

  const isJpeg = startsWith(bytes, [0xff, 0xd8, 0xff]);
  const isPng = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isHeic = bytes.length >= 12
    && bytes.subarray(4, 8).toString("ascii") === "ftyp"
    && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(bytes.subarray(8, 12).toString("ascii"));
  if ((isJpeg && ["jpg", "jpeg"].includes(extension)) || (isPng && extension === "png") || (isHeic && extension === "heic")) {
    return { extension: "webp", mimeType: "image/webp", kind: "image" };
  }

  throw new Error("HOROSCOPE_FILE_UNSUPPORTED");
}

export function horoscopeFormatLabel(extension: DetectedHoroscopeFile["extension"]) {
  if (extension === "pdf") return "PDF document";
  if (extension === "doc" || extension === "docx") return "Word document";
  return "Scanned image";
}
