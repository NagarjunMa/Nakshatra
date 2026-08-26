import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

const repository = vi.hoisted(() => ({
  findPortfolioForUser: vi.fn(),
  publishPortfolioTransaction: vi.fn(),
  findPublicHeroPhoto: vi.fn(),
  renewPortfolioTransaction: vi.fn(),
}));
const ensurePortfolioPhotoPreviews = vi.hoisted(() => vi.fn());

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
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolioTransaction.mockResolvedValue({
      data: {
        status: "ok",
        action: "created",
        shareToken: "123456789012345678901",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      error: null,
    });
    repository.findPublicHeroPhoto.mockResolvedValue({ data: { id: "hero-photo-id" }, error: null });
    repository.renewPortfolioTransaction.mockResolvedValue({
      data: { status: "renewed", expiresAt: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
  });

  it("publishes a saved draft with a share token, expiry, and safe snapshot", async () => {
    const result = await publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft });
    expect(repository.publishPortfolioTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioId: "portfolio-id",
        shareToken: expect.stringMatching(/^.{21}$/),
        templateId: 1,
        themeColor: "#f7f5ef",
        draftData: expect.objectContaining({
          style: expect.objectContaining({ template_name: "Nakshatra Portfolio" }),
        }),
        publicData: expect.not.objectContaining({ family: expect.anything(), contact: expect.anything() }),
        approvedData: expect.objectContaining({
          family: expect.objectContaining({
            father: expect.objectContaining({ name: "Rao" }),
          }),
          astrology: expect.objectContaining({ maternal_gotra: "Bharadwaj" }),
        }),
      })
    );
    expect(result).toMatchObject({ action: "created", shareUrl: expect.stringContaining("/p/") });
  });

  it("normalizes legacy template labels to the Nakshatra portfolio", async () => {
    await publishPortfolio({
      supabase: {} as never,
      userId: "user-id",
      data: { ...draft, style: { ...draft.style, template_name: "Celestial Union" } },
    });
    expect(repository.publishPortfolioTransaction.mock.calls[0][0]).toMatchObject({ templateId: 1 });

    vi.clearAllMocks();
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolioTransaction.mockResolvedValue({
      data: { status: "ok", action: "created", shareToken: "123456789012345678901", expiresAt: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    await publishPortfolio({
      supabase: {} as never,
      userId: "user-id",
      data: { ...draft, style: { ...draft.style, template_name: "Editorial Matrimonial" } },
    });
    expect(repository.publishPortfolioTransaction.mock.calls[0][0]).toMatchObject({
      templateId: 1,
      draftData: expect.objectContaining({
        style: expect.objectContaining({ template_name: "Nakshatra Portfolio" }),
      }),
    });
  });

  it("does not rotate the share token for a published portfolio", async () => {
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: true, share_token: "123456789012345678901", expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    await publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft });
    expect(repository.publishPortfolioTransaction.mock.calls[0][0]).toMatchObject({
      shareToken: "123456789012345678901",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
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
    repository.publishPortfolioTransaction.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft })
    ).rejects.toBeInstanceOf(PortfolioPublishError);
  });

  it("renews for 90 days and returns a safe error on failure", async () => {
    const before = Date.now();
    await renewPortfolioLink({ supabase: {} as never });
    const expiresAt = new Date(repository.renewPortfolioTransaction.mock.calls[0][0]).getTime();
    expect(expiresAt).toBeGreaterThan(before + 89 * 86_400_000);

    repository.renewPortfolioTransaction.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      renewPortfolioLink({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);
  });

  it("rejects renewals for unpublished portfolios and snapshot synchronization failures", async () => {
    repository.renewPortfolioTransaction.mockResolvedValue({ data: { status: "not_published" }, error: null });
    await expect(
      renewPortfolioLink({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);

    repository.renewPortfolioTransaction.mockResolvedValue({ data: {}, error: null });
    await expect(
      renewPortfolioLink({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);
  });
});
