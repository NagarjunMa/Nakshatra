import { describe, expect, it } from "vitest";
import { createApprovedPortfolioSnapshot } from "../src/features/portfolio/server/approved-snapshot.service";
import type { PortfolioData } from "../src/types/portfolio";

const complete: PortfolioData = {
  privacy_mode: "balanced",
  personal: {
    name: "Aditi Rao",
    preferred_name: "Aditi",
    dob: "1996-08-12",
    place_of_birth: "Bengaluru",
    current_location: "Boston, MA, United States",
    gender: "female",
    marital_status: "Never Married",
    immigration_status: "H1B",
    relocation_preference: "Discuss and decide",
    citizenship: "India",
    religion: "Hindu",
    community: "Brahmin",
    city_geoname_id: 123,
    profile_for: "self",
  },
  vitals: { height: "5'5\"", gotra: "Kashyap", complexion: "Legacy" },
  astrology: { rashi: "kanya", maternal_gotra: "Bharadwaj", time_of_birth: "09:15" },
  career: { title: "Engineer", company: "Example", annual_income: "$100k–$125k" },
  family: { father: { name: "Ramesh" }, mother: { name: "Meera" } },
  lifestyle: { hobbies: "Reading", credit_score_band: "Private", drinking: "Never" },
  preferences: { age_range: "28–34", private_notes: "Never share this" },
  contact: { contact_person: "Ramesh", phone: "+1 555 0100", secure_note: "Owner only" },
  visibility: { family_details: "restricted", contact: "restricted" },
  access: { contact: "owner" },
};

describe("approved portfolio snapshot", () => {
  it("includes the full approved blueprint but excludes owner-only and security data", () => {
    const snapshot = createApprovedPortfolioSnapshot(complete);

    expect(snapshot.personal).toMatchObject({
      name: "Aditi Rao",
      dob: "1996-08-12",
      place_of_birth: "Bengaluru",
      marital_status: "Never Married",
      immigration_status: "H1B",
    });
    expect(snapshot.family?.father?.name).toBe("Ramesh");
    expect(snapshot.vitals?.gotra).toBe("Kashyap");
    expect(snapshot.astrology?.maternal_gotra).toBe("Bharadwaj");
    expect(snapshot.career?.annual_income).toBe("$100k–$125k");
    expect(snapshot.preferences?.age_range).toBe("28–34");

    expect(snapshot).not.toHaveProperty("contact");
    expect(snapshot.preferences).not.toHaveProperty("private_notes");
    expect(snapshot.lifestyle).not.toHaveProperty("credit_score_band");
    expect(snapshot.personal).not.toHaveProperty("profile_for");
    expect(snapshot.personal).not.toHaveProperty("city_geoname_id");
    expect(snapshot.vitals).not.toHaveProperty("complexion");
    expect(snapshot).not.toHaveProperty("access");
    expect(snapshot).not.toHaveProperty("visibility");
  });
});
