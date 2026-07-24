import { describe, expect, it, vi } from "vitest";
import { orderPortfolioPhotos } from "../src/features/media/portfolio-photo";
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
  },
] satisfies PortfolioMedia[];

describe("portfolio hero photo URLs", () => {
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
      { id: "hero-id", src: "https://photos.test/hero", alt: "Portfolio photo" },
    ]);
    expect(createSignedUrl).toHaveBeenNthCalledWith(1, "owner/portfolio/hero.webp", 3600);
    expect(createSignedUrl).toHaveBeenNthCalledWith(2, "owner/portfolio/gallery.webp", 3600);
  });
});
