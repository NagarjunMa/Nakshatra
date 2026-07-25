import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

const repository = vi.hoisted(() => ({
  findPortfolioForUser: vi.fn(),
  publishPortfolio: vi.fn(),
  savePublicSnapshot: vi.fn(),
  renewPortfolioLink: vi.fn(),
}));

vi.mock("../src/features/portfolio/server/dashboard.repository", () => ({
  DashboardRepository: class {
    constructor() {
      return repository;
    }
  },
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
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
  style: { template_name: "Royal Heritage" },
};

describe("portfolio lifecycle services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolio.mockResolvedValue({ error: null });
    repository.savePublicSnapshot.mockResolvedValue({ error: null });
    repository.renewPortfolioLink.mockResolvedValue({ error: null });
  });

  it("publishes a saved draft with a share token and expiry", async () => {
    await publishPortfolio({ supabase: {} as never, userId: "user-id", data: draft });
    expect(repository.publishPortfolio).toHaveBeenCalledWith(
      "user-id",
      expect.objectContaining({
        is_published: true,
        share_token: expect.any(String),
        template_id: 3,
      })
    );
    expect(repository.savePublicSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio_id: "portfolio-id",
        share_token: expect.any(String),
        data: expect.not.objectContaining({ family: expect.anything(), contact: expect.anything() }),
      })
    );
  });

  it("persists the chosen supported template ID", async () => {
    await publishPortfolio({
      supabase: {} as never,
      userId: "user-id",
      data: { ...draft, style: { template_name: "Celestial Union" } },
    });
    expect(repository.publishPortfolio.mock.calls[0][1]).toMatchObject({ template_id: 2 });

    vi.clearAllMocks();
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: false, share_token: null, expires_at: null },
      error: null,
    });
    repository.publishPortfolio.mockResolvedValue({ error: null });
    await publishPortfolio({
      supabase: {} as never,
      userId: "user-id",
      data: { ...draft, style: { template_name: "Editorial Matrimonial" } },
    });
    expect(repository.publishPortfolio.mock.calls[0][1]).toMatchObject({ template_id: 1 });
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
    const before = Date.now();
    await renewPortfolioLink({ supabase: {} as never, userId: "user-id" });
    const expiresAt = new Date(repository.renewPortfolioLink.mock.calls[0][1]).getTime();
    expect(expiresAt).toBeGreaterThan(before + 89 * 86_400_000);

    repository.renewPortfolioLink.mockResolvedValue({ error: new Error("db") });
    await expect(
      renewPortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioRenewalError);
  });
});
