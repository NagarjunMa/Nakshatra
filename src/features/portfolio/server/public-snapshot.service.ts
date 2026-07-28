import "server-only";

import { portfolioDataSchema, type PortfolioData } from "@/types/portfolio";

/**
 * Builds the only data payload that may be exposed to an unauthenticated portfolio viewer.
 * Input: a validated owner portfolio. Output: a template-aware public snapshot that always
 * excludes contact, direct photo URLs, birthplace, immigration, and detailed astrology.
 */
export function createPublicPortfolioSnapshot(data: PortfolioData): PortfolioData {
  const privacyMode = data.privacy_mode || "progressive";
  const privateMode = privacyMode === "private";
  const openMode = privacyMode === "open";

  return portfolioDataSchema.parse({
    privacy_mode: privacyMode,
    personal: {
      name: data.personal.name,
      preferred_name: data.personal.preferred_name,
      dob: data.personal.dob,
      current_location: data.personal.current_location,
      gender: data.personal.gender,
      profile_summary: data.personal.profile_summary,
      ...(privateMode
        ? {}
        : {
            marital_status: data.personal.marital_status,
            relocation_preference: data.personal.relocation_preference,
            long_term_goals: data.personal.long_term_goals,
            shared_life_plans: data.personal.shared_life_plans,
          }),
    },
    style: data.style,
    ...(privateMode
      ? {}
      : {
          vitals: {
            height: data.vitals?.height,
            complexion: data.vitals?.complexion,
          },
          astrology: {
            rashi: data.astrology?.rashi,
            nakshatra: data.astrology?.nakshatra,
            pada: data.astrology?.pada,
          },
          education: {
            qualification_level: data.education?.qualification_level,
            degree: data.education?.degree,
            institution: data.education?.institution,
            year: data.education?.year,
            location: data.education?.location,
            summary: data.education?.summary,
          },
          career: {
            title: data.career?.title,
            company: data.career?.company,
            location: data.career?.location,
            summary: data.career?.summary,
            job_type: data.career?.job_type,
            career_goals: data.career?.career_goals,
          },
          lifestyle: {
            hobbies: data.lifestyle?.hobbies,
            languages: data.lifestyle?.languages,
            diet: data.lifestyle?.diet,
            smoking: data.lifestyle?.smoking,
            drinking: data.lifestyle?.drinking,
            music: data.lifestyle?.music,
            values_statement: data.lifestyle?.values_statement,
          },
          preferences: {
            narrative: data.preferences?.narrative,
          },
        }),
    ...(openMode
      ? {
          family: {
          ancestral_origin: data.family?.ancestral_origin,
          family_note: data.family?.family_note,
          family_spread: data.family?.family_spread,
          },
        }
      : {}),
    visibility: {
      family: openMode ? "public" : "restricted",
      astrology_details: openMode ? "public" : "restricted",
      gallery: openMode ? "public" : "restricted",
      contact: "restricted",
    },
  });
}
