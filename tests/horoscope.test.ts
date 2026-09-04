import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findOwnedPortfolio: vi.fn(),
  findPortfolioForOwner: vi.fn(),
  findByPortfolio: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  publish: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
}));
const sharpPipeline = vi.hoisted(() => ({
  timeout: vi.fn(),
  metadata: vi.fn(),
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
  horoscopeFormatLabel,
  horoscopeLanguageSchema,
  MAX_HOROSCOPE_BYTES,
} from "../src/features/horoscope/server/horoscope.contract";
import {
  createOwnerHoroscopeViewUrl,
  deleteHoroscope,
  HoroscopeError,
  publishHoroscope,
  uploadHoroscope,
} from "../src/features/horoscope/server/horoscope.service";

const portfolioId = "8f378bb8-ec91-4f3f-90ef-b7eea2c01506";
const previous = {
  id: "old-id",
  portfolio_id: portfolioId,
  storage_path: `owner/${portfolioId}/old.webp`,
  mime_type: "image/webp",
  file_extension: "webp",
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
  it("accepts only scanned image bytes that match their extension", () => {
    expect(detectHoroscopeFile("scan.jpg", Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toMatchObject({ extension: "webp", kind: "image" });
    expect(detectHoroscopeFile("scan.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toMatchObject({ extension: "webp", kind: "image" });
    expect(detectHoroscopeFile("scan.webp", Buffer.from("RIFFxxxxWEBP"))).toMatchObject({ extension: "webp", kind: "image" });
    expect(detectHoroscopeFile("scan.heif", Buffer.from("xxxxftypmif1"))).toMatchObject({ extension: "webp", kind: "image" });
  });

  it("rejects document containers and extension mismatches", () => {
    expect(() => detectHoroscopeFile("renamed.jpg", Buffer.from("%PDF-1.7"))).toThrow("HOROSCOPE_DOCUMENT_DISABLED");
    expect(() => detectHoroscopeFile("active.pdf", Buffer.from("%PDF-1.7 /JavaScript"))).toThrow("HOROSCOPE_DOCUMENT_DISABLED");
    expect(() => detectHoroscopeFile("macro.docx", Buffer.from("PK\u0003\u0004[Content_Types].xml word/vbaProject.bin"))).toThrow("HOROSCOPE_DOCUMENT_DISABLED");
    expect(() => detectHoroscopeFile("scan.jpg", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toThrow("HOROSCOPE_FILE_UNSUPPORTED");
  });

  it("normalizes optional language labels and limits their length", () => {
    expect(horoscopeLanguageSchema.parse(" Kannada ")).toBe("Kannada");
    expect(horoscopeLanguageSchema.parse("  ")).toBeNull();
    expect(horoscopeLanguageSchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("uses human-readable attachment format labels", () => {
    expect(horoscopeFormatLabel("pdf")).toBe("PDF document");
    expect(horoscopeFormatLabel("doc")).toBe("Word document");
    expect(horoscopeFormatLabel("docx")).toBe("Word document");
    expect(horoscopeFormatLabel("webp")).toBe("Scanned image");
  });
});

describe("horoscope lifecycle service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findOwnedPortfolio.mockResolvedValue({ data: { id: portfolioId }, error: null });
    repository.findPortfolioForOwner.mockResolvedValue({ data: { id: portfolioId }, error: null });
    repository.findByPortfolio.mockResolvedValue({ data: null, error: null });
    repository.upload.mockResolvedValue({ error: null });
    repository.save.mockImplementation(async (payload) => ({ data: { id: "new-id", created_at: "now", updated_at: "now", ...payload }, error: null }));
    repository.remove.mockResolvedValue({ error: null });
    repository.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.test/horoscope" }, error: null });
    repository.delete.mockResolvedValue({ data: previous, error: null });
    repository.publish.mockResolvedValue({ error: null });
    sharpPipeline.rotate.mockReturnValue(sharpPipeline);
    sharpPipeline.timeout.mockReturnValue(sharpPipeline);
    sharpPipeline.metadata.mockResolvedValue({ format: "jpeg", width: 1200, height: 1600, pages: 1, channels: 3 });
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
      file: file(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "new.jpg", "image/jpeg"),
      language: "",
    });
    expect(repository.remove).toHaveBeenCalledWith([previous.storage_path]);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ file_extension: "webp", published_at: null }));
  });

  it("rejects empty and oversized uploads before touching storage", async () => {
    await expect(uploadHoroscope({ supabase: {} as never, userId: "owner", portfolioId, file: file("", "empty.pdf"), language: "" })).rejects.toBeInstanceOf(HoroscopeError);
    await expect(uploadHoroscope({ supabase: {} as never, userId: "owner", portfolioId, file: file(new Uint8Array(MAX_HOROSCOPE_BYTES + 1), "large.pdf"), language: "" })).rejects.toMatchObject({ status: 413 });
    expect(repository.upload).not.toHaveBeenCalled();
  });

  it("fails safely across validation, processing, and persistence boundaries", async () => {
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "x".repeat(81),
    })).rejects.toMatchObject({ status: 400 });

    repository.findOwnedPortfolio.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "",
    })).rejects.toMatchObject({ status: 404 });

    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file("%PDF-1.7", "scan.pdf"), language: "",
    })).rejects.toMatchObject({ status: 415 });

    sharpPipeline.metadata.mockResolvedValueOnce({ width: 0, height: 10 });
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "",
    })).rejects.toMatchObject({ status: 415 });

    repository.findByPortfolio.mockResolvedValueOnce({ data: null, error: { message: "database" } });
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "",
    })).rejects.toMatchObject({ status: 500 });

    repository.upload.mockResolvedValueOnce({ error: { message: "storage" } });
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "",
    })).rejects.toMatchObject({ status: 500 });
  });

  it("cleans up failed writes and rolls back an unsafe replacement", async () => {
    repository.save.mockResolvedValueOnce({ data: null, error: { message: "database" } });
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "",
    })).rejects.toMatchObject({ status: 500 });
    expect(repository.remove).toHaveBeenCalled();

    vi.clearAllMocks();
    repository.findOwnedPortfolio.mockResolvedValue({ data: { id: portfolioId }, error: null });
    repository.findByPortfolio.mockResolvedValue({ data: previous, error: null });
    repository.upload.mockResolvedValue({ error: null });
    repository.save.mockImplementation(async (payload) => ({ data: { id: "new-id", ...payload }, error: null }));
    repository.remove.mockResolvedValueOnce({ error: { message: "storage" } }).mockResolvedValue({ error: null });
    await expect(uploadHoroscope({
      supabase: {} as never, userId: "owner", portfolioId,
      file: file(new Uint8Array([0xff, 0xd8, 0xff]), "scan.jpg"), language: "",
    })).rejects.toMatchObject({ status: 500 });
    expect(repository.save).toHaveBeenCalledWith(previous);
  });

  it("revokes on delete and publishes only through the explicit publish lifecycle", async () => {
    await deleteHoroscope({ supabase: {} as never, horoscopeId: "old-id" });
    expect(repository.delete).toHaveBeenCalledWith("old-id");
    expect(repository.remove).toHaveBeenCalledWith([previous.storage_path]);

    await publishHoroscope({ supabase: {} as never, portfolioId, publishedAt: "2026-08-04T00:00:00.000Z" });
    expect(repository.publish).toHaveBeenCalledWith(portfolioId, "2026-08-04T00:00:00.000Z");
  });

  it("creates owner-only view URLs and maps lookup or signing failures", async () => {
    repository.findByPortfolio.mockResolvedValue({ data: previous, error: null });
    await expect(createOwnerHoroscopeViewUrl({ supabase: {} as never, userId: "owner" }))
      .resolves.toBe("https://signed.test/horoscope");
    expect(repository.createSignedUrl).toHaveBeenCalledWith(previous.storage_path, 300, undefined);

    repository.findPortfolioForOwner.mockResolvedValueOnce({ data: null, error: { message: "missing" } });
    await expect(createOwnerHoroscopeViewUrl({ supabase: {} as never, userId: "owner" }))
      .rejects.toMatchObject({ status: 404 });

    repository.findByPortfolio.mockResolvedValueOnce({ data: null, error: { message: "missing" } });
    await expect(createOwnerHoroscopeViewUrl({ supabase: {} as never, userId: "owner" }))
      .rejects.toMatchObject({ status: 404 });

    repository.createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "storage" } });
    await expect(createOwnerHoroscopeViewUrl({ supabase: {} as never, userId: "owner" }))
      .rejects.toMatchObject({ status: 500 });
  });

  it("surfaces delete, storage cleanup, and publish failures", async () => {
    repository.delete.mockResolvedValueOnce({ data: null, error: { message: "missing" } });
    await expect(deleteHoroscope({ supabase: {} as never, horoscopeId: "missing" })).rejects.toMatchObject({ status: 404 });

    repository.delete.mockResolvedValueOnce({ data: previous, error: null });
    repository.remove.mockResolvedValueOnce({ error: { message: "storage" } });
    await expect(deleteHoroscope({ supabase: {} as never, horoscopeId: "old-id" })).rejects.toMatchObject({ status: 500 });

    repository.publish.mockResolvedValueOnce({ error: { message: "database" } });
    await expect(publishHoroscope({ supabase: {} as never, portfolioId, publishedAt: "now" })).rejects.toMatchObject({ status: 500 });
  });
});
