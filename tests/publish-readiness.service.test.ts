import { describe, expect, it } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";
import {
  PortfolioPublishReadinessError,
  requirePortfolioPublishReadiness,
} from "../src/features/portfolio/server/publish-readiness.service";

const readyPortfolio: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    dob: "1996-08-12",
    gender: "female",
    place_of_birth: "Bengaluru",
    current_location: "Boston",
    immigration_status: "H1B",
    profile_summary: "A thoughtful introduction.",
  },
  vitals: { height: `5'5"`, gotra: "Kashyap" },
  education: { degree: "MS", institution: "Northeastern" },
  career: { title: "Engineer", company: "Nakshatra", location: "Boston" },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    pada: "2",
    time_of_birth: "09:15",
    lagnam: "Mithuna",
    maternal_gotra: "Bharadwaj",
  },
  family: {
    father: { name: "Rao", occupation: "Engineer" },
    mother: { name: "Lakshmi", occupation: "Teacher" },
    paternal_origin: "Mysuru",
    maternal_origin: "Bengaluru",
    sibling_count: 0,
  },
  lifestyle: { languages: "English, Telugu" },
  preferences: { narrative: "A kind and curious partnership." },
  contact: {
    contacts: [{ relationship: "father", name: "Rao", phone: "+91 90000 00000" }],
  },
  style: { appearance: "light", template_name: "Celestial Union" },
};

describe("portfolio publish readiness", () => {
  it("accepts the complete mandatory profile and a public hero photo", () => {
    expect(() => requirePortfolioPublishReadiness({ data: readyPortfolio, hasPublicHeroPhoto: true })).not.toThrow();
  });

  it.each([
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, name: "" } }, true, "full name"],
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, current_location: "" } }, true, "current location"],
    [{ ...readyPortfolio, career: { ...readyPortfolio.career, title: "" } }, true, "profession or role"],
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, profile_summary: "", short_bio: "" } }, true, "short introduction"],
    [readyPortfolio, false, "profile photo"],
  ] as const)("rejects incomplete generation state", (data, hasPublicHeroPhoto, message) => {
    expect(() => requirePortfolioPublishReadiness({ data, hasPublicHeroPhoto })).toThrow(PortfolioPublishReadinessError);
    expect(() => requirePortfolioPublishReadiness({ data, hasPublicHeroPhoto })).toThrow(message);
  });

  it("allows detailed sections to remain incomplete", () => {
    expect(() => requirePortfolioPublishReadiness({
      data: {
        ...readyPortfolio,
        astrology: {},
        family: { sibling_count: 2, siblings: [] },
        lifestyle: {},
        preferences: {},
        contact: {},
      },
      hasPublicHeroPhoto: true,
    })).not.toThrow();
  });
});
