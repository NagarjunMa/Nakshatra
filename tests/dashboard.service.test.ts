import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

const repository = vi.hoisted(() => ({
  saveDashboardDraftTransaction: vi.fn(),
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

describe("saveDashboardDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.saveDashboardDraftTransaction.mockResolvedValue({
      data: {
        status: "saved",
        portfolioId: "portfolio-id",
        candidateId: "candidate-id",
      },
      error: null,
    });
  });

  it("sends the complete populated draft graph through one transaction", async () => {
    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft })
    ).resolves.toEqual({ portfolioId: "portfolio-id", candidateId: "candidate-id" });

    expect(repository.saveDashboardDraftTransaction).toHaveBeenCalledOnce();
    expect(repository.saveDashboardDraftTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio: expect.objectContaining({ draft_data: expect.any(Object) }),
        candidate: expect.objectContaining({
          display_name: "Aditi Rao",
          primary_owner_user_id: "user-id",
        }),
        details: expect.objectContaining({
          personal: expect.any(Object),
          astrology: expect.any(Object),
          lifestyle: expect.any(Object),
          preferences: expect.any(Object),
        }),
        visibilityRules: expect.arrayContaining([
          expect.objectContaining({ section_key: "family" }),
        ]),
      })
    );
  });

  it("saves an empty first step without creating candidate projections", async () => {
    repository.saveDashboardDraftTransaction.mockResolvedValue({
      data: { status: "saved", portfolioId: "portfolio-id", candidateId: null },
      error: null,
    });
    const emptyDraft = { ...baseDraft, personal: { ...baseDraft.personal, name: "" } };

    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: emptyDraft })
    ).resolves.toEqual({ portfolioId: "portfolio-id", candidateId: null });

    expect(repository.saveDashboardDraftTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: null,
        details: null,
        visibilityRules: [],
        familyMembers: [],
        education: null,
        career: null,
      })
    );
  });

  it.each([
    [{ data: null, error: new Error("db") }],
    [{ data: { status: "unexpected" }, error: null }],
    [{ data: { status: "saved", portfolioId: 42, candidateId: null }, error: null }],
    [{ data: { status: "saved", portfolioId: "portfolio-id" }, error: null }],
    [{ data: "saved", error: null }],
    [{ data: null, error: null }],
  ])("returns a safe error when the transaction does not confirm a save", async (result) => {
    repository.saveDashboardDraftTransaction.mockResolvedValue(result);

    await expect(
      saveDashboardDraft({ supabase: {} as never, userId: "user-id", data: baseDraft })
    ).rejects.toBeInstanceOf(DashboardSaveError);
  });
});
