import { describe, expect, it } from "vitest";
import {
  mapCandidate,
  mapCandidateDetails,
  mapCareerEntry,
  mapEducationEntry,
  mapFamilyMembers,
  mapPortfolioDraft,
  mapVisibilityRules,
} from "../src/features/portfolio/server/dashboard.mapper";
import type { PortfolioData } from "../src/types/portfolio";

const draft: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    dob: "1996-08-12",
    gender: "female",
    current_location: "Boston, MA",
    immigration_status: "H-1B",
  },
  vitals: { height: "5 ft 5 in" },
  astrology: { rashi: "kanya", nakshatra: "Uttara Phalguni" },
  lifestyle: { languages: "Telugu, English", hobbies: "Reading, Music" },
  preferences: { age_range: "28-32" },
  family: {
    father: { name: "Rao", occupation: "Engineer" },
    siblings: [{ name: "Maya", occupation: "Designer" }, {}],
  },
  visibility: { family: "restricted", contact: "public" },
};

describe("dashboard portfolio mapping", () => {
  it("preserves the dashboard draft while deriving relational details", () => {
    expect(mapPortfolioDraft(draft, "#123456")).toMatchObject({
      draft_data: draft,
      theme_color: "#123456",
      sun_sign: "kanya",
      template_id: 3,
    });
    expect(mapCandidateDetails(draft)).toMatchObject({
      personal: { immigration_status: "H-1B", height_text: "5 ft 5 in" },
      lifestyle: { languages: ["Telugu", "English"], hobbies: ["Reading", "Music"] },
      preferences: { age_min: 28, age_max: 32 },
    });
  });

  it("only maps populated family members and applies progressive visibility", () => {
    expect(mapFamilyMembers(draft)).toEqual([
      { relationship: "father", name: "Rao", occupation: "Engineer" },
      { relationship: "sibling", name: "Maya", occupation: "Designer" },
    ]);
    expect(mapVisibilityRules("portfolio-id", draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section_key: "family",
          visibility: "interest_required",
          requires_interest: true,
        }),
        expect.objectContaining({
          section_key: "contact",
          visibility: "public",
          requires_interest: false,
        }),
      ])
    );
  });

  it("maps ownership, optional records, and empty optional sections predictably", () => {
    expect(mapCandidate(draft, "user-id")).toMatchObject({
      display_name: "Aditi Rao",
      primary_owner_user_id: "user-id",
      created_by: "user-id",
    });
    expect(mapEducationEntry(draft)).toBeNull();
    expect(mapCareerEntry(draft)).toBeNull();
    expect(mapFamilyMembers({ ...draft, family: {} })).toEqual([]);
    expect(mapVisibilityRules("portfolio-id", { ...draft, visibility: {} })[0]).toMatchObject({
      visibility: "interest_required",
      requires_interest: true,
    });
  });

  it("maps populated education and career records", () => {
    const populated = {
      ...draft,
      education: { degree: "MS", institution: "Northeastern", year: "2020" },
      career: { title: "Engineer", company: "Nakshatra", summary: "Technology" },
      style: { theme_color: "#221133" },
    } satisfies PortfolioData;

    expect(mapPortfolioDraft(populated, "#123456").theme_color).toBe("#221133");
    expect(mapPortfolioDraft({ ...populated, style: { template_name: "Royal Heritage" } }, "#123456").template_id).toBe(3);
    expect(mapEducationEntry(populated)).toMatchObject({ end_year: 2020 });
    expect(mapCareerEntry(populated)).toMatchObject({
      title: "Engineer",
      industry: "Technology",
    });
  });
});
