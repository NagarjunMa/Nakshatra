import { describe, expect, it, vi } from "vitest";
import {
  classifyPhotoOrientation,
  orderPortfolioPhotos,
} from "../src/features/media/portfolio-photo";
import { createPortfolioPhotoUrls } from "../src/features/media/server/photo-url.service";
import type { PortfolioMedia } from "../src/types/portfolio";

const media = [
  {
    id: "gallery-id",
    portfolio_id: "portfolio-id",
    storage_path: "owner/portfolio/gallery.webp",
    thumbnail_path: null,
    media_type: "gallery",
    visibility: "public",
    sort_order: 0,
    alt_text: "A garden portrait",
  },
  {
    id: "hero-id",
    portfolio_id: "portfolio-id",
    storage_path: "owner/portfolio/hero.webp",
    thumbnail_path: null,
    media_type: "hero",
    visibility: "public",
    sort_order: 4,
    alt_text: null,
    metadata: { width: 900, height: 1200, aspectRatio: 0.75, orientation: "portrait" },
  },
] satisfies PortfolioMedia[];

describe("portfolio hero photo URLs", () => {
  it("classifies post-rotation image dimensions", () => {
    expect(classifyPhotoOrientation(900, 1200)).toBe("portrait");
    expect(classifyPhotoOrientation(1600, 900)).toBe("landscape");
    expect(classifyPhotoOrientation(1000, 960)).toBe("square");
    expect(classifyPhotoOrientation()).toBe("unknown");
  });

  it("places the selected hero before gallery images without changing the source array", () => {
    const ordered = orderPortfolioPhotos(media);

    expect(ordered.map((item) => item.id)).toEqual(["hero-id", "gallery-id"]);
    expect(media[0].id).toBe("gallery-id");
  });

  it("creates ordered signed URLs and excludes assets that cannot be signed", async () => {
    const createSignedUrl = vi
      .fn()
      .mockResolvedValueOnce({ data: { signedUrl: "https://photos.test/hero" } })
      .mockResolvedValueOnce({ data: null });
    const supabase = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;

    await expect(createPortfolioPhotoUrls({ supabase, media })).resolves.toEqual([
      {
        id: "hero-id",
        src: "https://photos.test/hero",
        alt: "Portfolio photo",
        mediaType: "hero",
        width: 900,
        height: 1200,
        aspectRatio: 0.75,
        orientation: "portrait",
      },
    ]);
    expect(createSignedUrl).toHaveBeenNthCalledWith(1, "owner/portfolio/hero.webp", 3600);
    expect(createSignedUrl).toHaveBeenNthCalledWith(2, "owner/portfolio/gallery.webp", 3600);
  });

  it("signs only the safe derivative for a protected public photo", async () => {
    const protectedMedia: PortfolioMedia = {
      ...media[0],
      visibility: "interest_required",
      metadata: {
        width: 1200,
        height: 800,
        orientation: "landscape",
        blurPath: "owner/portfolio/gallery-blur.webp",
      },
    };
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://photos.test/gallery-blur" },
    });
    const supabase = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;

    await expect(
      createPortfolioPhotoUrls({ supabase, media: [protectedMedia], viewer: "public" })
    ).resolves.toEqual([
      expect.objectContaining({
        src: "https://photos.test/gallery-blur",
        presentation: "blurred",
      }),
    ]);
    expect(createSignedUrl).toHaveBeenCalledWith(
      "owner/portfolio/gallery-blur.webp",
      3600
    );
    expect(createSignedUrl).not.toHaveBeenCalledWith(
      "owner/portfolio/gallery.webp",
      expect.anything()
    );
  });

  it("shows approved-interest-only photos as blurred previews before approval", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://photos.test/approved-blur" },
    });
    const supabase = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;

    const approvedOnly: PortfolioMedia = {
      ...media[0],
      visibility: "approved_only",
      metadata: { blurPath: "owner/portfolio/approved-blur.webp" },
    };
    const result = await createPortfolioPhotoUrls({
      supabase,
      media: [approvedOnly],
      viewer: "public",
    });

    expect(result[0]).toMatchObject({
      src: "https://photos.test/approved-blur",
      presentation: "blurred",
    });
    expect(createSignedUrl).toHaveBeenCalledWith("owner/portfolio/approved-blur.webp", 3600);
  });

  it("shows only one clear gallery photo in Private mode and signs safe derivatives for the rest", async () => {
    const privateMedia: PortfolioMedia[] = [
      {
        ...media[0],
        id: "first-public",
        sort_order: 0,
        metadata: { blurPath: "owner/portfolio/first-public-blur.webp" },
      },
      {
        ...media[0],
        id: "protected",
        sort_order: 1,
        visibility: "approved_only",
        storage_path: "owner/portfolio/protected.webp",
        metadata: { blurPath: "owner/portfolio/protected-blur.webp" },
      },
      {
        ...media[0],
        id: "second-public",
        sort_order: 2,
        storage_path: "owner/portfolio/second-public.webp",
        metadata: { blurPath: "owner/portfolio/second-public-blur.webp" },
      },
    ];
    const createSignedUrl = vi.fn(async (path: string) => ({
      data: { signedUrl: `https://photos.test/${path}` },
    }));
    const supabase = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;

    const result = await createPortfolioPhotoUrls({
      supabase,
      media: privateMedia,
      viewer: "public",
      privacyMode: "private",
    });

    expect(result.map((photo) => [photo.id, photo.presentation ?? "clear"])).toEqual([
      ["first-public", "clear"],
      ["protected", "blurred"],
      ["second-public", "blurred"],
    ]);
    expect(createSignedUrl).toHaveBeenCalledWith("owner/portfolio/gallery.webp", 3600);
    expect(createSignedUrl).toHaveBeenCalledWith("owner/portfolio/protected-blur.webp", 3600);
    expect(createSignedUrl).toHaveBeenCalledWith("owner/portfolio/second-public-blur.webp", 3600);
    expect(createSignedUrl).not.toHaveBeenCalledWith("owner/portfolio/protected.webp", expect.anything());
    expect(createSignedUrl).not.toHaveBeenCalledWith("owner/portfolio/second-public.webp", expect.anything());
  });

  it("omits legacy protected photos until a safe derivative exists", async () => {
    const createSignedUrl = vi.fn();
    const supabase = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;

    await expect(
      createPortfolioPhotoUrls({
        supabase,
        media: [{ ...media[0], visibility: "interest_required" }],
        viewer: "public",
      })
    ).resolves.toEqual([]);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
