// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlueprintForm } from "../src/components/portfolio/BlueprintForm";
import type { PortfolioData } from "../src/types/portfolio";

const completeBlueprint: PortfolioData = {
  privacy_mode: "progressive",
  personal: {
    name: "Aditi Rao",
    preferred_name: "Aditi",
    dob: "1996-08-12",
    gender: "female",
    profile_for: "self",
    profile_summary: "A thoughtful introduction",
    place_of_birth: "Bengaluru",
    current_location: "Boston, Massachusetts, United States",
    country: "United States",
    region: "Massachusetts",
    city: "Boston",
    immigration_status: "H1B",
  },
  vitals: { height: `5'5"`, gotra: "Kashyap" },
  education: { degree: "MS", institution: "Northeastern", location: "Boston" },
  career: { title: "Engineer", company: "Nakshatra", location: "Boston" },
  family: {
    father: { name: "Rao", occupation: "Engineer" },
    mother: { name: "Lakshmi", occupation: "Teacher" },
    paternal_origin: "Mysuru",
    maternal_origin: "Bengaluru",
    sibling_count: 1,
    siblings: [{ name: "Maya", occupation: "Designer" }],
  },
  lifestyle: { languages: "English, Telugu", hobbies: "Reading" },
  preferences: { narrative: "A kind and curious partnership" },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    pada: "2",
    time_of_birth: "09:15",
    lagnam: "Mithuna",
    maternal_gotra: "Bharadwaj",
  },
  contact: {
    contacts: [{ relationship: "father", name: "Rao", phone: "+91 90000 00000" }],
  },
  style: { appearance: "light", template_name: "Celestial Union" },
};

describe("blueprint form", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ options: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
  });

  it("routes required profile, family, contact, appearance, and privacy changes", () => {
    const onUpdate = vi.fn();
    render(<BlueprintForm data={completeBlueprint} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Updated Name" } });
    fireEvent.change(screen.getByLabelText("Rashi"), { target: { value: "kumbha" } });
    fireEvent.change(screen.getByLabelText("Number of siblings"), { target: { value: "2" } });
    fireEvent.change(screen.getAllByLabelText("Contact name")[0], { target: { value: "Updated Contact" } });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.click(screen.getByRole("button", { name: /Open/ }));

    expect(onUpdate).toHaveBeenCalledWith("personal", expect.objectContaining({ name: "Updated Name" }));
    expect(onUpdate).toHaveBeenCalledWith("astrology", expect.objectContaining({ rashi: "kumbha" }));
    expect(onUpdate).toHaveBeenCalledWith("family", expect.objectContaining({ sibling_count: 2 }));
    expect(onUpdate).toHaveBeenCalledWith("contact", expect.objectContaining({
      contacts: [expect.objectContaining({ name: "Updated Contact" })],
    }));
    expect(onUpdate).toHaveBeenCalledWith("style", expect.objectContaining({
      appearance: "dark",
      theme_color: "#121a21",
      template_name: "Celestial Union",
    }));
    expect(onUpdate).toHaveBeenCalledWith("privacy_mode", "open");
  });

  it("renders a safe minimal draft and grows dynamic sibling and contact groups", () => {
    const onUpdate = vi.fn();
    const minimal: PortfolioData = {
      privacy_mode: "private",
      personal: { name: "", dob: "", gender: "prefer_not_to_say" },
    };
    render(<BlueprintForm data={minimal} onUpdate={onUpdate} />);

    expect(screen.getByRole("button", { name: /Private/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByLabelText("Contact name")).toHaveLength(1);
    expect(screen.queryByText("Sibling 1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Number of siblings"), { target: { value: "1" } });
    expect(onUpdate).toHaveBeenCalledWith("family", expect.objectContaining({
      sibling_count: 1,
      siblings: [{}],
    }));
    fireEvent.click(screen.getByRole("button", { name: "Add another contact" }));
    expect(onUpdate).toHaveBeenCalledWith("contact", expect.objectContaining({
      contacts: expect.arrayContaining([expect.objectContaining({ relationship: "other" })]),
    }));
  });
});
