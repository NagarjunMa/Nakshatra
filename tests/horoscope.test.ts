import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findOwnedPortfolio: vi.fn(),
  findByPortfolio: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  publish: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
const sharpPipeline = vi.hoisted(() => ({
  rotate: vi.fn(),
  resize: vi.fn(),
  webp: vi.fn(),
  toBuffer: vi.fn(),
}));

vi.mock("../src/features/horoscope/server/horoscope.repository", () => ({
  HoroscopeRepository: class {
    constructor() {
      return repository;
    }
  },
}));
vi.mock("sharp", () => ({ default: vi.fn(() => sharpPipeline) }));

import {
  detectHoroscopeFile,
  horoscopeLanguageSchema,
  MAX_HOROSCOPE_BYTES,
} from "../src/features/horoscope/server/horoscope.contract";
import {
  deleteHoroscope,
  HoroscopeError,
  publishHoroscope,
  uploadHoroscope,
} from "../src/features/horoscope/server/horoscope.service";

const portfolioId = "8f378bb8-ec91-4f3f-90ef-b7eea2c01506";
const previous = {
  id: "old-id",
  portfolio_id: portfolioId,
  storage_path: `owner/${portfolioId}/old.pdf`,
  mime_type: "application/pdf",
  file_extension: "pdf",
  byte_size: 20,
  language_label: "Kannada",
  page_count: null,
  published_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function file(bytes: Uint8Array | string, name: string, type = "application/octet-stream") {
  const contents: BlobPart = typeof bytes === "string"
    ? bytes
    : (new Uint8Array(bytes).buffer as ArrayBuffer);
  return new File([contents], name, { type });
}

describe("horoscope file contract", () => {
  it("detects supported bytes instead of trusting the browser MIME type", () => {
    expect(detectHoroscopeFile("chart.pdf", Buffer.from("%PDF-1.7\nbody"))).toMatchObject({ extension: "pdf", kind: "pdf" });
    expect(detectHoroscopeFile("chart.doc", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toMatchObject({ extension: "doc", kind: "word" });
    expect(detectHoroscopeFile("chart.docx", Buffer.from("PK\u0003\u0004[Content_Types].xml word/document.xml"))).toMatchObject({ extension: "docx", kind: "word" });
    expect(detectHoroscopeFile("scan.jpg", Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toMatchObject({ extension: "webp", kind: "image" });
    expect(detectHoroscopeFile("scan.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toMatchObject({ extension: "webp", kind: "image" });
  });

  it("rejects extension mismatches and active document content", () => {
    expect(() => detectHoroscopeFile("renamed.jpg", Buffer.from("%PDF-1.7"))).toThrow("HOROSCOPE_FILE_UNSUPPORTED");
    expect(() => detectHoroscopeFile("active.pdf", Buffer.from("%PDF-1.7 /JavaScript"))).toThrow("PDF_ACTIVE_CONTENT");
    expect(() => detectHoroscopeFile("macro.docx", Buffer.from("PK\u0003\u0004[Content_Types].xml word/vbaProject.bin"))).toThrow("WORD_ACTIVE_CONTENT");
  });

  it("normalizes optional language labels and limits their length", () => {
    expect(horoscopeLanguageSchema.parse(" Kannada ")).toBe("Kannada");
    expect(horoscopeLanguageSchema.parse("  ")).toBeNull();
    expect(horoscopeLanguageSchema.safeParse("x".repeat(81)).success).toBe(false);
  });
});

describe("horoscope lifecycle service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findOwnedPortfolio.mockResolvedValue({ data: { id: portfolioId }, error: null });
    repository.findByPortfolio.mockResolvedValue({ data: null, error: null });
    repository.upload.mockResolvedValue({ error: null });
    repository.save.mockImplementation(async (payload) => ({ data: { id: "new-id", created_at: "now", updated_at: "now", ...payload }, error: null }));
    repository.remove.mockResolvedValue({ error: null });
    repository.delete.mockResolvedValue({ data: previous, error: null });
    repository.publish.mockResolvedValue({ error: null });
    sharpPipeline.rotate.mockReturnValue(sharpPipeline);
    sharpPipeline.resize.mockReturnValue(sharpPipeline);
    sharpPipeline.webp.mockReturnValue(sharpPipeline);
    sharpPipeline.toBuffer.mockResolvedValue(Buffer.from("sanitized-webp"));
  });

  it("sanitizes an image, stores a neutral generated path, and keeps it unpublished", async () => {
    const result = await uploadHoroscope({
      supabase: {} as never,
      userId: "owner",
      portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "family-name.jpg", "image/jpeg"),
      language: "Kannada",
    });

    expect(repository.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^owner/${portfolioId}/[0-9a-f-]+\\.webp$`)),
      Buffer.from("sanitized-webp"),
      "image/webp"
    );
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ published_at: null, page_count: 1, language_label: "Kannada" }));
    expect(result).toMatchObject({ file_extension: "webp", published_at: null });
  });

  it("replaces the database row before removing the previous object", async () => {
    repository.findByPortfolio.mockResolvedValue({ data: previous, error: null });
    await uploadHoroscope({
      supabase: {} as never,
      userId: "owner",
      portfolioId,
      file: file("%PDF-1.7\nbody", "new.pdf", "application/pdf"),
      language: "",
    });
    expect(repository.remove).toHaveBeenCalledWith([previous.storage_path]);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ file_extension: "pdf", published_at: null }));
  });

  it("rejects empty and oversized uploads before touching storage", async () => {
    await expect(uploadHoroscope({ supabase: {} as never, userId: "owner", portfolioId, file: file("", "empty.pdf"), language: "" })).rejects.toBeInstanceOf(HoroscopeError);
    await expect(uploadHoroscope({ supabase: {} as never, userId: "owner", portfolioId, file: file(new Uint8Array(MAX_HOROSCOPE_BYTES + 1), "large.pdf"), language: "" })).rejects.toMatchObject({ status: 413 });
    expect(repository.upload).not.toHaveBeenCalled();
  });

  it("revokes on delete and publishes only through the explicit publish lifecycle", async () => {
    await deleteHoroscope({ supabase: {} as never, horoscopeId: "old-id" });
    expect(repository.delete).toHaveBeenCalledWith("old-id");
    expect(repository.remove).toHaveBeenCalledWith([previous.storage_path]);

    await publishHoroscope({ supabase: {} as never, portfolioId, publishedAt: "2026-08-04T00:00:00.000Z" });
    expect(repository.publish).toHaveBeenCalledWith(portfolioId, "2026-08-04T00:00:00.000Z");
  });
});
