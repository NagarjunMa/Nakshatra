import { describe, expect, it, vi } from "vitest";
import { PortfolioMediaRepository } from "../src/features/media/server/media.repository";
import { DashboardRepository } from "../src/features/portfolio/server/dashboard.repository";

type QueryResult = { data?: unknown; error: unknown; count?: number };

function query(result: QueryResult = { data: { id: "row" }, error: null }) {
  const value: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "in", "insert", "update", "upsert", "delete"]) {
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
    const from = vi.fn(() => q);
    const supabase = { from, storage: { from: vi.fn(() => ({ upload, remove, download })) } } as never;
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
    await repository.demoteOtherHeroPhotos("portfolio", "media");
    await repository.deleteMedia("media");

    expect(from).toHaveBeenCalledWith("portfolios");
    expect(from).toHaveBeenCalledWith("portfolio_media");
    expect(upload).toHaveBeenCalledWith("path.webp", expect.any(Buffer), { contentType: "image/webp" });
    expect(remove).toHaveBeenCalledWith(["path.webp"]);
    expect(download).toHaveBeenCalledWith("path.webp");
    expect(q.in).toHaveBeenCalledWith("media_type", ["hero", "gallery"]);
  });
});

describe("DashboardRepository", () => {
  it("builds portfolio and snapshot persistence operations", async () => {
    const q = query({ data: { id: "portfolio" }, error: null });
    const supabase = { from: vi.fn(() => q) } as never;
    const repository = new DashboardRepository(supabase);

    await repository.findPortfolioForUser("owner");
    await repository.savePortfolio("owner", undefined, { draft_data: {} });
    await repository.savePortfolio("owner", "portfolio", { draft_data: {} });
    await repository.publishPortfolio("owner", { is_published: true });
    await repository.savePublicSnapshot({ portfolio_id: "portfolio" });
    await repository.findPublicHeroPhoto("portfolio");
    await repository.updatePublicSnapshot("portfolio", { is_active: false });
    await repository.unpublishPortfolio("owner");
    await repository.renewPortfolioLink("owner", "2099-01-01");
    await repository.linkCandidate("portfolio", "candidate");
    await repository.saveCandidateDetails("candidate", {
      personal: {}, astrology: {}, lifestyle: {}, preferences: {},
    });
    await repository.saveVisibilityRules([{ portfolio_id: "portfolio" }]);

    expect(q.insert).toHaveBeenCalled();
    expect(q.update).toHaveBeenCalled();
    expect(q.upsert).toHaveBeenCalled();
  });

  it("creates and updates candidate records", async () => {
    const q = query({ data: { id: "new-candidate" }, error: null });
    const repository = new DashboardRepository({ from: vi.fn(() => q) } as never);

    await expect(repository.saveCandidate(null, { display_name: "Aditi" })).resolves.toEqual({ candidateId: "new-candidate", error: null });
    await expect(repository.saveCandidate("existing", { display_name: "Aditi" })).resolves.toEqual({ candidateId: "existing", error: null });
  });

  it("replaces family, education, and career rows including empty and failed deletes", async () => {
    const ok = query({ data: null, error: null });
    const repository = new DashboardRepository({ from: vi.fn(() => ok) } as never);
    await expect(repository.replaceFamilyMembers("candidate", [])).resolves.toEqual({ error: null });
    await repository.replaceFamilyMembers("candidate", [{ relationship: "father", name: "Rao" }]);
    await expect(repository.replaceEducationAndCareer("candidate", null, null)).resolves.toEqual({ error: null });
    await repository.replaceEducationAndCareer("candidate", { degree: "MS" }, { title: "Engineer" });
    expect(ok.delete).toHaveBeenCalled();
    expect(ok.insert).toHaveBeenCalled();

    const failed = query({ data: null, error: new Error("delete failed") });
    const failingRepository = new DashboardRepository({ from: vi.fn(() => failed) } as never);
    await expect(failingRepository.replaceFamilyMembers("candidate", [{ relationship: "father" }])).resolves.toMatchObject({ error: expect.any(Error) });
    await expect(failingRepository.replaceEducationAndCareer("candidate", null, null)).resolves.toMatchObject({ error: expect.any(Error) });
  });
});
