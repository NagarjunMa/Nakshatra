import "server-only";

import {
  normalizePortfolioPrivacyMode,
  portfolioDataSchema,
  type PortfolioData,
} from "@/types/portfolio";

const APPROVED_EXCLUDED_PREFERENCE_KEYS = new Set([
  "private_notes",
  "location_preference",
  "location_preferences",
  "wedding_expectations",
  "gift_expectations",
  "parent_support",
]);

/**
 * Builds the full blueprint that an authenticated, approved requester may see.
 * Direct contact, internal notes, legacy photo URLs, credit information, and
 * geographic reference IDs are deliberately excluded from this projection.
 */
export function createApprovedPortfolioSnapshot(data: PortfolioData): PortfolioData {
  const approvedPreferences = data.preferences
    ? Object.fromEntries(
        Object.entries(data.preferences).filter(
          ([key]) => !APPROVED_EXCLUDED_PREFERENCE_KEYS.has(key)
        )
      )
    : undefined;
  return portfolioDataSchema.parse({
    privacy_mode: normalizePortfolioPrivacyMode(data.privacy_mode),
    personal: {
      name: data.personal.name,
      preferred_name: data.personal.preferred_name,
      dob: data.personal.dob,
      age: data.personal.age,
      place_of_birth: data.personal.place_of_birth,
      current_location: data.personal.current_location,
      gender: data.personal.gender,
      marital_status: data.personal.marital_status,
      immigration_status: data.personal.immigration_status,
      relocation_preference: data.personal.relocation_preference,
      short_bio: data.personal.short_bio,
      profile_summary: data.personal.profile_summary,
      country: data.personal.country,
      region: data.personal.region,
      city: data.personal.city,
      citizenship: data.personal.citizenship,
      religion: data.personal.religion,
      community: data.personal.community,
      sub_community: data.personal.sub_community,
      long_term_goals: data.personal.long_term_goals,
      shared_life_plans: data.personal.shared_life_plans,
    },
    vitals: {
      height: data.vitals?.height,
      gotra: data.vitals?.gotra,
    },
    astrology: data.astrology,
    education: data.education,
    career: data.career,
    family: data.family
      ? {
          father: data.family.father,
          mother: data.family.mother,
          siblings: data.family.siblings,
          ancestral_origin: data.family.ancestral_origin,
          paternal_origin: data.family.paternal_origin,
          maternal_origin: data.family.maternal_origin,
          public_summary: data.family.public_summary,
          current_settlement: data.family.current_settlement,
          family_note: data.family.family_note,
          sibling_count: data.family.sibling_count,
          sibling_position: data.family.sibling_position,
          parents_location: data.family.parents_location,
          current_country: data.family.current_country,
          current_region: data.family.current_region,
          current_city: data.family.current_city,
          family_spread: data.family.family_spread,
        }
      : undefined,
    lifestyle: data.lifestyle
      ? {
          hobbies: data.lifestyle.hobbies,
          languages: data.lifestyle.languages,
          diet: data.lifestyle.diet,
          smoking: data.lifestyle.smoking,
          drinking: data.lifestyle.drinking,
          values_statement: data.lifestyle.values_statement,
        }
      : undefined,
    preferences: approvedPreferences,
    style: {
      appearance: data.style?.appearance || "light",
      template_name: "Celestial Union",
    },
  });
}
