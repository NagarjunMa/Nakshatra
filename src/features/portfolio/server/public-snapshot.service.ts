import "server-only";

import {
  normalizePortfolioPrivacyMode,
  portfolioDataSchema,
  type PortfolioData,
} from "@/types/portfolio";

function ageFromDate(dateOfBirth?: string) {
  if (!dateOfBirth) return undefined;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age >= 18 && age <= 120 ? age : undefined;
}

/** Builds the only payload available through an unauthenticated portfolio URL. */
export function createPublicPortfolioSnapshot(data: PortfolioData): PortfolioData {
  const privacyMode = normalizePortfolioPrivacyMode(data.privacy_mode);
  const privateMode = privacyMode === "private";
  const originalStory = clean(data.personal.profile_summary);
  const publicStory = privateMode && originalStory ? excerpt(originalStory, 280) : originalStory;
  const hasJourney = hasAny([
    data.education?.degree,
    data.education?.qualification_level,
    data.education?.institution,
    data.education?.year,
    data.education?.location,
    data.education?.summary,
    data.career?.title,
    data.career?.company,
    data.career?.location,
    data.career?.summary,
    data.career?.job_type,
    data.career?.career_goals,
  ]);
  const hasLifestyle = hasAny([
    data.lifestyle?.hobbies,
    data.lifestyle?.languages,
    data.lifestyle?.diet,
    data.lifestyle?.smoking,
    data.lifestyle?.drinking,
    data.lifestyle?.values_statement,
  ]);
  const hasPreferences = hasAny([
    data.preferences?.narrative,
    data.preferences?.age_range,
    data.preferences?.height_range,
    data.preferences?.location_preferences,
    data.preferences?.lifestyle_expectations,
  ]);
  const hasFuturePlans = hasAny([
    data.personal.long_term_goals,
    data.personal.shared_life_plans,
    data.preferences?.marriage_timeline,
    data.preferences?.children_preference,
    data.personal.relocation_preference,
  ]);
  const hasPublicFamily = hasAny([
    data.family?.public_summary,
    data.family?.paternal_origin,
    data.family?.ancestral_origin,
    data.family?.maternal_origin,
    data.family?.family_spread,
  ]);
  const hasDetailedFamily = hasAny([
    data.family?.father?.name,
    data.family?.mother?.name,
    data.family?.parents_location,
    data.family?.family_note,
  ]);
  const hasPublicAstrology = hasAny([
    data.astrology?.rashi,
    data.astrology?.nakshatra,
    data.astrology?.pada,
  ]);
  const hasDetailedAstrology = hasAny([
    data.astrology?.time_of_birth,
    data.personal.place_of_birth,
    data.astrology?.lagnam,
    data.vitals?.gotra,
    data.astrology?.maternal_gotra,
    data.astrology?.manglik_status,
  ]);
  const hasContact = Boolean(
    (clean(data.contact?.contact_person) && (clean(data.contact?.phone) || clean(data.contact?.email))) ||
      data.contact?.contacts?.some(
        (contact) => clean(contact.name) && (clean(contact.phone) || clean(contact.email))
      )
  );

  const displayName = privateMode
    ? clean(data.personal.preferred_name) || firstName(data.personal.name)
    : clean(data.personal.name);
  const visibility = compactVisibility({
    ...(privateMode && originalStory && publicStory !== originalStory
      ? { personal_story: "restricted" as const }
      : {}),
    ...(privateMode && hasJourney ? { journey: "restricted" as const } : {}),
    ...(privateMode && hasLifestyle ? { lifestyle: "restricted" as const } : {}),
    ...(hasPublicFamily || hasDetailedFamily
      ? { family: !privateMode && hasPublicFamily ? "public" as const : "restricted" as const }
      : {}),
    ...(hasDetailedFamily ? { family_details: "restricted" as const } : {}),
    ...(hasPublicAstrology
      ? { astrology: privateMode ? "restricted" as const : "public" as const }
      : {}),
    ...(hasDetailedAstrology ? { astrology_details: "restricted" as const } : {}),
    ...(privateMode && hasPreferences ? { preferences: "restricted" as const } : {}),
    ...(privateMode && hasFuturePlans ? { future_plans: "restricted" as const } : {}),
    ...(hasContact ? { contact: "restricted" as const } : {}),
  });

  return portfolioDataSchema.parse({
    privacy_mode: privacyMode,
    personal: {
      name: displayName || "Personal portfolio",
      preferred_name: data.personal.preferred_name,
      age: ageFromDate(data.personal.dob),
      current_location: data.personal.current_location,
      gender: data.personal.gender,
      short_bio: clean(data.personal.short_bio),
      profile_summary: publicStory,
      ...(!privateMode
        ? {
            marital_status: data.personal.marital_status,
            long_term_goals: data.personal.long_term_goals,
            shared_life_plans: data.personal.shared_life_plans,
          }
        : {}),
    },
    style: {
      appearance: data.style?.appearance || "light",
      template_name: "Celestial Union",
    },
    career: {
      title: data.career?.title,
      ...(!privateMode
        ? {
            location: data.career?.location,
            summary: data.career?.summary,
            job_type: data.career?.job_type,
            career_goals: data.career?.career_goals,
          }
        : {}),
    },
    ...(!privateMode
      ? {
          vitals: { height: data.vitals?.height },
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
          lifestyle: {
            hobbies: data.lifestyle?.hobbies,
            languages: data.lifestyle?.languages,
            diet: data.lifestyle?.diet,
            values_statement: data.lifestyle?.values_statement,
          },
          preferences: { narrative: data.preferences?.narrative },
          ...(hasPublicFamily
            ? {
                family: {
                  public_summary: data.family?.public_summary,
                  paternal_origin: data.family?.paternal_origin || data.family?.ancestral_origin,
                  maternal_origin: data.family?.maternal_origin,
                  family_spread: data.family?.family_spread,
                },
              }
            : {}),
        }
      : {}),
    ...(Object.keys(visibility).length ? { visibility } : {}),
  });
}

function compactVisibility(values: NonNullable<PortfolioData["visibility"]>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => Boolean(value))
  ) as NonNullable<PortfolioData["visibility"]>;
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function firstName(value?: string) {
  return clean(value)?.split(/\s+/)[0];
}

function hasAny(values: Array<string | null | undefined>) {
  return values.some((value) => Boolean(clean(value)));
}

function excerpt(value: string, maximumLength: number) {
  if (value.length <= maximumLength) return value;
  const shortened = value.slice(0, maximumLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  const end = boundary > maximumLength * 0.65 ? boundary : maximumLength;
  return `${shortened.slice(0, end).trim()}…`;
}
