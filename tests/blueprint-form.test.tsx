// @vitest-environment jsdom

import React from "react";
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
    profile_summary: "A thoughtful introduction",
    long_term_goals: "Build a meaningful life",
    shared_life_plans: "Travel and create traditions",
    marital_status: "Never Married",
    country: "United States",
    region: "Massachusetts",
    city: "Boston",
    current_location: "Boston, Massachusetts, United States",
    citizenship: "India",
    immigration_status: "H1B",
    religion: "Hindu",
    community: "Telugu",
    sub_community: "Open",
    relocation_preference: "Discuss and decide",
    place_of_birth: "Bengaluru",
  },
  vitals: {
    height: `5'5"`,
    gotra: "Kashyap",
  },
  education: {
    qualification_level: "Master's Degree",
    degree: "Computer Science",
    institution: "Northeastern",
    location: "Boston",
  },
  career: {
    title: "Engineer",
    company: "Nakshatra",
    job_type: "Full-time",
    location: "Boston",
    annual_income: "150000",
    income_currency: "USD",
    wealth_stage: "Growing steadily",
    career_goals: "Build humane technology",
  },
  family: {
    father: { name: "Rao", occupation: "Engineer" },
    mother: { name: "Lakshmi", occupation: "Teacher" },
    sibling_count: 1,
    sibling_position: "Oldest",
    parents_location: "Bengaluru",
    current_country: "India",
    current_country_code: "IN",
    current_region: "Karnataka",
    current_region_code: "19",
    current_city: "Bengaluru",
    current_city_geoname_id: 1277333,
    ancestral_origin: "Mysuru",
    current_settlement: "Bengaluru",
    family_spread: "Across India and the US",
    family_note: "A close-knit family",
  },
  lifestyle: {
    diet: "Vegetarian",
    drinking: "Never",
    smoking: "Never",
    languages: "English, Telugu",
    hobbies: "Reading, Traveling",
    values_statement: "Kindness and curiosity",
  },
  preferences: {
    narrative: "A kind and curious partnership",
    age_range: "28-34",
    height_range: `5'4"-5'10"`,
    marital_status: "Never Married",
    horoscope_preference: "Flexible",
    caste_preference: "specific",
    specific_communities: "Open",
    location_preferences: "United States, India",
    location_preference: "United States, India",
    visa_preferences: "Citizen, H1B",
    religion_preference: "Hindu",
    lifestyle_expectations: "Kind and balanced",
    education_expectations: "Open",
    career_expectations: "Mutual support",
    private_notes: "Discuss privately",
    marriage_timeline: "Within the next 2 years",
    children_preference: "Open to discussion",
    wedding_expectations: "Discuss and decide together",
    gift_expectations: "No gifts expected",
    parent_support: "Discuss and decide together",
  },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    time_of_birth: "09:15",
    maternal_gotra: "Bharadwaj",
    manglik_status: "No",
  },
  style: {
    template_name: "Royal Heritage",
    rashi_palette: "kanya-peach",
    theme_color: "#f2c6a7",
  },
  visibility: {
    family: "restricted",
    astrology_details: "public",
    gallery: "restricted",
  },
  access: {
    journey: "public",
    personal: "approved",
    career: "public",
    family: "approved",
    lifestyle: "public",
    preferences: "broker",
    future_plans: "approved",
    astrology: "approved",
  },
};

function chooseDifferentOption(select: HTMLSelectElement) {
  const next = Array.from(select.options).find(
    (option) => option.value !== select.value
  );
  if (next) {
    fireEvent.change(select, { target: { value: next.value } });
  }
}

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

  it("routes every field, selector, palette, and privacy control to its section", () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <BlueprintForm data={completeBlueprint} onUpdate={onUpdate} />
    );

    const rashi = screen.getByLabelText("Rashi") as HTMLSelectElement;
    fireEvent.change(rashi, { target: { value: "" } });
    fireEvent.change(rashi, { target: { value: "mesha" } });
    fireEvent.change(rashi, { target: { value: "kanya" } });

    const siblingCount = screen.getByLabelText(
      "Number of siblings"
    ) as HTMLInputElement;
    fireEvent.change(siblingCount, { target: { value: "" } });
    fireEvent.change(siblingCount, { target: { value: "2" } });

    for (const control of container.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >('input:not([type="checkbox"]):not([type="search"]), textarea')) {
      const value =
        control instanceof HTMLInputElement && control.type === "date"
          ? "1990-01-01"
          : control instanceof HTMLInputElement && control.type === "time"
            ? "08:30"
            : control instanceof HTMLInputElement && control.type === "number"
              ? "3"
              : "Updated value";
      fireEvent.change(control, { target: { value } });
    }

    const languageSearch = screen.getByLabelText("Search Languages");
    fireEvent.change(languageSearch, { target: { value: "zzzz" } });
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
    fireEvent.change(languageSearch, { target: { value: "" } });

    const selects = screen
      .getAllByRole("combobox")
      .filter(
        (control): control is HTMLSelectElement =>
          control instanceof HTMLSelectElement
      );
    for (const select of selects.filter((control) => !control.disabled)) {
      chooseDifferentOption(select);
    }

    for (const fieldset of screen.getAllByRole("group")) {
      const checkboxes = within(fieldset).queryAllByRole("checkbox");
      if (checkboxes.length > 0) {
        const checked = checkboxes.find(
          (checkbox) => (checkbox as HTMLInputElement).checked
        );
        const unchecked = checkboxes.find(
          (checkbox) => !(checkbox as HTMLInputElement).checked
        );
        if (checked) fireEvent.click(checked);
        if (unchecked) fireEvent.click(unchecked);
      }
    }

    for (const checkbox of container.querySelectorAll<HTMLInputElement>(
      'label > input[type="checkbox"]'
    )) {
      fireEvent.click(checkbox);
    }

    for (const button of screen.getAllByRole("button")) {
      fireEvent.click(button);
    }

    const updatedSections = new Set(
      onUpdate.mock.calls.map(([section]) => section)
    );
    expect(updatedSections).toEqual(
      new Set([
        "astrology",
        "career",
        "education",
        "family",
        "lifestyle",
        "personal",
        "preferences",
        "privacy_mode",
        "style",
        "vitals",
      ])
    );
    expect(onUpdate).toHaveBeenCalledWith(
      "personal",
      expect.objectContaining({
        country: "",
        current_location: "",
      })
    );
    expect(onUpdate).toHaveBeenCalledWith(
      "family",
      expect.objectContaining({ sibling_count: undefined })
    );
    expect(onUpdate).toHaveBeenCalledWith(
      "family",
      expect.objectContaining({ sibling_count: 2 })
    );
    expect(onUpdate).toHaveBeenCalledWith("privacy_mode", "open");
  }, 10_000);

  it("renders empty optional data and the legacy location preference fallback", () => {
    const onUpdate = vi.fn();
    const minimal: PortfolioData = {
      privacy_mode: "private",
      personal: {
        name: "",
        dob: "",
        gender: "prefer_not_to_say",
      },
      preferences: {
        location_preference: "Canada",
      },
      visibility: {
        family: "public",
        astrology_details: "public",
        gallery: "public",
      },
    };

    const { rerender } = render(
      <BlueprintForm data={minimal} onUpdate={onUpdate} />
    );

    expect(screen.getByText("Select a rashi to reveal its portfolio colors.")).toBeInTheDocument();
    const preferredCountries = screen.getByRole("group", {
      name: "Preferred countries",
    });
    expect(
      within(preferredCountries).getByRole("checkbox", { name: "Canada" })
    ).toBeChecked();
    expect(screen.getAllByText("Choose one or more").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Private/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    rerender(
      <BlueprintForm
        data={{
          ...minimal,
          preferences: {
            location_preference: "",
            location_preferences: "",
          },
        }}
        onUpdate={onUpdate}
      />
    );

    expect(
      within(
        screen.getByRole("group", { name: "Preferred countries" })
      ).getByRole("checkbox", { name: "Canada" })
    ).not.toBeChecked();
  });
});
