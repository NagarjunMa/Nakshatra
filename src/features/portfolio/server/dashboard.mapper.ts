import {
  normalizePortfolioPrivacyMode,
  type PortfolioData,
} from "@/types/portfolio";
import {
  CELESTIAL_UNION_TEMPLATE_ID,
  withCanonicalTemplate,
} from "@/features/portfolio/template";
import { getCelestialBackground } from "@/features/portfolio/celestial-theme";

const EMPTY_VALUES = new Set(["", undefined, null]);

export interface FamilyMemberPayload {
  relationship: string;
  name?: string;
  occupation?: string;
  location?: string;
  marital_status?: string;
}

/** Converts an optional form string into a database-safe nullable value. Input: form value. Output: string or null. */
function nullable(value: string | undefined) {
  return EMPTY_VALUES.has(value) ? null : value;
}

/** Splits a comma-separated form value into normalized database array values. Input: text. Output: non-empty strings. */
function commaSeparatedList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Extracts a minimum and maximum age from free-form preference text. Input: age range text. Output: nullable numeric bounds. */
function ageRange(value: string | undefined) {
  const matches = (value ?? "").match(/\d+/g)?.map(Number) ?? [];
  return { min: matches[0] ?? null, max: matches[1] ?? null };
}

/** Converts dashboard visibility choices to the relational visibility enum. Input: dashboard setting. Output: persisted visibility. */
function presetVisibility(
  privacyMode: PortfolioData["privacy_mode"],
  section: "family" | "astrology" | "gallery" | "contact"
) {
  if (section === "contact" || privacyMode === "private") {
    return "interest_required";
  }
  return "public";
}

/**
 * Maps dashboard form data to the legacy portfolio draft fields.
 * Input: validated portfolio data and any existing theme color. Output: a portfolios upsert payload.
 */
export function mapPortfolioDraft(
  data: PortfolioData,
  existingThemeColor: string | null
) {
  const privacyMode = normalizePortfolioPrivacyMode(data.privacy_mode);
  const canonicalData = {
    ...data,
    privacy_mode: privacyMode,
    style: withCanonicalTemplate(data.style),
  };

  return {
    draft_data: canonicalData,
    theme_color: getCelestialBackground(data.style) || existingThemeColor || null,
    sun_sign: data.astrology?.rashi || null,
    template_id: CELESTIAL_UNION_TEMPLATE_ID,
    privacy_mode: privacyMode,
    visibility_settings: {
      preset: privacyMode,
      legacy_sections: data.access || {},
    },
  };
}

/**
 * Maps a portfolio identity section to the canonical candidate record.
 * Input: validated portfolio data and authenticated owner ID. Output: a candidates upsert payload.
 */
export function mapCandidate(data: PortfolioData, userId: string) {
  return {
    display_name: data.personal.name.trim(),
    legal_name: data.personal.name.trim(),
    gender: nullable(data.personal.gender),
    birth_date: nullable(data.personal.dob),
    current_city: nullable(data.personal.city || data.personal.current_location),
    current_region: nullable(data.personal.region),
    current_country: nullable(data.personal.country),
    primary_owner_user_id: userId,
    created_by: userId,
  };
}

/**
 * Maps dashboard sections to the four candidate detail tables.
 * Input: validated portfolio data. Output: grouped relational upsert payloads.
 */
export function mapCandidateDetails(data: PortfolioData) {
  const ages = ageRange(data.preferences?.age_range);

  return {
    personal: {
      preferred_name: nullable(data.personal.preferred_name),
      marital_status: nullable(data.personal.marital_status),
      height_text: nullable(data.vitals?.height),
      complexion: nullable(data.vitals?.complexion),
      birthplace: nullable(data.personal.place_of_birth),
      immigration_status: nullable(data.personal.immigration_status),
      relocation_preference: nullable(data.personal.relocation_preference),
      about: nullable(data.personal.profile_summary),
      values_statement: nullable(data.lifestyle?.values_statement),
      profile_for: nullable(data.personal.profile_for),
      citizenship: nullable(data.personal.citizenship),
      religion: nullable(data.personal.religion),
      community: nullable(data.personal.community),
      sub_community: nullable(data.personal.sub_community),
      long_term_goals: nullable(data.personal.long_term_goals),
      shared_life_plans: nullable(data.personal.shared_life_plans),
      sibling_count: data.family?.sibling_count ?? null,
      sibling_position: nullable(data.family?.sibling_position),
      parents_location: nullable(
        data.family?.parents_location ||
          [
            data.family?.current_city,
            data.family?.current_region,
            data.family?.current_country,
          ]
            .filter(Boolean)
            .join(", ")
      ),
    },
    astrology: {
      birth_time: nullable(data.astrology?.time_of_birth),
      birth_place: nullable(data.personal.place_of_birth),
      rashi: nullable(data.astrology?.rashi),
      nakshatra: nullable(data.astrology?.nakshatra),
      pada: nullable(data.astrology?.pada),
      lagnam: nullable(data.astrology?.lagnam),
      gothram: nullable(data.vitals?.gotra),
      maternal_gothram: nullable(data.astrology?.maternal_gotra),
      manglik_status: nullable(data.astrology?.manglik_status),
    },
    lifestyle: {
      diet: nullable(data.lifestyle?.diet),
      smoking: nullable(data.lifestyle?.smoking),
      drinking: nullable(data.lifestyle?.drinking),
      languages: commaSeparatedList(data.lifestyle?.languages),
      hobbies: commaSeparatedList(data.lifestyle?.hobbies),
      // Retired from the product. Clear any legacy relational value on the next save.
      music: null,
      lifestyle_payload: {
        credit_score_band: data.lifestyle?.credit_score_band || null,
      },
    },
    preferences: {
      age_min: ages.min,
      age_max: ages.max,
      height_min_text: nullable(data.preferences?.height_range),
      marital_status: nullable(data.preferences?.marital_status),
      community: nullable(data.preferences?.background),
      location_preference: nullable(data.preferences?.location_preference),
      narrative: nullable(data.preferences?.narrative),
      preferences_payload: {
        location_preferences: commaSeparatedList(
          data.preferences?.location_preferences
        ),
        visa_preferences: commaSeparatedList(data.preferences?.visa_preferences),
        caste_preference: data.preferences?.caste_preference || null,
        specific_communities: commaSeparatedList(
          data.preferences?.specific_communities
        ),
        horoscope_preference: data.preferences?.horoscope_preference || null,
        marriage_timeline: data.preferences?.marriage_timeline || null,
        children_preference: data.preferences?.children_preference || null,
        wedding_expectations: data.preferences?.wedding_expectations || null,
        gift_expectations: data.preferences?.gift_expectations || null,
        parent_support: data.preferences?.parent_support || null,
        religion_preference: data.preferences?.religion_preference || null,
        lifestyle_expectations:
          data.preferences?.lifestyle_expectations || null,
        education_expectations:
          data.preferences?.education_expectations || null,
        career_expectations: data.preferences?.career_expectations || null,
        private_notes: data.preferences?.private_notes || null,
      },
    },
  };
}

/**
 * Produces the two-mode public visibility rules for one portfolio.
 * Input: portfolio ID and validated visibility choices. Output: visibility_rules upsert rows.
 */
export function mapVisibilityRules(portfolioId: string, data: PortfolioData) {
  const privacyMode = normalizePortfolioPrivacyMode(data.privacy_mode);
  return (["family", "astrology", "gallery", "contact"] as const).map(
    (section_key) => {
      const visibility = presetVisibility(privacyMode, section_key);
      return {
    portfolio_id: portfolioId,
    section_key,
        visibility,
        requires_interest: visibility !== "public",
      };
    }
  );
}

/**
 * Converts populated parent and sibling form values into family member rows.
 * Input: validated portfolio data. Output: only populated candidate_family_members payloads.
 */
export function mapFamilyMembers(data: PortfolioData) {
  const members: Array<FamilyMemberPayload | "" | undefined> = [
    data.family?.father?.name && { relationship: "father", ...data.family.father },
    data.family?.mother?.name && { relationship: "mother", ...data.family.mother },
    ...(data.family?.siblings ?? [])
      .filter((member) => member.name)
      .map((member) => ({ relationship: "sibling", ...member })),
  ];

  return members.filter(
    (member): member is FamilyMemberPayload => Boolean(member)
  );
}

/**
 * Converts the optional education section into one timeline row.
 * Input: validated portfolio data. Output: education payload or null when empty.
 */
export function mapEducationEntry(data: PortfolioData) {
  if (!data.education?.degree && !data.education?.institution) return null;

  return {
    degree: nullable(data.education.degree),
    qualification_level: nullable(data.education.qualification_level),
    institution: nullable(data.education.institution),
    location: nullable(data.education.location),
    end_year: Number(data.education.year) || null,
    sort_order: 0,
  };
}

/**
 * Converts the optional career section into one current-career row.
 * Input: validated portfolio data. Output: career payload or null when empty.
 */
export function mapCareerEntry(data: PortfolioData) {
  if (!data.career?.title && !data.career?.company) return null;

  return {
    title: nullable(data.career.title),
    company: nullable(data.career.company),
    industry: nullable(data.career.summary),
    job_type: nullable(data.career.job_type),
    annual_income: nullable(data.career.annual_income),
    income_currency: nullable(data.career.income_currency),
    wealth_stage: nullable(data.career.wealth_stage),
    career_goals: nullable(data.career.career_goals),
    location: nullable(data.career.location),
    is_current: true,
    sort_order: 0,
  };
}
