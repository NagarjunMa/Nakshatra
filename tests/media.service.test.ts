import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findOwnedPortfolio: vi.fn(),
  countProfilePhotos: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createMedia: vi.fn(),
  updateMedia: vi.fn(),
  findMedia: vi.fn(),
  findPortfolioPhotos: vi.fn(),
  download: vi.fn(),
  setPrimaryHero: vi.fn(),
  deleteMedia: vi.fn(),
}));
const sharpMock = vi.hoisted(() => vi.fn());
const sharpMetadata = vi.hoisted(() => vi.fn());

vi.mock("../src/features/media/server/media.repository", () => ({
  PortfolioMediaRepository: class {
    constructor() {
      return repository;
    }
  },
}));

vi.mock("sharp", () => ({ default: sharpMock }));

import {
  deletePortfolioPhoto,
  ensurePortfolioPhotoPreviews,
  PortfolioMediaError,
  updatePortfolioPhoto,
  uploadPortfolioPhoto,
} from "../src/features/media/server/media.service";

const userId = "user-id";
const portfolioId = "portfolio-id";
const media = {
  id: "media-id",
  portfolio_id: portfolioId,
  storage_path: `${userId}/${portfolioId}/photo.webp`,
  thumbnail_path: `${userId}/${portfolioId}/photo-thumb.webp`,
  media_type: "hero",
  visibility: "interest_required",
  sort_order: 0,
  alt_text: null,
};

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+M4K6xQAAAABJRU5ErkJggg==",
  "base64"
);

function mockSharp() {
  sharpMock.mockImplementation((source: Buffer) => {
    if (source.toString() === "not an image") throw new Error("Invalid image");
    const pipeline = {
      rotate: vi.fn(),
      timeout: vi.fn(),
      metadata: sharpMetadata,
      resize: vi.fn(),
      blur: vi.fn(),
      webp: vi.fn(),
      toBuffer: vi.fn((options?: { resolveWithObject?: boolean }) =>
        Promise.resolve(
          options?.resolveWithObject
            ? {
                data: Buffer.from("webp"),
                info: { width: 900, height: 1200 },
              }
            : Buffer.from("webp")
        )
      ),
    };
    pipeline.rotate.mockReturnValue(pipeline);
    pipeline.timeout.mockReturnValue(pipeline);
    pipeline.resize.mockReturnValue(pipeline);
    pipeline.blur.mockReturnValue(pipeline);
    pipeline.webp.mockReturnValue(pipeline);
    return pipeline;
  });
}

function photo({
  type = "image/png",
  bytes = onePixelPng,
  size = bytes.length,
}: {
  type?: string;
  bytes?: Buffer;
  size?: number;
} = {}) {
  return {
    type,
    size,
    arrayBuffer: vi.fn().mockResolvedValue(bytes),
  } as unknown as File;
}

function mockUploadSuccess(count = 0) {
  repository.findOwnedPortfolio.mockResolvedValue({
    data: { id: portfolioId, candidate_id: "candidate-id" },
    error: null,
  });
  repository.countProfilePhotos.mockResolvedValue({ count, error: null });
  repository.upload.mockResolvedValue({ error: null });
  repository.remove.mockResolvedValue({ error: null });
  repository.createMedia.mockResolvedValue({ data: media, error: null });
}

describe("portfolio media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharpMetadata.mockResolvedValue({ format: "png", width: 900, height: 1200, pages: 1, channels: 4 });
    mockSharp();
    mockUploadSuccess();
    repository.updateMedia.mockResolvedValue({ data: media, error: null });
    repository.findMedia.mockResolvedValue({ data: media, error: null });
    repository.setPrimaryHero.mockResolvedValue({ data: true, error: null });
    repository.deleteMedia.mockResolvedValue({ data: media, error: null });
  });

  it("rejects oversized and unsupported files before storage access", async () => {
    await expect(
      uploadPortfolioPhoto({
        supabase: {} as never,
        userId,
        portfolioId,
        file: photo({ size: 10 * 1024 * 1024 + 1 }),
        visibility: "interest_required",
      })
    ).rejects.toMatchObject({ status: 413 });

    await expect(
      uploadPortfolioPhoto({
        supabase: {} as never,
        userId,
        portfolioId,
        file: photo({ type: "application/pdf" }),
        visibility: "interest_required",
      })
    ).rejects.toMatchObject({ status: 415 });
    expect(repository.findOwnedPortfolio).not.toHaveBeenCalled();
  });

  it("rejects photos for missing portfolios and full galleries", async () => {
    repository.findOwnedPortfolio.mockResolvedValue({ data: null, error: null });
    await expect(
      uploadPortfolioPhoto({ supabase: {} as never, userId, portfolioId, file: photo(), visibility: "public" })
    ).rejects.toMatchObject({ status: 404 });

    mockUploadSuccess(8);
    await expect(
      uploadPortfolioPhoto({ supabase: {} as never, userId, portfolioId, file: photo(), visibility: "public" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("processes an image, stores owner and protected renditions, and creates the hero metadata", async () => {
    await expect(
      uploadPortfolioPhoto({
        supabase: {} as never,
        userId,
        portfolioId,
        file: photo(),
        visibility: "interest_required",
      })
    ).resolves.toEqual(media);
    expect(repository.upload).toHaveBeenCalledTimes(3);
    expect(repository.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        media_type: "hero",
        visibility: "interest_required",
        metadata: {
          width: 900,
          height: 1200,
          aspectRatio: 0.75,
          orientation: "portrait",
          blurPath: expect.stringMatching(
            new RegExp(`^${userId}/${portfolioId}/[0-9a-f-]+-blur\\.webp$`)
          ),
        },
      })
    );
  });

  it("cleans up when image storage or metadata persistence fails", async () => {
    repository.upload.mockResolvedValueOnce({ error: new Error("storage") });
    await expect(
      uploadPortfolioPhoto({ supabase: {} as never, userId, portfolioId, file: photo(), visibility: "public" })
    ).rejects.toMatchObject({ status: 500 });
    expect(repository.remove).toHaveBeenCalledOnce();

    mockUploadSuccess(1);
    repository.remove.mockClear();
    repository.createMedia.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      uploadPortfolioPhoto({ supabase: {} as never, userId, portfolioId, file: photo(), visibility: "public" })
    ).rejects.toMatchObject({ status: 500 });
    expect(repository.remove).toHaveBeenCalledOnce();
  });

  it("wraps invalid image data in a safe processing error", async () => {
    await expect(
      uploadPortfolioPhoto({
        supabase: {} as never,
        userId,
        portfolioId,
        file: photo({ bytes: Buffer.from("not an image") }),
        visibility: "public",
      })
    ).rejects.toEqual(new PortfolioMediaError("Could not process that image", 500));
  });

  it("rejects decoded image types and dimensions that do not match the upload contract", async () => {
    sharpMetadata.mockResolvedValueOnce({ format: "jpeg", width: 900, height: 1200, pages: 1, channels: 3 });
    await expect(uploadPortfolioPhoto({
      supabase: {} as never,
      userId,
      portfolioId,
      file: photo({ type: "image/png" }),
      visibility: "public",
    })).rejects.toMatchObject({ status: 415 });

    sharpMetadata.mockResolvedValueOnce({ format: "png", width: 20_000, height: 20_000, pages: 1, channels: 4 });
    await expect(uploadPortfolioPhoto({
      supabase: {} as never,
      userId,
      portfolioId,
      file: photo(),
      visibility: "public",
    })).rejects.toMatchObject({ status: 415 });
  });

  it("updates hero selection and fails safely when the media is unavailable", async () => {
    await expect(
      updatePortfolioPhoto({
        supabase: {} as never,
        mediaId: media.id,
        changes: { media_type: "hero" },
      })
    ).resolves.toEqual(media);
    expect(repository.setPrimaryHero).toHaveBeenCalledWith(media.id);

    repository.updateMedia.mockResolvedValue({ data: null, error: null });
    await expect(
      updatePortfolioPhoto({
        supabase: {} as never,
        mediaId: media.id,
        changes: { visibility: "public" },
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("creates a safe derivative when an existing photo becomes protected", async () => {
    repository.findMedia.mockResolvedValue({
      data: { ...media, metadata: { width: 900, height: 1200 } },
      error: null,
    });
    repository.download.mockResolvedValue({
      data: new Blob([onePixelPng]),
      error: null,
    });

    await updatePortfolioPhoto({
      supabase: {} as never,
      mediaId: media.id,
      changes: { visibility: "interest_required" },
    });

    expect(repository.upload).toHaveBeenCalledWith(
      `${userId}/${portfolioId}/photo-blur.webp`,
      expect.any(Buffer)
    );
    expect(repository.updateMedia).toHaveBeenCalledWith(
      media.id,
      expect.objectContaining({
        visibility: "interest_required",
        metadata: expect.objectContaining({
          blurPath: `${userId}/${portfolioId}/photo-blur.webp`,
        }),
      })
    );
  });

  it("creates the same safe derivative for approved-interest-only photos", async () => {
    repository.findMedia.mockResolvedValue({
      data: { ...media, metadata: { width: 900, height: 1200 } },
      error: null,
    });
    repository.download.mockResolvedValue({ data: new Blob([onePixelPng]), error: null });

    await updatePortfolioPhoto({
      supabase: {} as never,
      mediaId: media.id,
      changes: { visibility: "approved_only" },
    });

    expect(repository.updateMedia).toHaveBeenCalledWith(
      media.id,
      expect.objectContaining({
        visibility: "approved_only",
        metadata: expect.objectContaining({ blurPath: `${userId}/${portfolioId}/photo-blur.webp` }),
      })
    );
  });

  it("backfills missing photo derivatives before publishing", async () => {
    repository.findPortfolioPhotos.mockResolvedValue({
      data: [
        { ...media, id: "already-safe", metadata: { blurPath: "already-blurred.webp" } },
        { ...media, id: "legacy-public", visibility: "public", metadata: { width: 900, height: 1200 } },
      ],
      error: null,
    });
    repository.download.mockResolvedValue({ data: new Blob([onePixelPng]), error: null });
    repository.updateMedia.mockResolvedValue({ data: media, error: null });

    await expect(
      ensurePortfolioPhotoPreviews({ supabase: {} as never, portfolioId })
    ).resolves.toBeUndefined();
    expect(repository.download).toHaveBeenCalledTimes(1);
    expect(repository.updateMedia).toHaveBeenCalledWith(
      "legacy-public",
      { metadata: expect.objectContaining({ blurPath: `${userId}/${portfolioId}/photo-blur.webp` }) }
    );
  });

  it("fails closed when photo derivatives cannot be safely prepared", async () => {
    repository.findPortfolioPhotos.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      ensurePortfolioPhotoPreviews({ supabase: {} as never, portfolioId })
    ).rejects.toMatchObject({ status: 500 });

    repository.findPortfolioPhotos.mockResolvedValue({ data: [{ ...media, metadata: {} }], error: null });
    repository.download.mockResolvedValue({ data: new Blob([onePixelPng]), error: null });
    repository.upload.mockResolvedValue({ error: new Error("storage") });
    await expect(
      ensurePortfolioPhotoPreviews({ supabase: {} as never, portfolioId })
    ).rejects.toMatchObject({ status: 500 });
  });

  it("reports atomic hero promotion and storage deletion failures", async () => {
    repository.setPrimaryHero.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      updatePortfolioPhoto({
        supabase: {} as never,
        mediaId: media.id,
        changes: { media_type: "hero" },
      })
    ).rejects.toMatchObject({ status: 500 });

    repository.remove.mockResolvedValue({ error: new Error("storage") });
    await expect(
      deletePortfolioPhoto({ supabase: {} as never, mediaId: media.id })
    ).rejects.toMatchObject({ status: 500 });
  });

  it("deletes media metadata and stored files, including missing-media protection", async () => {
    await expect(
      deletePortfolioPhoto({ supabase: {} as never, mediaId: media.id })
    ).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalledWith([media.storage_path, media.thumbnail_path]);

    repository.deleteMedia.mockResolvedValue({ data: null, error: null });
    await expect(
      deletePortfolioPhoto({ supabase: {} as never, mediaId: media.id })
    ).rejects.toMatchObject({ status: 404 });
  });
});
