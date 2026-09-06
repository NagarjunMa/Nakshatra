import "server-only";

import type { PortfolioData } from "@/types/portfolio";
import { resolvePortfolioNameParts } from "@/features/portfolio/name";

export class PortfolioPublishReadinessError extends Error {}

/**
 * Validates the minimum content required for a public portfolio generation.
 * Input: validated portfolio data and whether the owner has a shareable primary photo.
 * Output: resolves when ready or throws a user-safe readiness error.
 */
export function requirePortfolioPublishReadiness({
  data,
  hasShareablePrimaryPhoto,
}: {
  data: PortfolioData;
  hasShareablePrimaryPhoto: boolean;
}) {
  const missing: string[] = [];
  const requireValue = (value: unknown, label: string) => {
    if (typeof value === "string" ? !value.trim() : value === undefined || value === null) {
      missing.push(label);
    }
  };

  const name = resolvePortfolioNameParts(data.personal);
  requireValue(name.first_name, "first name");
  requireValue(name.last_name, "last name");
  requireValue(data.personal.dob, "date of birth");
  requireValue(data.personal.current_location, "current location");
  requireValue(data.career?.title, "profession or role");
  if (!data.personal.short_bio?.trim() && !data.personal.profile_summary?.trim()) {
    missing.push("short introduction");
  }
  requireValue(data.astrology?.time_of_birth, "time of birth");
  requireValue(data.personal.place_of_birth, "place of birth");
  requireValue(data.astrology?.rashi, "moon sign (Rashi)");
  requireValue(data.astrology?.nakshatra, "birth star (Nakshatra)");
  requireValue(data.astrology?.pada, "pada");
  requireValue(data.vitals?.gotra, "gotra");
  requireValue(data.astrology?.manglik_status, "Manglik status");

  if (missing.length) {
    const firstItems = missing.slice(0, 4).join(", ");
    const remainder = missing.length > 4 ? ` and ${missing.length - 4} more` : "";
    throw new PortfolioPublishReadinessError(
      `Complete these required details before generating: ${firstItems}${remainder}`
    );
  }

  if (!hasShareablePrimaryPhoto) {
    throw new PortfolioPublishReadinessError(
      "Choose one primary photo and set it to Visible to all or Blurred until approval before publishing"
    );
  }
}
