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
  const missing: string[] = [];
  const requireValue = (value: unknown, label: string) => {
    if (typeof value === "string" ? !value.trim() : value === undefined || value === null) {
      missing.push(label);
    }
  };

  requireValue(data.personal.name, "full name");
  requireValue(data.personal.dob, "date of birth");
  requireValue(data.personal.gender, "gender");
  requireValue(data.personal.current_location, "current location");
  requireValue(data.career?.title, "profession or role");
  if (!data.personal.short_bio?.trim() && !data.personal.profile_summary?.trim()) {
    missing.push("short introduction");
  }

  if (missing.length) {
    const firstItems = missing.slice(0, 4).join(", ");
    const remainder = missing.length > 4 ? ` and ${missing.length - 4} more` : "";
    throw new PortfolioPublishReadinessError(
      `Complete these required details before generating: ${firstItems}${remainder}`
    );
  }

  if (!hasPublicHeroPhoto) {
    throw new PortfolioPublishReadinessError(
      "Choose one profile photo as your public hero photo before generating your portfolio"
    );
  }
}
