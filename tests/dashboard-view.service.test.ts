import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  dashboard: {
    findDashboardPortfolioForUser: vi.fn(),
    countPortfolioViews: vi.fn(),
  },
  media: { findPortfolioPhotos: vi.fn() },
  horoscope: { findByPortfolio: vi.fn() },
  interest: { listForPortfolio: vi.fn() },
  access: vi.fn(),
  mediaUrls: vi.fn(),
}));

vi.mock("@/features/portfolio/server/dashboard.repository", () => ({
  DashboardRepository: class { constructor() { return repositories.dashboard; } },
}));
vi.mock("@/features/media/server/media.repository", () => ({
  PortfolioMediaRepository: class { constructor() { return repositories.media; } },
}));
vi.mock("@/features/horoscope/server/horoscope.repository", () => ({
  HoroscopeRepository: class { constructor() { return repositories.horoscope; } },
}));
vi.mock("@/features/interest/server/interest.repository", () => ({
  InterestRepository: class { constructor() { return repositories.interest; } },
}));
vi.mock("@/features/access/server/access.service", () => ({
  getPortfolioAccessSummary: repositories.access,
}));
vi.mock("@/features/media/server/photo-url.service", () => ({
  createOwnerPortfolioMediaPreviewUrls: repositories.mediaUrls,
}));

import {
  loadDashboardView,
  mapDashboardPortfolio,
} from "@/features/portfolio/server/dashboard-view.service";

const row = {
  id: "portfolio-1",
  user_id: "owner-1",
  candidate_id: null,
  share_token: "share-token",
  draft_data: { personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" } },
  published_data: null,
  template_id: 1,
  theme_color: null,
  sun_sign: null,
  is_published: false,
  published_at: null,
  expires_at: null,
  last_renewed_at: null,
  privacy_mode: "balanced",
  visibility_settings: { family: "approved" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("dashboard view service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositories.dashboard.findDashboardPortfolioForUser.mockResolvedValue({ data: row, error: null });
    repositories.dashboard.countPortfolioViews.mockResolvedValue({ count: 7, error: null });
    repositories.media.findPortfolioPhotos.mockResolvedValue({ data: [{ id: "media-1" }], error: null });
    repositories.horoscope.findByPortfolio.mockResolvedValue({ data: { id: "horoscope-1" }, error: null });
    repositories.interest.listForPortfolio.mockResolvedValue({
      data: [{ id: "interest-1", metadata: { city: "Boston" } }], error: null,
    });
    repositories.access.mockResolvedValue({ grants: [{ id: "grant-1" }], events: [] });
    repositories.mediaUrls.mockResolvedValue({ "media-1": "https://signed.test/media-1" });
  });

  it("returns an empty projection without issuing child reads for a new owner", async () => {
    repositories.dashboard.findDashboardPortfolioForUser.mockResolvedValue({ data: null, error: null });

    await expect(loadDashboardView({ supabase: {} as never, userId: "owner-1" })).resolves.toEqual({
      portfolio: null,
      viewCount: 0,
      media: [],
      mediaUrls: {},
      horoscope: null,
      interests: [],
      accessSummary: { grants: [], events: [] },
    });
    expect(repositories.media.findPortfolioPhotos).not.toHaveBeenCalled();
  });

  it("loads and validates the complete dashboard projection", async () => {
    const result = await loadDashboardView({ supabase: {} as never, userId: "owner-1" });

    expect(result).toMatchObject({
      portfolio: { id: "portfolio-1", privacy_mode: "balanced" },
      viewCount: 7,
      mediaUrls: { "media-1": "https://signed.test/media-1" },
      horoscope: { id: "horoscope-1" },
      interests: [{ id: "interest-1", metadata: { city: "Boston" } }],
    });
    expect(repositories.interest.listForPortfolio).toHaveBeenCalledWith("portfolio-1");
    expect(repositories.mediaUrls).toHaveBeenCalledWith(expect.objectContaining({ media: [{ id: "media-1" }] }));
  });

  it("normalizes nullable child results and valid published data", async () => {
    repositories.dashboard.findDashboardPortfolioForUser.mockResolvedValue({
      data: {
        ...row,
        published_data: row.draft_data,
      },
      error: null,
    });
    repositories.dashboard.countPortfolioViews.mockResolvedValue({ count: null, error: null });
    repositories.media.findPortfolioPhotos.mockResolvedValue({ data: null, error: null });
    repositories.horoscope.findByPortfolio.mockResolvedValue({ data: null, error: null });
    repositories.interest.listForPortfolio.mockResolvedValue({
      data: [{ id: "interest-1", metadata: "legacy-value" }],
      error: null,
    });
    repositories.mediaUrls.mockResolvedValue({});

    await expect(loadDashboardView({ supabase: {} as never, userId: "owner-1" }))
      .resolves.toMatchObject({
        portfolio: { published_data: row.draft_data },
        viewCount: 0,
        media: [],
        mediaUrls: {},
        horoscope: null,
        interests: [{ id: "interest-1", metadata: null }],
      });
    expect(repositories.mediaUrls).toHaveBeenCalledWith(expect.objectContaining({ media: [] }));
  });

  it("falls back safely for malformed persisted JSON and non-object metadata", () => {
    expect(mapDashboardPortfolio({
      ...row,
      draft_data: "invalid",
      published_data: "invalid",
      privacy_mode: "unknown",
      visibility_settings: [],
    } as never)).toMatchObject({
      draft_data: { personal: {} },
      published_data: null,
      privacy_mode: "balanced",
      visibility_settings: {},
    });
    expect(mapDashboardPortfolio(null)).toBeNull();
  });
});
