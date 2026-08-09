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
    data.personal.immigration_status,
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
    data.preferences?.lifestyle_expectations,
  ]);
  const hasFuturePlans = hasAny([
    data.personal.long_term_goals,
    data.personal.shared_life_plans,
    data.preferences?.marriage_timeline,
    data.preferences?.children_preference,
    data.personal.relocation_preference,
    data.preferences?.career_after_marriage,
    data.preferences?.living_arrangement,
    data.preferences?.family_responsibilities,
  ]);
  const hasPublicFamily = hasAny([
    data.family?.public_summary,
    data.family?.paternal_origin,
    data.family?.ancestral_origin,
    data.family?.maternal_origin,
    data.family?.family_spread,
    data.personal.community,
    data.family?.sibling_position,
  ]) || data.family?.sibling_count !== undefined;
  const hasDetailedFamily = hasAny([
    data.family?.father?.name,
    data.family?.mother?.name,
    data.family?.parents_location,
    data.family?.family_note,
  ]) || Boolean(data.family?.siblings?.some((sibling) => hasAny([
    sibling.name,
    sibling.occupation,
    sibling.location,
  ])));
  const hasPublicAstrology = hasAny([
    data.astrology?.rashi,
    data.astrology?.nakshatra,
    data.astrology?.pada,
    data.vitals?.gotra,
    data.astrology?.maternal_gotra,
    data.astrology?.manglik_status,
  ]);
  const hasDetailedAstrology = hasAny([
    data.personal.dob,
    data.astrology?.time_of_birth,
    data.personal.place_of_birth,
    data.astrology?.lagnam,
  ]);
  const hasPrivateJourney = hasAny([
    data.education?.degree,
    data.education?.qualification_level,
    data.career?.title,
    data.career?.location,
  ]);
  const hasPrivateLifestyle = hasAny([
    data.lifestyle?.hobbies,
    data.lifestyle?.languages,
    data.lifestyle?.diet,
    data.lifestyle?.values_statement,
  ]);
  const privateFamilyIntroduction = clean(data.family?.public_summary);
  const hasFamilyBeyondPrivateIntroduction = hasAny([
    data.family?.paternal_origin,
    data.family?.ancestral_origin,
    data.family?.maternal_origin,
    data.family?.family_spread,
    data.personal.community,
    data.family?.sibling_position,
  ]) || data.family?.sibling_count !== undefined || hasDetailedFamily;
  const hasPrivateAstrology = hasAny([
    data.astrology?.rashi,
    data.astrology?.nakshatra,
  ]);
  const hasAstrologyBeyondPrivateIntroduction = hasAny([
    data.astrology?.pada,
    data.vitals?.gotra,
    data.astrology?.maternal_gotra,
    data.astrology?.manglik_status,
  ]) || hasDetailedAstrology;
  const privatePreferenceIntroduction = clean(data.preferences?.narrative);
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
    ...(privateMode && hasJourney && !hasPrivateJourney ? { journey: "restricted" as const } : {}),
    ...(privateMode && hasLifestyle && !hasPrivateLifestyle ? { lifestyle: "restricted" as const } : {}),
    ...(hasPublicFamily || hasDetailedFamily
      ? {
          family: privateMode
            ? privateFamilyIntroduction ? "public" as const : "restricted" as const
            : hasPublicFamily ? "public" as const : "restricted" as const,
        }
      : {}),
    ...((privateMode ? hasFamilyBeyondPrivateIntroduction : hasDetailedFamily)
      ? { family_details: "restricted" as const }
      : {}),
    ...(hasPublicAstrology
      ? {
          astrology: privateMode
            ? hasPrivateAstrology ? "public" as const : "restricted" as const
            : "public" as const,
        }
      : {}),
    ...((privateMode ? hasAstrologyBeyondPrivateIntroduction : hasDetailedAstrology)
      ? { astrology_details: "restricted" as const }
      : {}),
    ...(privateMode && hasPreferences && !privatePreferenceIntroduction
      ? { preferences: "restricted" as const }
      : {}),
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
            immigration_status: data.personal.immigration_status,
            community: data.personal.community,
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
      location: data.career?.location,
      ...(!privateMode
        ? {
            summary: data.career?.summary,
            job_type: data.career?.job_type,
            career_goals: data.career?.career_goals,
          }
        : {}),
    },
    vitals: {
      height: data.vitals?.height,
      ...(!privateMode ? { gotra: data.vitals?.gotra } : {}),
    },
    astrology: {
      rashi: data.astrology?.rashi,
      nakshatra: data.astrology?.nakshatra,
      ...(!privateMode
        ? {
            pada: data.astrology?.pada,
            maternal_gotra: data.astrology?.maternal_gotra,
            manglik_status: data.astrology?.manglik_status,
          }
        : {}),
    },
    education: {
      qualification_level: data.education?.qualification_level,
      degree: data.education?.degree,
      ...(!privateMode
        ? {
            institution: data.education?.institution,
            year: data.education?.year,
            location: data.education?.location,
            summary: data.education?.summary,
          }
        : {}),
    },
    lifestyle: {
      hobbies: data.lifestyle?.hobbies,
      languages: data.lifestyle?.languages,
      diet: data.lifestyle?.diet,
      values_statement: data.lifestyle?.values_statement,
    },
    preferences: {
      narrative: privateMode && privatePreferenceIntroduction
        ? excerpt(privatePreferenceIntroduction, 240)
        : data.preferences?.narrative,
    },
    ...(privateMode
      ? privateFamilyIntroduction
        ? { family: { public_summary: excerpt(privateFamilyIntroduction, 320) } }
        : {}
      : hasPublicFamily
            ? {
                family: {
                  public_summary: data.family?.public_summary,
                  paternal_origin: data.family?.paternal_origin || data.family?.ancestral_origin,
                  maternal_origin: data.family?.maternal_origin,
                  family_spread: data.family?.family_spread,
                  sibling_count: data.family?.sibling_count,
                  sibling_position: data.family?.sibling_position,
                },
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
