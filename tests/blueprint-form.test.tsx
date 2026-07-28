// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlueprintForm } from "../src/components/portfolio/BlueprintForm";
import type { PortfolioData } from "../src/types/portfolio";

const completeBlueprint: PortfolioData = {
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
    ancestral_origin: "Mysuru",
    current_settlement: "Bengaluru",
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
    specific_communities: "Open",
    location_preferences: "United States, India",
    location_preference: "United States, India",
    visa_preferences: "Citizen, H1B",
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
    >('input:not([type="checkbox"]), textarea')) {
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

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    for (const select of selects.filter((control) => !control.disabled)) {
      chooseDifferentOption(select);
    }

    const ownerAudience = selects.find((control) => control.disabled);
    expect(ownerAudience).toBeDefined();
    ownerAudience?.removeAttribute("disabled");
    if (ownerAudience) {
      fireEvent.change(ownerAudience, { target: { value: "public" } });
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
        "access",
        "astrology",
        "career",
        "education",
        "family",
        "lifestyle",
        "personal",
        "preferences",
        "style",
        "visibility",
        "vitals",
      ])
    );
    expect(onUpdate).toHaveBeenCalledWith(
      "personal",
      expect.objectContaining({
        country: "",
        current_location: "Boston, Massachusetts",
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
    expect(onUpdate).toHaveBeenCalledWith(
      "visibility",
      expect.objectContaining({ astrology_details: "restricted" })
    );
  });

  it("renders empty optional data and the legacy location preference fallback", () => {
    const onUpdate = vi.fn();
    const minimal: PortfolioData = {
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
