import { describe, expect, it } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";
import { createPublicPortfolioSnapshot } from "../src/features/portfolio/server/public-snapshot.service";

const portfolio: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    preferred_name: "Aditi",
    photo_url: "https://private.example/original.webp",
    photo_thumb_url: "https://private.example/thumb.webp",
    dob: "1996-08-12",
    place_of_birth: "Bengaluru",
    current_location: "New York",
    gender: "female",
    immigration_status: "H-1B",
    community: "Brahmin",
    short_bio: "Warm, grounded, and curious about the world.",
    profile_summary: "A thoughtful public introduction.",
    long_term_goals: "Build a generous and grounded life.",
    religion: "Hindu",
  },
  vitals: { height: "5 ft 5 in", complexion: "Fair", gotra: "Kashyap" },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    pada: "2",
    time_of_birth: "09:15",
    lagnam: "Mithuna",
    maternal_gotra: "Bharadwaj",
    manglik_status: "No",
  },
  family: {
    father: { name: "Private Father", occupation: "Engineer" },
    family_note: "Private family note",
    sibling_count: 1,
    sibling_position: "Oldest",
  },
  contact: {
    contact_person: "Private Contact",
    phone: "+1 555 0100",
    email: "private@example.com",
    secure_note: "Private contact note",
  },
  style: { template_name: "Royal Heritage", theme_color: "#000000" },
  career: {
    title: "Engineer",
    company: "Private Employer",
    annual_income: "150000",
    income_currency: "USD",
    wealth_stage: "Comfortable",
  },
  preferences: {
    narrative: "A kind and curious partner.",
    marriage_timeline: "Within the next 2 years",
    visa_preferences: "H1B, Citizen",
  },
};

describe("public portfolio snapshot", () => {
  it("includes safe display data while omitting private personal, family, and contact values", () => {
    const snapshot = createPublicPortfolioSnapshot(portfolio);

    expect(snapshot.personal).toMatchObject({
      name: "Aditi Rao",
      preferred_name: "Aditi",
      current_location: "New York",
      short_bio: "Warm, grounded, and curious about the world.",
    });
    expect(snapshot.personal).not.toHaveProperty("photo_url");
    expect(snapshot.personal).not.toHaveProperty("photo_thumb_url");
    expect(snapshot.personal).not.toHaveProperty("dob");
    expect(snapshot.personal.age).toEqual(expect.any(Number));
    expect(snapshot.personal).not.toHaveProperty("place_of_birth");
    expect(snapshot.personal.immigration_status).toBe("H-1B");
    expect(snapshot.personal.community).toBe("Brahmin");
    expect(snapshot.personal).not.toHaveProperty("religion");
    expect(snapshot.family).toEqual({ sibling_count: 1, sibling_position: "Oldest" });
    expect(snapshot).not.toHaveProperty("contact");
    expect(snapshot.vitals).not.toHaveProperty("complexion");
    expect(snapshot.career).not.toHaveProperty("annual_income");
    expect(snapshot.career).not.toHaveProperty("income_currency");
    expect(snapshot.career).not.toHaveProperty("wealth_stage");
    expect(snapshot.preferences).toEqual({
      narrative: "A kind and curious partner.",
    });
  });

  it("removes detailed astrology and forces gated scopes to remain restricted", () => {
    const snapshot = createPublicPortfolioSnapshot(portfolio);

    expect(snapshot.astrology).toEqual({
      rashi: "kanya",
      nakshatra: "Uttara Phalguni",
      pada: "2",
      maternal_gotra: "Bharadwaj",
      manglik_status: "No",
    });
    expect(snapshot.astrology).not.toHaveProperty("time_of_birth");
    expect(snapshot.astrology).not.toHaveProperty("lagnam");
    expect(snapshot.vitals?.gotra).toBe("Kashyap");
    expect(snapshot.visibility).toEqual({
      family: "public",
      family_details: "restricted",
      astrology: "public",
      astrology_details: "restricted",
      contact: "restricted",
    });
  });

  it("applies private and balanced templates without exposing contact details", () => {
    const privateSnapshot = createPublicPortfolioSnapshot({
      ...portfolio,
      privacy_mode: "private",
    });
    expect(privateSnapshot.career).toMatchObject({ title: "Engineer" });
    expect(privateSnapshot.vitals?.height).toBe("5 ft 5 in");
    expect(privateSnapshot.astrology).toEqual({
      rashi: "kanya",
      nakshatra: "Uttara Phalguni",
    });
    expect(privateSnapshot.preferences?.narrative).toBe("A kind and curious partner.");
    expect(privateSnapshot).not.toHaveProperty("family");
    expect(privateSnapshot.personal).not.toHaveProperty("long_term_goals");
    expect(privateSnapshot.personal).not.toHaveProperty("immigration_status");
    expect(privateSnapshot.personal).not.toHaveProperty("community");
    expect(privateSnapshot.vitals).not.toHaveProperty("gotra");

    const balancedSnapshot = createPublicPortfolioSnapshot({
      ...portfolio,
      privacy_mode: "balanced",
      family: {
        ...portfolio.family,
        public_summary: "A close-knit family with roots in Karnataka.",
        paternal_origin: "Mysuru",
        maternal_origin: "Bengaluru",
        family_spread: "India and the US",
        sibling_count: 1,
        sibling_position: "Oldest",
      },
    });
    expect(balancedSnapshot.family).toEqual({
      public_summary: "A close-knit family with roots in Karnataka.",
      paternal_origin: "Mysuru",
      maternal_origin: "Bengaluru",
      family_spread: "India and the US",
      sibling_count: 1,
      sibling_position: "Oldest",
    });
    expect(balancedSnapshot).not.toHaveProperty("contact");
    expect(balancedSnapshot.visibility).toEqual({
      family: "public",
      family_details: "restricted",
      astrology: "public",
      astrology_details: "restricted",
      contact: "restricted",
    });
  });

  it("records protected previews only when meaningful information exists", () => {
    const minimal = createPublicPortfolioSnapshot({
      privacy_mode: "private",
      personal: { name: "Minimal", gender: "prefer_not_to_say" },
    });
    expect(minimal.visibility).toBeUndefined();

    const privateSnapshot = createPublicPortfolioSnapshot({
      ...portfolio,
      privacy_mode: "private",
      personal: {
        ...portfolio.personal,
        profile_summary: "A ".repeat(200),
        shared_life_plans: "A thoughtful shared life.",
      },
      education: { degree: "MS" },
      lifestyle: { hobbies: "Reading" },
    });
    expect(privateSnapshot.visibility).toMatchObject({
      personal_story: "restricted",
      future_plans: "restricted",
      family: "restricted",
      family_details: "restricted",
      astrology: "public",
      astrology_details: "restricted",
      contact: "restricted",
    });
    expect(privateSnapshot.visibility).not.toHaveProperty("journey");
    expect(privateSnapshot.visibility).not.toHaveProperty("lifestyle");
    expect(privateSnapshot.visibility).not.toHaveProperty("preferences");
    expect(privateSnapshot.education?.degree).toBe("MS");
    expect(privateSnapshot.lifestyle?.hobbies).toBe("Reading");
    expect(privateSnapshot.astrology).toEqual({
      rashi: "kanya",
      nakshatra: "Uttara Phalguni",
    });
    expect(privateSnapshot.personal.profile_summary).toMatch(/…$/);
    expect(privateSnapshot.personal.short_bio).toBe("Warm, grounded, and curious about the world.");
  });
});
