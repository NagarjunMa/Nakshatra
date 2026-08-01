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
});
