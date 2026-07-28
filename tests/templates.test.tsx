// @vitest-environment jsdom

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    fill?: boolean;
    unoptimized?: boolean;
  }) => {
    const imageProps = { ...props };
    delete imageProps.priority;
    delete imageProps.fill;
    delete imageProps.unoptimized;
    return React.createElement("img", { alt: "", ...imageProps });
  },
}));

import { BiodataTemplate } from "../src/components/templates";
import CelestialUnion from "../src/components/templates/CelestialUnion";
import EditorialMatrimonial from "../src/components/templates/EditorialMatrimonial";
import RoyalHeritage from "../src/components/templates/RoyalHeritage";
import { HeroPhotoSlideshow } from "../src/components/templates/HeroPhotoSlideshow";

const complete: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    preferred_name: "Aditi",
    dob: "1996-08-12",
    gender: "female",
    photo_url: "https://example.test/aditi.webp",
    current_location: "Boston",
    place_of_birth: "Bengaluru",
    marital_status: "Never married",
    immigration_status: "H-1B",
    relocation_preference: "Open",
    profile_summary: "A thoughtful introduction",
  },
  vitals: { height: "5 ft 5 in", complexion: "Fair", gotra: "Kashyap" },
  astrology: { rashi: "kanya", nakshatra: "Uttara Phalguni", pada: "2", time_of_birth: "09:15", lagnam: "Mithuna", manglik_status: "No", maternal_gotra: "Bharadwaj" },
  education: { degree: "MS", institution: "Northeastern", year: "2020", location: "Boston", summary: "Engineering" },
  career: { title: "Engineer", company: "Nakshatra", location: "Boston", summary: "Technology" },
  family: { father: { name: "Rao", occupation: "Engineer" }, mother: { name: "Lakshmi", occupation: "Teacher" }, siblings: [{ name: "Maya", occupation: "Designer" }], ancestral_origin: "Mysuru", current_settlement: "Bengaluru", family_note: "Close-knit" },
  lifestyle: { hobbies: "Reading, Travel", languages: "Telugu, English", diet: "Vegetarian", smoking: "No", drinking: "No", music: "Classical", values_statement: "Kindness" },
  contact: { contact_person: "Rao", phone: "+1 555 0100", email: "family@example.com", secure_note: "Evenings" },
  preferences: { narrative: "Kind and curious", age_range: "28-32", height_range: "5-7", marital_status: "Never married", background: "Open", location_preference: "US" },
  style: { template_name: "Royal Heritage", theme_color: "#17151c", rashi_palette: "kanya-midnight" },
  visibility: { family: "restricted", astrology_details: "restricted", gallery: "restricted", contact: "restricted" },
};

describe("portfolio templates", () => {
  it.each([
    ["editorial", EditorialMatrimonial],
    ["celestial", CelestialUnion],
    ["royal", RoyalHeritage],
  ])("renders complete and restricted %s portfolios", (_name, Component) => {
    const { rerender } = render(<Component data={complete} themeColor="#17151c" sunSign="kanya" />);
    expect(screen.getAllByText("Aditi Rao").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Engineer/).length).toBeGreaterThan(0);
    rerender(<Component data={complete} themeColor="#17151c" sunSign="kanya" accessMode="restricted" />);
    expect(screen.getAllByText(/shared after approval|request/i).length).toBeGreaterThan(0);
  });

  it("selects every registered template and falls back to editorial", () => {
    const { container, rerender } = render(<BiodataTemplate templateId={3} data={complete} themeColor="#17151c" sunSign="kanya" />);
    expect(container.querySelector('[data-template="royal-heritage"]')).toBeTruthy();
    rerender(<BiodataTemplate templateId={2} data={complete} themeColor="#17151c" sunSign="kanya" />);
    expect(container.querySelector('[data-template="celestial-union"]')).toBeTruthy();
    rerender(<BiodataTemplate templateId={999} data={complete} themeColor="" sunSign={null} />);
    expect(container.querySelector('[data-template="editorial-matrimonial"]')).toBeTruthy();
  });

  it("renders minimal data without optional sections", () => {
    render(<BiodataTemplate templateId={3} data={{ personal: { name: "Minimal", dob: "2000-01-01", gender: "male" } }} themeColor="" sunSign={null} />);
    expect(screen.getByText("Minimal")).toBeInTheDocument();
  });
});

describe("hero slideshow", () => {
  const photos = [
    { id: "one", src: "https://example.test/one.webp", alt: "First portrait" },
    { id: "two", src: "https://example.test/two.webp", alt: "Second portrait" },
  ];

  afterEach(() => vi.useRealTimers());

  it("returns nothing for no photos and renders one photo without controls", () => {
    const { container, rerender } = render(<HeroPhotoSlideshow photos={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<HeroPhotoSlideshow photos={[photos[0]]} />);
    expect(screen.getByAltText("First portrait")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("navigates, wraps, and advances automatically", () => {
    vi.useFakeTimers();
    render(<HeroPhotoSlideshow photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/showing photo 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(/showing photo 1/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByText(/showing photo 2/i)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/showing photo 1/i)).toBeInTheDocument();
  });
});
