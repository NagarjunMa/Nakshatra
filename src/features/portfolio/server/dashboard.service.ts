import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioData } from "@/types/portfolio";
import {
  mapCandidate,
  mapCandidateDetails,
  mapCareerEntry,
  mapEducationEntry,
  mapFamilyMembers,
  mapPortfolioDraft,
  mapVisibilityRules,
} from "./dashboard.mapper";
import { DashboardRepository } from "./dashboard.repository";

export class DashboardSaveError extends Error {}

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
  const { data: existing, error: findError } = await repository.findPortfolioForUser(userId);
  if (findError) throw new DashboardSaveError("Could not load your portfolio");

  const { data: portfolio, error: portfolioError } = await repository.savePortfolio(
    userId,
    existing?.id,
    mapPortfolioDraft(data, existing?.theme_color ?? null)
  );
  if (portfolioError || !portfolio) {
    throw new DashboardSaveError("Could not save portfolio");
  }

  if (!data.personal.name?.trim()) {
    return { portfolioId: portfolio.id, candidateId: null };
  }

  const { candidateId, error: candidateError } = await repository.saveCandidate(
    portfolio.candidate_id,
    mapCandidate(data, userId)
  );
  if (candidateError || !candidateId) {
    throw new DashboardSaveError("Could not save candidate details");
  }

  if (!portfolio.candidate_id) {
    const { error: linkError } = await repository.linkCandidate(portfolio.id, candidateId);
    if (linkError) throw new DashboardSaveError("Could not link candidate details");
  }

  const [detailWrites, visibilityWrite] = await Promise.all([
    repository.saveCandidateDetails(candidateId, mapCandidateDetails(data)),
    repository.saveVisibilityRules(mapVisibilityRules(portfolio.id, data)),
  ]);
  const detailError = detailWrites.find(({ error }) => error)?.error;
  if (detailError || visibilityWrite.error) {
    throw new DashboardSaveError("Could not save portfolio details");
  }

  const [familyWrite, timelineWrite] = await Promise.all([
    repository.replaceFamilyMembers(candidateId, mapFamilyMembers(data)),
    repository.replaceEducationAndCareer(
      candidateId,
      mapEducationEntry(data),
      mapCareerEntry(data)
    ),
  ]);
  if (familyWrite.error || timelineWrite.error) {
    throw new DashboardSaveError("Could not save portfolio history");
  }

  return { portfolioId: portfolio.id, candidateId };
}
