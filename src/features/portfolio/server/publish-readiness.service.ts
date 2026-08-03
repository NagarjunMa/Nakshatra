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
  requireValue(data.astrology?.time_of_birth, "time of birth");
  requireValue(data.personal.place_of_birth, "place of birth");
  requireValue(data.vitals?.height, "height");
  requireValue(data.personal.current_location, "current location");
  requireValue(data.personal.immigration_status, "visa or residency status");
  requireValue(data.education?.degree, "education or qualification");
  requireValue(data.education?.institution, "educational institution");
  requireValue(data.career?.title, "profession or role");
  requireValue(data.career?.company, "employer or organisation");
  requireValue(data.career?.location, "work location");
  requireValue(data.astrology?.rashi, "rashi");
  requireValue(data.astrology?.nakshatra, "nakshatra");
  requireValue(data.astrology?.pada, "pada");
  requireValue(data.astrology?.lagnam, "lagnam");
  requireValue(data.vitals?.gotra, "gotra");
  requireValue(data.astrology?.maternal_gotra, "maternal gotra");
  requireValue(data.family?.father?.name, "father or guardian name");
  requireValue(data.family?.father?.occupation, "father or guardian occupation");
  requireValue(data.family?.mother?.name, "mother or guardian name");
  requireValue(data.family?.mother?.occupation, "mother or guardian occupation");
  requireValue(data.family?.paternal_origin, "paternal family origin");
  requireValue(data.family?.maternal_origin, "maternal family origin");
  requireValue(data.family?.sibling_count, "number of siblings");
  requireValue(data.lifestyle?.languages, "languages known");
  requireValue(data.personal.profile_summary, "personal introduction");
  requireValue(data.preferences?.narrative, "partner expectations");

  if ((data.family?.sibling_count ?? 0) > 0) {
    const completeSiblings = (data.family?.siblings ?? []).filter(
      (sibling) => sibling.name?.trim() && sibling.occupation?.trim()
    );
    if (completeSiblings.length < (data.family?.sibling_count ?? 0)) {
      missing.push("name and occupation for each sibling");
    }
  }

  const contacts = data.contact?.contacts ?? [];
  const hasContact = contacts.some(
    (contact) => contact.name?.trim() && (contact.phone?.trim() || contact.email?.trim())
  ) || Boolean(
    data.contact?.contact_person?.trim() &&
      (data.contact?.phone?.trim() || data.contact?.email?.trim())
  );
  if (!hasContact) missing.push("at least one protected contact");

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
