import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioData } from "@/types/portfolio";
import {
  mapCandidate,
  mapCandidateDetails,
  mapCareerEntry,
  mapDashboardVisibilityRules,
  mapEducationEntry,
  mapFamilyMembers,
  mapPortfolioDraft,
} from "./dashboard.mapper";
import { DashboardRepository } from "./dashboard.repository";

export type DashboardSaveErrorCode =
  | "DASHBOARD_DATABASE_UPDATE_REQUIRED"
  | "DASHBOARD_DATA_REJECTED"
  | "DASHBOARD_SAVE_FAILED";

export class DashboardSaveError extends Error {
  constructor(
    message: string,
    readonly code: DashboardSaveErrorCode = "DASHBOARD_SAVE_FAILED",
    readonly status = 500
  ) {
    super(message);
  }
}

function databaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function savedDraftResult(value: unknown): value is {
  status: "saved";
  portfolioId: string;
  candidateId: string | null;
} {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    result.status === "saved" &&
    typeof result.portfolioId === "string" &&
    (typeof result.candidateId === "string" || result.candidateId === null)
  );
}

/**
 * Saves a dashboard draft and synchronizes its candidate-owned relational records.
 * Input: authenticated Supabase client, owner ID, and validated draft. Output: portfolio and optional candidate IDs.
 */
export async function saveDashboardDraft({
  supabase,
  userId,
  data,
}: {
  supabase: SupabaseClient;
  userId: string;
  data: PortfolioData;
}) {
  const repository = new DashboardRepository(supabase);
  const hasCandidate = Boolean(data.personal.name?.trim());
  const { data: result, error } = await repository.saveDashboardDraftTransaction({
    portfolio: mapPortfolioDraft(data, null),
    candidate: hasCandidate ? mapCandidate(data, userId) : null,
    details: hasCandidate ? mapCandidateDetails(data) : null,
    visibilityRules: hasCandidate ? mapDashboardVisibilityRules(data) : [],
    familyMembers: hasCandidate ? mapFamilyMembers(data) : [],
    education: hasCandidate ? mapEducationEntry(data) : null,
    career: hasCandidate ? mapCareerEntry(data) : null,
  });

  if (error) {
    const code = databaseErrorCode(error);
    if (["PGRST202", "PGRST203", "PGRST204", "42703", "42883"].includes(code || "")) {
      throw new DashboardSaveError(
        "Portfolio saving is temporarily unavailable because the latest database update has not been applied.",
        "DASHBOARD_DATABASE_UPDATE_REQUIRED",
        503
      );
    }
    if (code === "22023") {
      throw new DashboardSaveError(
        "Some portfolio details could not be saved. Review the fields in this section and try again.",
        "DASHBOARD_DATA_REJECTED",
        400
      );
    }
    throw new DashboardSaveError(
      "We could not save your portfolio right now. Please try again.",
      "DASHBOARD_SAVE_FAILED",
      500
    );
  }

  if (!savedDraftResult(result)) {
    throw new DashboardSaveError(
      "We could not confirm that your portfolio was saved. Please try again."
    );
  }

  return { portfolioId: result.portfolioId, candidateId: result.candidateId };
}
