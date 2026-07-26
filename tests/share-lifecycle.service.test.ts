import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findPortfolioForUser: vi.fn(),
  publishPortfolio: vi.fn(),
  updatePublicSnapshot: vi.fn(),
  unpublishPortfolio: vi.fn(),
}));

vi.mock("../src/features/portfolio/server/dashboard.repository", () => ({
  DashboardRepository: class {
    constructor() {
      return repository;
    }
  },
}));

import {
  PortfolioShareLifecycleError,
  rotatePortfolioLink,
  unpublishPortfolio,
} from "../src/features/portfolio/server/share-lifecycle.service";

describe("portfolio share lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", is_published: true, share_token: "legacy-token", expires_at: null },
      error: null,
    });
    repository.publishPortfolio.mockResolvedValue({ error: null });
    repository.updatePublicSnapshot.mockResolvedValue({ error: null });
    repository.unpublishPortfolio.mockResolvedValue({ data: { id: "portfolio-id" }, error: null });
  });

  it("replaces a published link with a high-entropy canonical token", async () => {
    const result = await rotatePortfolioLink({ supabase: {} as never, userId: "user-id" });

    expect(result.shareToken).toMatch(/^.{21}$/);
    expect(result.shareUrl).toContain(`/p/${result.shareToken}`);
    expect(repository.publishPortfolio).toHaveBeenCalledWith(
      "user-id",
      expect.objectContaining({ share_token: result.shareToken })
    );
    expect(repository.updatePublicSnapshot).toHaveBeenCalledWith(
      "portfolio-id",
      expect.objectContaining({ share_token: result.shareToken, is_active: true })
    );
  });

  it("disables the owner portfolio and its public snapshot without deleting private content", async () => {
    await unpublishPortfolio({ supabase: {} as never, userId: "user-id" });
    expect(repository.unpublishPortfolio).toHaveBeenCalledWith("user-id");
    expect(repository.updatePublicSnapshot).toHaveBeenCalledWith("portfolio-id", { is_active: false });
  });

  it("returns safe errors when lifecycle persistence fails", async () => {
    repository.findPortfolioForUser.mockResolvedValue({ data: null, error: null });
    await expect(
      rotatePortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);

    repository.unpublishPortfolio.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      unpublishPortfolio({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);
  });

  it("rejects failed token and snapshot writes without exposing implementation details", async () => {
    repository.publishPortfolio.mockResolvedValue({ error: new Error("db") });
    await expect(
      rotatePortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);

    repository.publishPortfolio.mockResolvedValue({ error: null });
    repository.updatePublicSnapshot.mockResolvedValue({ error: new Error("db") });
    await expect(
      rotatePortfolioLink({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);

    repository.unpublishPortfolio.mockResolvedValue({ data: { id: "portfolio-id" }, error: null });
    await expect(
      unpublishPortfolio({ supabase: {} as never, userId: "user-id" })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);
  });
});
