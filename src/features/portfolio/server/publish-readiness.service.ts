import "server-only";

import type { PortfolioData } from "@/types/portfolio";

export class PortfolioPublishReadinessError extends Error {}

/**
 * Validates the minimum content required for a public portfolio generation.
 * Input: validated portfolio data and whether the owner has an explicitly public hero photo.
 * Output: resolves when ready or throws a user-safe readiness error.
 */
export function requirePortfolioPublishReadiness({
  data,
  hasPublicHeroPhoto,
}: {
  data: PortfolioData;
  hasPublicHeroPhoto: boolean;
}) {
  if (!data.personal.name || !data.personal.dob || !data.personal.gender) {
    throw new PortfolioPublishReadinessError(
      "Add your name, date of birth, and gender before generating your portfolio"
    );
  }

  if (!data.astrology?.rashi) {
    throw new PortfolioPublishReadinessError(
      "Choose your rashi before generating your portfolio"
    );
  }

  if (!data.style?.theme_color && !data.style?.rashi_palette) {
    throw new PortfolioPublishReadinessError(
      "Choose a rashi colour theme before generating your portfolio"
    );
  }

  if (!hasPublicHeroPhoto) {
    throw new PortfolioPublishReadinessError(
      "Choose one profile photo as your public hero photo before generating your portfolio"
    );
  }
}
