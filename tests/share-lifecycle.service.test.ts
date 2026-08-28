import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  rotatePortfolioTransaction: vi.fn(),
  unpublishPortfolioTransaction: vi.fn(),
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
    repository.rotatePortfolioTransaction.mockImplementation((shareToken: string) => Promise.resolve({
      data: { status: "rotated", shareToken },
      error: null,
    }));
    repository.unpublishPortfolioTransaction.mockResolvedValue({ data: { status: "unpublished" }, error: null });
  });

  it("replaces a published link with a high-entropy canonical token", async () => {
    const result = await rotatePortfolioLink({ supabase: {} as never });

    expect(result.shareToken).toMatch(/^.{21}$/);
    expect(result.shareUrl).toContain(`/p/${result.shareToken}`);
    expect(repository.rotatePortfolioTransaction).toHaveBeenCalledWith(result.shareToken);
  });

  it("disables the owner portfolio and its public snapshot without deleting private content", async () => {
    await unpublishPortfolio({ supabase: {} as never });
    expect(repository.unpublishPortfolioTransaction).toHaveBeenCalledOnce();
  });

  it("returns safe errors when lifecycle persistence fails", async () => {
    repository.rotatePortfolioTransaction.mockResolvedValue({ data: { status: "not_published" }, error: null });
    await expect(
      rotatePortfolioLink({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);

    repository.unpublishPortfolioTransaction.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      unpublishPortfolio({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);
  });

  it("rejects failed token and snapshot writes without exposing implementation details", async () => {
    repository.rotatePortfolioTransaction.mockResolvedValue({ data: null, error: new Error("db") });
    await expect(
      rotatePortfolioLink({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);

    repository.rotatePortfolioTransaction.mockResolvedValue({ data: {}, error: null });
    await expect(
      rotatePortfolioLink({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);

    repository.unpublishPortfolioTransaction.mockResolvedValue({ data: {}, error: null });
    await expect(
      unpublishPortfolio({ supabase: {} as never })
    ).rejects.toBeInstanceOf(PortfolioShareLifecycleError);
  });
});
