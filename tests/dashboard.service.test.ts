import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

const repository = vi.hoisted(() => ({
  findPortfolioForUser: vi.fn(),
  savePortfolio: vi.fn(),
  saveCandidate: vi.fn(),
  linkCandidate: vi.fn(),
  saveCandidateDetails: vi.fn(),
  saveVisibilityRules: vi.fn(),
  replaceFamilyMembers: vi.fn(),
  replaceEducationAndCareer: vi.fn(),
}));

vi.mock("../src/features/portfolio/server/dashboard.repository", () => ({
  DashboardRepository: class {
    constructor() {
      return repository;
    }
  },
}));

import {
  DashboardSaveError,
  saveDashboardDraft,
} from "../src/features/portfolio/server/dashboard.service";

const baseDraft: PortfolioData = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
};

function mockSuccessfulWrites() {
  repository.findPortfolioForUser.mockResolvedValue({
    data: { id: "portfolio-id", candidate_id: null, theme_color: null },
    error: null,
  });
  repository.savePortfolio.mockResolvedValue({
    data: { id: "portfolio-id", candidate_id: null },
    error: null,
  });
  repository.saveCandidate.mockResolvedValue({ candidateId: "candidate-id", error: null });
  repository.linkCandidate.mockResolvedValue({ error: null });
  repository.saveCandidateDetails.mockResolvedValue([{ error: null }]);
  repository.saveVisibilityRules.mockResolvedValue({ error: null });
  repository.replaceFamilyMembers.mockResolvedValue({ error: null });
  repository.replaceEducationAndCareer.mockResolvedValue({ error: null });
}

describe("saveDashboardDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulWrites();
  });

  it("saves a populated draft and synchronizes the related records", async () => {
    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft })
    ).resolves.toEqual({ portfolioId: "portfolio-id", candidateId: "candidate-id" });

    expect(repository.saveCandidate).toHaveBeenCalledOnce();
    expect(repository.linkCandidate).toHaveBeenCalledWith("portfolio-id", "candidate-id");
    expect(repository.saveCandidateDetails).toHaveBeenCalledOnce();
    expect(repository.replaceEducationAndCareer).toHaveBeenCalledOnce();
  });

  it("creates an empty portfolio draft without a candidate record", async () => {
    const emptyDraft = { ...baseDraft, personal: { ...baseDraft.personal, name: "" } };
    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: emptyDraft })
    ).resolves.toEqual({ portfolioId: "portfolio-id", candidateId: null });
    expect(repository.saveCandidate).not.toHaveBeenCalled();
  });

  it("updates an existing candidate without relinking it", async () => {
    repository.findPortfolioForUser.mockResolvedValue({
      data: { id: "portfolio-id", candidate_id: "candidate-id", theme_color: null },
      error: null,
    });
    repository.savePortfolio.mockResolvedValue({
      data: { id: "portfolio-id", candidate_id: "candidate-id" },
      error: null,
    });
    repository.saveCandidate.mockResolvedValue({ candidateId: "candidate-id", error: null });

    await saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft });
    expect(repository.linkCandidate).not.toHaveBeenCalled();
  });

  it.each([
    ["cannot find the portfolio", "findPortfolioForUser", { data: null, error: new Error("db") }],
    ["cannot save the portfolio", "savePortfolio", { data: null, error: new Error("db") }],
    ["cannot save the candidate", "saveCandidate", { candidateId: null, error: new Error("db") }],
  ])("returns a safe error when it %s", async (_label, method, result) => {
    repository[method as keyof typeof repository].mockResolvedValue(result as never);
    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft })
    ).rejects.toBeInstanceOf(DashboardSaveError);
  });

  it("fails when detail or history writes cannot be persisted", async () => {
    repository.saveCandidateDetails.mockResolvedValue([{ error: new Error("db") }]);
    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft })
    ).rejects.toThrow("Could not save portfolio details");

    mockSuccessfulWrites();
    repository.replaceEducationAndCareer.mockResolvedValue({ error: new Error("db") });
    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft })
    ).rejects.toThrow("Could not save portfolio history");
  });
});
