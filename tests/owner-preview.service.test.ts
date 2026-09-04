import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  dashboard: { findOwnerPreviewPortfolioForUser: vi.fn() },
  media: { findPortfolioPhotos: vi.fn() },
  horoscope: { findByPortfolio: vi.fn() },
  ensurePreviews: vi.fn(),
  photoUrls: vi.fn(),
}));

vi.mock("@/features/portfolio/server/dashboard.repository", () => ({
  DashboardRepository: class { constructor() { return dependencies.dashboard; } },
}));
vi.mock("@/features/media/server/media.repository", () => ({
  PortfolioMediaRepository: class { constructor() { return dependencies.media; } },
}));
vi.mock("@/features/horoscope/server/horoscope.repository", () => ({
  HoroscopeRepository: class { constructor() { return dependencies.horoscope; } },
}));
vi.mock("@/features/media/server/media.service", () => ({
  ensurePortfolioPhotoPreviews: dependencies.ensurePreviews,
}));
vi.mock("@/features/media/server/photo-url.service", () => ({
  createPortfolioPhotoUrls: dependencies.photoUrls,
}));

import {
  loadOwnerApprovedPreview,
  loadOwnerPublicPreview,
} from "@/features/portfolio/server/owner-preview.service";

const portfolio = {
  id: "portfolio-1",
  draft_data: {
    personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
    privacy_mode: "balanced",
  },
  template_id: 1,
  theme_color: null,
  sun_sign: null,
  privacy_mode: "balanced",
};

describe("owner preview service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.dashboard.findOwnerPreviewPortfolioForUser.mockResolvedValue({ data: portfolio, error: null });
    dependencies.media.findPortfolioPhotos.mockResolvedValue({ data: [{ id: "media-1" }], error: null });
    dependencies.horoscope.findByPortfolio.mockResolvedValue({ data: null, error: null });
    dependencies.photoUrls.mockResolvedValue([{ id: "photo-1", src: "https://signed.test/photo" }]);
  });

  it("returns null when the owner has no portfolio", async () => {
    dependencies.dashboard.findOwnerPreviewPortfolioForUser.mockResolvedValue({ data: null, error: null });
    await expect(loadOwnerPublicPreview({} as never, "owner-1")).resolves.toBeNull();
    await expect(loadOwnerApprovedPreview({} as never, "owner-1")).resolves.toBeNull();
  });

  it("prepares protected derivatives before building the public preview", async () => {
    const result = await loadOwnerPublicPreview({} as never, "owner-1");
    expect(result).toMatchObject({ portfolio: { id: "portfolio-1" }, photos: [{ id: "photo-1" }] });
    expect(dependencies.ensurePreviews).toHaveBeenCalledWith(expect.objectContaining({ portfolioId: "portfolio-1" }));
    expect(dependencies.photoUrls).toHaveBeenCalledWith(expect.objectContaining({ viewer: "public" }));
  });

  it("loads approved photos and an optional horoscope attachment", async () => {
    dependencies.horoscope.findByPortfolio.mockResolvedValue({
      data: {
        file_extension: "webp",
        language_label: "Kannada",
        page_count: 2,
      },
      error: null,
    });
    const result = await loadOwnerApprovedPreview({} as never, "owner-1");
    expect(result).toMatchObject({
      horoscopeAttachment: {
        href: "/api/portfolio-horoscope/view",
        formatLabel: "Scanned image",
        languageLabel: "Kannada",
        pageCount: 2,
      },
    });
    expect(dependencies.photoUrls).toHaveBeenCalledWith(expect.objectContaining({ viewer: "approved" }));
  });

  it("returns an approved preview without an attachment when no horoscope exists", async () => {
    dependencies.media.findPortfolioPhotos.mockResolvedValue({ data: null, error: null });

    await expect(loadOwnerApprovedPreview({} as never, "owner-1")).resolves.toMatchObject({
      portfolio: { id: "portfolio-1" },
      photos: [{ id: "photo-1" }],
      horoscopeAttachment: undefined,
    });
    expect(dependencies.photoUrls).toHaveBeenCalledWith(expect.objectContaining({
      media: [],
      viewer: "approved",
    }));
  });

  it("normalizes missing media rows for the public preview", async () => {
    dependencies.media.findPortfolioPhotos.mockResolvedValue({ data: null, error: null });

    await loadOwnerPublicPreview({} as never, "owner-1");
    expect(dependencies.photoUrls).toHaveBeenCalledWith(expect.objectContaining({
      media: [],
      viewer: "public",
    }));
  });
});
