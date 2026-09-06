import { describe, expect, it } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";
import {
  PortfolioPublishReadinessError,
  requirePortfolioPublishReadiness,
} from "../src/features/portfolio/server/publish-readiness.service";

const readyPortfolio: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    first_name: "Aditi",
    last_name: "Rao",
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
    manglik_status: "No",
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
  it("accepts the complete mandatory profile and a shareable primary photo", () => {
    expect(() => requirePortfolioPublishReadiness({ data: readyPortfolio, hasShareablePrimaryPhoto: true })).not.toThrow();
  });

  it.each([
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, name: "", first_name: "", last_name: "" } }, true, "first name"],
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, current_location: "" } }, true, "current location"],
    [{ ...readyPortfolio, career: { ...readyPortfolio.career, title: "" } }, true, "profession or role"],
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, profile_summary: "", short_bio: "" } }, true, "short introduction"],
    [{ ...readyPortfolio, astrology: { ...readyPortfolio.astrology, time_of_birth: "" } }, true, "time of birth"],
    [{ ...readyPortfolio, personal: { ...readyPortfolio.personal, place_of_birth: "" } }, true, "place of birth"],
    [{ ...readyPortfolio, astrology: { ...readyPortfolio.astrology, rashi: "" } }, true, "moon sign (Rashi)"],
    [{ ...readyPortfolio, astrology: { ...readyPortfolio.astrology, nakshatra: "" } }, true, "birth star (Nakshatra)"],
    [{ ...readyPortfolio, astrology: { ...readyPortfolio.astrology, pada: "" } }, true, "pada"],
    [{ ...readyPortfolio, vitals: { ...readyPortfolio.vitals, gotra: "" } }, true, "gotra"],
    [{ ...readyPortfolio, astrology: { ...readyPortfolio.astrology, manglik_status: "" } }, true, "Manglik status"],
    [readyPortfolio, false, "primary photo"],
  ] as const)("rejects incomplete generation state", (data, hasShareablePrimaryPhoto, message) => {
    expect(() => requirePortfolioPublishReadiness({ data, hasShareablePrimaryPhoto })).toThrow(PortfolioPublishReadinessError);
    expect(() => requirePortfolioPublishReadiness({ data, hasShareablePrimaryPhoto })).toThrow(message);
  });

  it("allows non-required detailed sections to remain incomplete", () => {
    expect(() => requirePortfolioPublishReadiness({
      data: {
        ...readyPortfolio,
        family: { sibling_count: 2, siblings: [] },
        lifestyle: {},
        preferences: {},
        contact: {},
      },
      hasShareablePrimaryPhoto: true,
    })).not.toThrow();
  });

  it("summarizes long lists of missing required details", () => {
    const incomplete: PortfolioData = {
      ...readyPortfolio,
      personal: {
        ...readyPortfolio.personal,
        name: "",
        first_name: "",
        last_name: "",
        dob: "",
        gender: "" as PortfolioData["personal"]["gender"],
        current_location: "",
        profile_summary: undefined,
        short_bio: undefined,
      },
      career: undefined,
    };

    expect(() => requirePortfolioPublishReadiness({ data: incomplete, hasShareablePrimaryPhoto: false }))
      .toThrow(" and 2 more");
  });
});
