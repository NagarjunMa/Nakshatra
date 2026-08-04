// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
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
    short_bio: "Warm, grounded, and curious.",
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
  career: { title: "Engineer", company: "Nakshatra", location: "Boston", annual_income: "100k-125k", income_currency: "USD" },
  family: {
    father: { name: "Rao", occupation: "Engineer" },
    mother: { name: "Lakshmi", occupation: "Teacher" },
    paternal_origin: "Mysuru",
    maternal_origin: "Bengaluru",
    sibling_count: 1,
    siblings: [{ name: "Maya", occupation: "Designer" }],
  },
  lifestyle: { languages: "English, Telugu", hobbies: "Reading" },
  preferences: { narrative: "A kind and curious partnership", age_range: "24–28", height_range: `5'0"–5'8"` },
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
    fireEvent.change(screen.getByLabelText("Short introduction"), { target: { value: "A concise new bio" } });
    fireEvent.click(screen.getByRole("button", { name: /Astrology/ }));
    fireEvent.change(screen.getByLabelText("Rashi"), { target: { value: "kumbha" } });
    fireEvent.click(screen.getByRole("button", { name: /Family/ }));
    fireEvent.change(screen.getByLabelText("Number of siblings"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Privacy & contact/ }));
    fireEvent.change(screen.getAllByLabelText("Name of contact")[0], { target: { value: "Updated Contact" } });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.click(screen.getByRole("button", { name: /Open/ }));

    expect(onUpdate).toHaveBeenCalledWith("personal", expect.objectContaining({ name: "Updated Name" }));
    expect(onUpdate).toHaveBeenCalledWith("personal", expect.objectContaining({ short_bio: "A concise new bio" }));
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

    expect(screen.getByText(/1 of 6 essentials complete/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Privacy & contact/ }));
    expect(screen.getByRole("button", { name: /Private/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Name of contact")).not.toBeInTheDocument();
    expect(screen.getByText(/Add a preferred contact only if you want one ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Family/ }));
    expect(screen.queryByText("Sibling 1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Number of siblings"), { target: { value: "1" } });
    expect(onUpdate).toHaveBeenCalledWith("family", expect.objectContaining({
      sibling_count: 1,
      siblings: [{}],
    }));
    fireEvent.click(screen.getByRole("button", { name: /Privacy & contact/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add a protected contact" }));
    expect(onUpdate).toHaveBeenCalledWith("contact", expect.objectContaining({
      contacts: [expect.objectContaining({ relationship: "self" })],
    }));
  });

  it("explains audience, supports chips, and reveals conditional preferences", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<BlueprintForm data={completeBlueprint} onUpdate={onUpdate} />);

    const sectionNavigation = screen.getByRole("navigation", { name: "Portfolio form sections" });
    const sectionLabels = within(sectionNavigation).getAllByRole("button").map((button) => button.textContent);
    expect(sectionLabels.slice(3, 6)).toEqual(["04Family", "05Astrology", "06Lifestyle"]);
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Education & work/ }));
    fireEvent.change(screen.getByLabelText("Annual income range"), { target: { value: "125k-150k" } });
    expect(onUpdate).toHaveBeenCalledWith("career", expect.objectContaining({ annual_income: "125k-150k" }));

    fireEvent.click(screen.getByRole("button", { name: /Lifestyle/ }));
    fireEvent.change(screen.getByLabelText("Languages"), { target: { value: "Kannada" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);
    expect(onUpdate).toHaveBeenCalledWith("lifestyle", expect.objectContaining({
      languages: "English, Telugu, Kannada",
    }));
    fireEvent.focus(screen.getByLabelText("Interests and hobbies"));
    expect(screen.getByRole("listbox", { name: "Interests and hobbies suggestions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Photography" }));
    expect(onUpdate).toHaveBeenCalledWith("lifestyle", expect.objectContaining({
      hobbies: "Reading, Photography",
    }));

    fireEvent.click(screen.getByRole("button", { name: /Preferences/ }));
    fireEvent.change(screen.getByLabelText("Minimum age"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Maximum height"), { target: { value: `5'10"` } });
    expect(onUpdate).toHaveBeenCalledWith("preferences", expect.objectContaining({ age_range: "25–28" }));
    expect(onUpdate).toHaveBeenCalledWith("preferences", expect.objectContaining({ height_range: `5'0"–5'10"` }));
    expect(screen.queryByLabelText("Specific communities")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Community preference"), { target: { value: "specific" } });
    expect(onUpdate).toHaveBeenCalledWith("preferences", expect.objectContaining({ caste_preference: "specific" }));
    rerender(<BlueprintForm data={{ ...completeBlueprint, preferences: { ...completeBlueprint.preferences, caste_preference: "specific" } }} onUpdate={onUpdate} />);
    expect(screen.getByLabelText("Specific communities")).toBeInTheDocument();
  });
});
