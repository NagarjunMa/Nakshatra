import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

const repository = vi.hoisted(() => ({
  findPortfolioForUser: vi.fn(),
  publishPortfolio: vi.fn(),
  savePublicSnapshot: vi.fn(),
  saveApprovedSnapshot: vi.fn(),
  findPublicHeroPhoto: vi.fn(),
  updatePublicSnapshot: vi.fn(),
  renewPortfolioLink: vi.fn(),
}));
const ensurePortfolioPhotoPreviews = vi.hoisted(() => vi.fn());
const publishHoroscope = vi.hoisted(() => vi.fn());

vi.mock("../src/features/portfolio/server/dashboard.repository", () => ({
  DashboardRepository: class {
    constructor() {
      return repository;
    }
  },
}));

vi.mock("../src/features/media/server/media.service", () => ({
  ensurePortfolioPhotoPreviews,
}));

vi.mock("../src/features/horoscope/server/horoscope.service", () => ({
  publishHoroscope,
}));

import {
  PortfolioPublishError,
  publishPortfolio,
} from "../src/features/portfolio/server/publish.service";
import {
  PortfolioRenewalError,
  renewPortfolioLink,
} from "../src/features/portfolio/server/renew.service";

const draft: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    dob: "1996-08-12",
    gender: "female",
    place_of_birth: "Bengaluru",
    current_location: "Boston",
    immigration_status: "H1B",
    profile_summary: "A thoughtful introduction.",
  },
  vitals: { height: `5'5"`, gotra: "Kashyap" },
  education: { degree: "MS", institution: "Northeastern" },
  career: { title: "Engineer", company: "Nakshatra", location: "Boston" },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    pada: "2",
    time_of_birth: "09:15",
    lagnam: "Mithuna",
    maternal_gotra: "Bharadwaj",
  },
  family: {
    father: { name: "Rao", occupation: "Engineer" },
    mother: { name: "Lakshmi", occupation: "Teacher" },
    paternal_origin: "Mysuru",
    maternal_origin: "Bengaluru",
    sibling_count: 0,
  },
  lifestyle: { languages: "English, Telugu" },
  preferences: { narrative: "A kind and curious partnership." },
  contact: { contacts: [{ name: "Rao", phone: "+91 90000 00000" }] },
  style: { template_name: "Royal Heritage", appearance: "light" },
};

describe("portfolio lifecycle services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensurePortfolioPhotoPreviews.mockResolvedValue(undefined);
    publishHoroscope.mockResolvedValue(undefined);
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolio.mockResolvedValue({ error: null });
    repository.savePublicSnapshot.mockResolvedValue({ error: null });
    repository.saveApprovedSnapshot.mockResolvedValue({ error: null });
    repository.findPublicHeroPhoto.mockResolvedValue({ data: { id: "hero-photo-id" }, error: null });
    repository.updatePublicSnapshot.mockResolvedValue({ error: null });
    repository.renewPortfolioLink.mockResolvedValue({ error: null });
  });

  it("publishes a saved draft with a share token, expiry, and safe snapshot", async () => {
    const result = await publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft });
    expect(repository.publishPortfolio).toHaveBeenCalledWith(
      "user-id",
      expect.objectContaining({
        is_published: true,
        share_token: expect.stringMatching(/^.{21}$/),
        template_id: 1,
        theme_color: "#f7f5ef",
        draft_data: expect.objectContaining({
          style: expect.objectContaining({ template_name: "Nakshatra Portfolio" }),
        }),
      })
    );
    expect(repository.savePublicSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio_id: "portfolio-id",
        share_token: expect.stringMatching(/^.{21}$/),
        data: expect.not.objectContaining({ family: expect.anything(), contact: expect.anything() }),
        is_active: true,
      })
    );
    expect(repository.saveApprovedSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio_id: "portfolio-id",
        data: expect.objectContaining({
          family: expect.objectContaining({
            father: expect.objectContaining({ name: "Rao" }),
          }),
          astrology: expect.objectContaining({ maternal_gotra: "Bharadwaj" }),
        }),
      })
    );
    expect(result).toMatchObject({ action: "created", shareUrl: expect.stringContaining("/p/") });
    expect(publishHoroscope).toHaveBeenCalledWith(expect.objectContaining({ portfolioId: "portfolio-id" }));
  });

  it("normalizes legacy template labels to the Nakshatra portfolio", async () => {
    await publishPortfolio({
      supabase: {} as never,
      userId: "user-id",
      data: { ...draft, style: { ...draft.style, template_name: "Celestial Union" } },
    });
    expect(repository.publishPortfolio.mock.calls[0][1]).toMatchObject({ template_id: 1 });

    vi.clearAllMocks();
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolio.mockResolvedValue({ error: null });
    await publishPortfolio({
      supabase: {} as never,
      userId: "user-id",
      data: { ...draft, style: { ...draft.style, template_name: "Editorial Matrimonial" } },
    });
    expect(repository.publishPortfolio.mock.calls[0][1]).toMatchObject({
      template_id: 1,
      draft_data: expect.objectContaining({
        style: expect.objectContaining({ template_name: "Nakshatra Portfolio" }),
      }),
    });
  });

  it("does not rotate the share token for a published portfolio", async () => {
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: true, share_token: "stable-token", expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    await publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft });
    expect(repository.publishPortfolio.mock.calls[0][1]).not.toHaveProperty("share_token");
  });

  it("returns safe errors for missing drafts and persistence failures", async () => {
    repository.findPortfolioForUser.mockResolvedValue({ data: null, error: null });
    await expect(
      publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft })
    ).rejects.toBeInstanceOf(PortfolioPublishError);

    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolio.mockResolvedValue({ error: new Error("db") });
    await expect(
      publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft })
    ).rejects.toBeInstanceOf(PortfolioPublishError);
  });

  it("renews for 90 days and returns a safe error on failure", async () => {
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: true, share_token: "stable-token", expires_at: "2000-01-01T00:00:00.000Z" },
      error: null,
    });
    const before = Date.now();
    await renewPortfolioLink({ supabase: {} as never, userId: "user-id" });
    const expiresAt = new Date(repository.renewPortfolioLink.mock.calls[0][1]).getTime();
    expect(expiresAt).toBeGreaterThan(before + 89 * 86_400_000);
    expect(repository.updatePublicSnapshot).toHaveBeenCalledWith(
      "portfolio-id",
      expect.objectContaining({ is_active: true })
    );

    repository.renewPortfolioLink.mockResolvedValue({ error: new Error("db") });
    await expect(
      renewPortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);
  });

  it("rejects renewals for unpublished portfolios and snapshot synchronization failures", async () => {
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    await expect(
      renewPortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);

    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: true, share_token: "stable-token", expires_at: null },
      error: null,
    });
    repository.renewPortfolioLink.mockResolvedValue({ error: null });
    repository.updatePublicSnapshot.mockResolvedValue({ error: new Error("db") });
    await expect(
      renewPortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);
  });
});
