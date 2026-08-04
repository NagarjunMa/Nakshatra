// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdaptivePortfolioGallery,
  AdaptivePortfolioHero,
} from "../src/components/templates/AdaptivePortfolioMedia";
import { BiodataTemplate } from "../src/components/templates";
import CelestialUnion from "../src/components/templates/CelestialUnion";
import type { PortfolioPhoto } from "../src/features/media/portfolio-photo";
import { createPublicPortfolioSnapshot } from "../src/features/portfolio/server/public-snapshot.service";
import type { PortfolioData } from "../src/types/portfolio";

const complete: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    preferred_name: "Aditi",
    dob: "1996-08-12",
    gender: "female",
    current_location: "Boston",
    profile_summary: "A thoughtful introduction",
  },
  vitals: { height: "5 ft 5 in", complexion: "Fair", gotra: "Kashyap" },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    pada: "2",
    time_of_birth: "09:15",
    lagnam: "Mithuna",
  },
  education: { degree: "MS", institution: "Northeastern", year: "2020" },
  career: { title: "Engineer", company: "Nakshatra", location: "Boston" },
  family: {
    father: { name: "Ramesh Rao", occupation: "Architect" },
    mother: { name: "Meera Rao", occupation: "Teacher" },
    siblings: [{ name: "Kiran Rao", occupation: "Doctor" }],
    ancestral_origin: "Mysuru",
    current_city: "Bengaluru",
    current_region: "Karnataka",
    current_country: "India",
    family_note: "Close-knit",
  },
  lifestyle: { hobbies: "Reading, Travel", diet: "Vegetarian", music: "Classical" },
  preferences: { narrative: "A kind and curious partnership" },
  contact: {
    contact_person: "Ramesh Rao",
    phone: "+91 90000 00000",
    email: "family@example.com",
    secure_note: "Please introduce yourself first.",
  },
  style: { template_name: "Celestial Union", theme_color: "#17151c", rashi_palette: "kanya-black" },
  visibility: { family: "restricted", astrology_details: "restricted", gallery: "public", contact: "restricted" },
};

const photos: PortfolioPhoto[] = [
  {
    id: "hero",
    src: "https://example.test/hero.webp",
    alt: "Portrait",
    mediaType: "hero",
    width: 900,
    height: 1200,
    aspectRatio: 0.75,
    orientation: "portrait",
  },
  {
    id: "gallery",
    src: "https://example.test/gallery.webp",
    alt: "Landscape",
    mediaType: "gallery",
    width: 1600,
    height: 900,
    aspectRatio: 16 / 9,
    orientation: "landscape",
  },
];

describe("celestial union portfolio", () => {
  it("uses the canonical template for legacy and unknown template IDs", () => {
    const { container, rerender } = render(
      <BiodataTemplate templateId={3} data={complete} themeColor="#17151c" sunSign="kanya" photos={photos} />
    );
    expect(container.querySelector('[data-template="celestial-union"]')).toBeTruthy();

    rerender(
      <BiodataTemplate templateId={999} data={complete} themeColor="#17151c" sunSign="kanya" photos={photos} />
    );
    expect(container.querySelector('[data-template="celestial-union"]')).toBeTruthy();
  });

  it("renders the approved hierarchy without leaking protected values", () => {
    const publicData = createPublicPortfolioSnapshot(complete);
    render(
      <CelestialUnion
        data={publicData}
        themeColor="#17151c"
        sunSign="kanya"
        accessMode="restricted"
        photos={photos}
      />
    );

    expect(screen.getByRole("heading", { name: "Aditi Rao" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Education and career" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Family" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "More can be shared after approval." })).toBeInTheDocument();
    expect(screen.getByLabelText("Rashi: Kanya (Virgo)")).toHaveTextContent("Kanya");
    expect(screen.queryByText("1996-08-12")).not.toBeInTheDocument();
    expect(screen.queryByText("Fair")).not.toBeInTheDocument();
    expect(screen.queryByText("Kashyap")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ramesh Rao/)).not.toBeInTheDocument();
    expect(screen.queryByText("family@example.com")).not.toBeInTheDocument();
    expect(screen.getByAltText("Landscape")).toBeInTheDocument();
  });

  it("renders family and contact values for the full owner preview", () => {
    render(
      <CelestialUnion
        data={complete}
        themeColor="#f2c6a7"
        sunSign="kanya"
        photos={photos}
      />
    );

    expect(screen.getByText("Ramesh Rao · Architect")).toBeInTheDocument();
    expect(screen.getByText("Meera Rao · Teacher")).toBeInTheDocument();
    expect(screen.getByText("Kiran Rao · Doctor")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru · Karnataka · India")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Protected information preview" })).toBeInTheDocument();
    expect(screen.getByText("+91 90000 00000")).toBeInTheDocument();
    expect(screen.getByText("family@example.com")).toBeInTheDocument();
  });

  it("uses the accessible zodiac badge and fixed dark design tokens", () => {
    const { container } = render(
      <CelestialUnion data={{ ...complete, style: { appearance: "dark" } }} themeColor="#ffffff" sunSign="kanya" photos={photos} />
    );
    expect(container.querySelector('[data-appearance="dark"]')).toBeTruthy();
    expect(screen.getByLabelText("Rashi: Kanya (Virgo)")).toHaveTextContent("Kanya");
    expect(container.querySelector(".portfolio-root")).toHaveStyle({ "--portfolio-background": "#121a21" });
  });

  it("preserves the legacy owner portrait when no media hero exists", () => {
    render(
      <CelestialUnion
        data={{
          ...complete,
          personal: {
            ...complete.personal,
            photo_url: "https://example.test/legacy-owner.webp",
          },
        }}
        themeColor="#f2c6a7"
        sunSign="kanya"
        photos={[photos[1]]}
      />
    );

    expect(screen.getByAltText("Aditi Rao portrait")).toHaveAttribute(
      "src",
      "https://example.test/legacy-owner.webp"
    );
  });

  it("ignores malformed persisted dates without inventing an age", () => {
    render(
      <CelestialUnion
        data={{
          ...complete,
          personal: { ...complete.personal, dob: "2026-13-01" },
        }}
        themeColor="#f2c6a7"
        sunSign="kanya"
      />
    );

    expect(screen.queryByText("2026-13-01")).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("renders minimal data without optional sections", () => {
    render(
      <BiodataTemplate
        templateId={1}
        data={{ personal: { name: "Minimal", dob: "2000-01-01", gender: "male" } }}
        themeColor=""
        sunSign={null}
      />
    );
    expect(screen.getByRole("heading", { name: "Minimal" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Education and career" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Family" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "More can be shared after approval." })).not.toBeInTheDocument();
  });

  it("clears stale fields while rerendering Private, Balanced, and Open modes", () => {
    const privateData = createPublicPortfolioSnapshot({ ...complete, privacy_mode: "private" });
    const balancedData = createPublicPortfolioSnapshot({ ...complete, privacy_mode: "progressive" });
    const openData = createPublicPortfolioSnapshot({
      ...complete,
      privacy_mode: "open",
      family: {
        ...complete.family,
        public_summary: "A close-knit family with roots in Karnataka.",
        paternal_origin: "Mysuru",
        maternal_origin: "Bengaluru",
      },
    });
    const { container, rerender } = render(
      <CelestialUnion data={privateData} themeColor="" sunSign="kanya" accessMode="restricted" photos={photos} />
    );

    expect(container.querySelector('[data-privacy-mode="private"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Education and career" })).toBeInTheDocument();
    expect(screen.getByText(/Education and career information exists/)).toBeInTheDocument();
    expect(screen.queryByText("Northeastern · 2020")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Rashi: Kanya (Virgo)")).not.toBeInTheDocument();

    rerender(<CelestialUnion data={balancedData} themeColor="" sunSign="kanya" accessMode="restricted" photos={photos} />);
    expect(container.querySelector('[data-privacy-mode="progressive"]')).toBeTruthy();
    expect(screen.getByText("Northeastern · 2020")).toBeInTheDocument();
    expect(screen.getByLabelText("Rashi: Kanya (Virgo)")).toBeInTheDocument();
    expect(screen.queryByText("A close-knit family with roots in Karnataka.")).not.toBeInTheDocument();

    rerender(<CelestialUnion data={openData} themeColor="" sunSign="kanya" accessMode="restricted" photos={photos} />);
    expect(container.querySelector('[data-privacy-mode="open"]')).toBeTruthy();
    expect(screen.getByText("A close-knit family with roots in Karnataka.")).toBeInTheDocument();

    rerender(<CelestialUnion data={privateData} themeColor="" sunSign="kanya" accessMode="restricted" photos={photos} />);
    expect(screen.queryByText("A close-knit family with roots in Karnataka.")).not.toBeInTheDocument();
    expect(screen.queryByText("Northeastern · 2020")).not.toBeInTheDocument();
  });
});

describe("adaptive portfolio media", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps orientation metadata on hero and gallery elements", () => {
    const { container } = render(
      <CelestialUnion data={complete} themeColor="#17151c" sunSign="kanya" photos={photos} />
    );
    expect(container.querySelector('.portfolio-hero-media[data-orientation="portrait"]')).toBeTruthy();
    expect(container.querySelector('.portfolio-gallery-item[data-orientation="landscape"]')).toBeTruthy();
  });

  it("navigates, wraps, and advances the adaptive hero slideshow component", () => {
    vi.useFakeTimers();
    render(<AdaptivePortfolioHero photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: /next photo/i }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous photo/i }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("omits an empty gallery", () => {
    const { container } = render(<AdaptivePortfolioGallery photos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels protected gallery derivatives without hiding the photo slot", () => {
    const protectedPhoto: PortfolioPhoto = {
      ...photos[1],
      presentation: "blurred",
    };
    const { container } = render(<AdaptivePortfolioGallery photos={[protectedPhoto]} />);

    expect(screen.getByAltText(protectedPhoto.alt)).toBeInTheDocument();
    expect(screen.getByText("Photo shared after approval")).toBeInTheDocument();
    expect(
      container.querySelector('.portfolio-gallery-item[data-presentation="blurred"]')
    ).toBeTruthy();
  });

  it("detects orientation for legacy photos without stored dimensions", () => {
    const legacyHero: PortfolioPhoto = {
      id: "legacy-hero",
      src: "https://example.test/legacy-hero.webp",
      alt: "Legacy portrait",
      mediaType: "hero",
      orientation: "unknown",
    };
    const legacyGallery: PortfolioPhoto = {
      id: "legacy-gallery",
      src: "https://example.test/legacy-gallery.webp",
      alt: "Legacy landscape",
      mediaType: "gallery",
      orientation: "unknown",
    };
    const { container } = render(
      <>
        <AdaptivePortfolioHero photos={[legacyHero]} />
        <AdaptivePortfolioGallery photos={[legacyGallery]} />
      </>
    );

    const heroImage = screen.getByAltText("Legacy portrait");
    Object.defineProperties(heroImage, {
      naturalWidth: { value: 800 },
      naturalHeight: { value: 1200 },
    });
    fireEvent.load(heroImage);

    const galleryImage = screen.getByAltText("Legacy landscape");
    Object.defineProperties(galleryImage, {
      naturalWidth: { value: 1600 },
      naturalHeight: { value: 900 },
    });
    fireEvent.load(galleryImage);

    expect(container.querySelector('.portfolio-hero-media[data-orientation="portrait"]')).toBeTruthy();
    expect(container.querySelector('.portfolio-gallery-item[data-orientation="landscape"]')).toBeTruthy();
  });
});
