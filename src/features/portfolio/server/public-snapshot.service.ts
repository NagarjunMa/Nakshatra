import "server-only";

import { portfolioDataSchema, type PortfolioData } from "@/types/portfolio";

/**
 * Builds the only data payload that may be exposed to an unauthenticated portfolio viewer.
 * Input: a validated owner portfolio. Output: a validated public snapshot with family, contact,
 * direct photo URLs, birthplace, immigration, and detailed astrology intentionally excluded.
 */
export function createPublicPortfolioSnapshot(data: PortfolioData): PortfolioData {
  return portfolioDataSchema.parse({
    personal: {
      name: data.personal.name,
      preferred_name: data.personal.preferred_name,
      dob: data.personal.dob,
      current_location: data.personal.current_location,
      gender: data.personal.gender,
      marital_status: data.personal.marital_status,
      relocation_preference: data.personal.relocation_preference,
      profile_summary: data.personal.profile_summary,
    },
    vitals: {
      height: data.vitals?.height,
      complexion: data.vitals?.complexion,
    },
    astrology: {
      rashi: data.astrology?.rashi,
      nakshatra: data.astrology?.nakshatra,
      pada: data.astrology?.pada,
    },
    education: data.education,
    career: data.career,
    lifestyle: data.lifestyle,
    style: data.style,
    preferences: data.preferences,
    // These scopes are deliberately private even if an older draft contains a public toggle.
    visibility: {
      family: "restricted",
      astrology_details: "restricted",
      gallery: "restricted",
      contact: "restricted",
    },
  });
}
