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

export class DashboardSaveError extends Error {}

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

  if (error || !savedDraftResult(result)) {
    throw new DashboardSaveError("Could not save portfolio");
  }

  return { portfolioId: result.portfolioId, candidateId: result.candidateId };
}
