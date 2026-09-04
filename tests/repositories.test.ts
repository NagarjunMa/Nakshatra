import { describe, expect, it, vi } from "vitest";
import { PortfolioMediaRepository } from "../src/features/media/server/media.repository";
import { DashboardRepository } from "../src/features/portfolio/server/dashboard.repository";
import { HoroscopeRepository } from "../src/features/horoscope/server/horoscope.repository";
import { InterestRepository } from "../src/features/interest/server/interest.repository";

type QueryResult = { data?: unknown; error: unknown; count?: number };

function query(result: QueryResult = { data: { id: "row" }, error: null }) {
  const value: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "in", "order", "limit", "insert", "update", "upsert", "delete"]) {
    value[method] = vi.fn(() => value);
  }
  value.single = vi.fn().mockResolvedValue(result);
  value.maybeSingle = vi.fn().mockResolvedValue(result);
  value.then = (resolve: (result: QueryResult) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return value as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<QueryResult>;
}

describe("PortfolioMediaRepository", () => {
  it("builds all database and storage operations", async () => {
    const q = query({ data: { id: "media" }, error: null, count: 2 });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const download = vi.fn().mockResolvedValue({ data: new Blob(), error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.test/photo" }, error: null });
    const from = vi.fn(() => q);
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const supabase = { from, rpc, storage: { from: vi.fn(() => ({ upload, remove, download, createSignedUrl })) } } as never;
    const repository = new PortfolioMediaRepository(supabase);

    await repository.findOwnedPortfolio("portfolio", "owner");
    await repository.countProfilePhotos("portfolio");
    await repository.upload("path.webp", Buffer.from("image"));
    await repository.download("path.webp");
    await repository.remove([]);
    await repository.remove(["path.webp"]);
    await repository.createMedia({ portfolio_id: "portfolio" });
    await repository.updateMedia("media", { visibility: "public" });
    await repository.findMedia("media");
    await repository.findPortfolioPhotos("portfolio");
    await repository.setPrimaryHero("media");
    await repository.deleteMedia("media");
    await repository.createSignedPhotoUrl("path.webp", 3600);

    expect(from).toHaveBeenCalledWith("portfolios");
    expect(from).toHaveBeenCalledWith("portfolio_media");
    expect(upload).toHaveBeenCalledWith("path.webp", expect.any(Buffer), { contentType: "image/webp" });
    expect(remove).toHaveBeenCalledWith(["path.webp"]);
    expect(download).toHaveBeenCalledWith("path.webp");
    expect(createSignedUrl).toHaveBeenCalledWith("path.webp", 3600);
    expect(rpc).toHaveBeenCalledWith("set_portfolio_hero", { p_media_id: "media" });
    expect(q.in).toHaveBeenCalledWith("media_type", ["hero", "gallery"]);
  });
});

describe("DashboardRepository", () => {
  it("builds portfolio and snapshot persistence operations", async () => {
    const q = query({ data: { id: "portfolio" }, error: null });
    const rpc = vi.fn().mockResolvedValue({ data: { status: "ok" }, error: null });
    const supabase = { from: vi.fn(() => q), rpc } as never;
    const repository = new DashboardRepository(supabase);

    await repository.findPortfolioForUser("owner");
    await repository.findDashboardPortfolioForUser("owner");
    await repository.findOwnerPreviewPortfolioForUser("owner");
    await repository.countPortfolioViews("portfolio");
    await repository.saveDashboardDraftTransaction({
      portfolio: { draft_data: {} },
      candidate: null,
      details: null,
      visibilityRules: [],
      familyMembers: [],
      education: null,
      career: null,
    });
    await repository.publishPortfolioTransaction({
      portfolioId: "portfolio",
      draftData: {},
      publicData: {},
      approvedData: {},
      shareToken: "123456789012345678901",
      expiresAt: "2099-01-01",
      templateId: 1,
      themeColor: "#fff",
      sunSign: "kanya",
    });
    await repository.findPublicHeroPhoto("portfolio");
    await repository.renewPortfolioTransaction("2099-01-01");
    await repository.rotatePortfolioTransaction("123456789012345678901");
    await repository.unpublishPortfolioTransaction();

    expect(rpc).toHaveBeenCalledWith("save_dashboard_draft_transaction", {
      p_payload: expect.objectContaining({ portfolio: { draft_data: {} } }),
    });
    expect(rpc).toHaveBeenCalledWith("publish_portfolio_transaction", expect.objectContaining({ p_portfolio_id: "portfolio" }));
    expect(rpc).toHaveBeenCalledWith("renew_portfolio_transaction", { p_expires_at: "2099-01-01" });
  });

});

describe("dashboard read repositories", () => {
  it("builds bounded interest and horoscope owner reads", async () => {
    const q = query({ data: { id: "row" }, error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.test/horoscope" },
      error: null,
    });
    const supabase = {
      from: vi.fn(() => q),
      rpc: vi.fn(),
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as never;

    const interests = new InterestRepository(supabase);
    const horoscopes = new HoroscopeRepository(supabase);
    await interests.listForPortfolio("portfolio", 12);
    await horoscopes.findPortfolioForOwner("owner");
    await horoscopes.findByPortfolio("portfolio");
    await horoscopes.createSignedUrl("owner/chart.webp", 300, "horoscope.webp");

    expect(q.limit).toHaveBeenCalledWith(12);
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(createSignedUrl).toHaveBeenCalledWith(
      "owner/chart.webp",
      300,
      { download: "horoscope.webp" }
    );
  });
});
