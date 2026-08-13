// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdaptivePortfolioGallery,
  AdaptivePortfolioHero,
} from "../src/components/templates/AdaptivePortfolioMedia";
import { BiodataTemplate } from "../src/components/templates";
import CelestialUnion from "../src/components/templates/CelestialUnion";
import type { PortfolioPhoto } from "../src/features/media/portfolio-photo";
import { createPublicPortfolioSnapshot } from "../src/features/portfolio/server/public-snapshot.service";
import { createApprovedPortfolioSnapshot } from "../src/features/portfolio/server/approved-snapshot.service";
import type { PortfolioData } from "../src/types/portfolio";

const complete: PortfolioData = {
  personal: {
    name: "Aditi Rao",
    preferred_name: "Aditi",
    dob: "1996-08-12",
    gender: "female",
    current_location: "Boston",
    immigration_status: "H-1B",
    marital_status: "Never Married",
    citizenship: "India",
    religion: "Hindu",
    sub_community: "Smartha",
    community: "Brahmin",
    short_bio: "Warm, grounded, and curious about the world.",
    profile_summary: "A thoughtful introduction",
    shared_life_plans: "A warm home, shared purpose, and room to grow together.",
  },
  vitals: { height: "5 ft 5 in", complexion: "Fair", gotra: "Kashyap" },
  astrology: {
    rashi: "kanya",
    nakshatra: "Uttara Phalguni",
    pada: "2",
    time_of_birth: "09:15",
    lagnam: "Mithuna",
    maternal_gotra: "Bharadwaj",
    manglik_status: "No",
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
    sibling_count: 1,
    sibling_position: "Oldest",
  },
  lifestyle: { hobbies: "Reading, Travel", languages: "English, Hindi", diet: "Vegetarian", drinking: "Never", smoking: "Never", values_statement: "Kindness, Mutual respect" },
  preferences: {
    narrative: "A kind and curious partnership",
    marriage_timeline: "Within 1–2 years",
    children_preference: "Open and undecided",
    career_after_marriage: "Both careers should be supported equally",
    living_arrangement: "Near family, in a separate home",
    family_responsibilities: "Shared equally as a couple",
  },
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
        accessMode="public"
        photos={photos}
      />
    );

    expect(screen.getByRole("heading", { name: "Aditi Rao" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Education and career" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Family" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "More can be shared after approval." })).toBeInTheDocument();
    expect(screen.getByText(/Engineer.*Boston.*\d+/)).toBeInTheDocument();
    expect(within(screen.getByLabelText("At a glance")).getByText(/Kanya \(Virgo\)/)).toBeInTheDocument();
    expect(screen.getByText("Warm, grounded, and curious about the world.")).toBeInTheDocument();
    expect(screen.getByText("English, Hindi")).toBeInTheDocument();
    expect(screen.getByText("Kindness, Mutual respect")).toBeInTheDocument();
    expect(screen.getByText("Never Married")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("Hindu")).toBeInTheDocument();
    expect(screen.getByText("Smartha")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Personal details" })).not.toBeInTheDocument();
    const personalStory = document.getElementById("personal-story");
    const lifestyle = document.getElementById("lifestyle");
    expect(personalStory).toBeTruthy();
    expect(lifestyle).toBeTruthy();
    expect(within(personalStory!).getByText("Languages spoken")).toBeInTheDocument();
    expect(within(personalStory!).getByText("Values")).toBeInTheDocument();
    expect(within(personalStory!).getByText("Values").closest(".portfolio-personal-values")).toBeTruthy();
    expect(within(lifestyle!).queryByText("Languages spoken")).not.toBeInTheDocument();
    expect(within(lifestyle!).queryByText("Values")).not.toBeInTheDocument();
    expect(within(lifestyle!).getByText("Diet")).toBeInTheDocument();
    expect(within(lifestyle!).getByText("Drinking")).toBeInTheDocument();
    expect(within(lifestyle!).getByText("Smoking")).toBeInTheDocument();
    expect(within(lifestyle!).queryByRole("heading", { name: "Lifestyle" })).not.toBeInTheDocument();
    const lifestyleDetails = lifestyle!.querySelector(".portfolio-lifestyle-details");
    const interests = within(lifestyle!).getByRole("heading", { name: "Interests" });
    expect(lifestyleDetails).toBeTruthy();
    expect(lifestyleDetails!.compareDocumentPosition(interests) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector(".portfolio-contact-assurance")).not.toBeInTheDocument();
    expect(screen.getByText("H-1B")).toBeInTheDocument();
    expect(screen.getByText("Brahmin")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Oldest")).toBeInTheDocument();
    expect(screen.getByText("Bharadwaj")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Explore profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "How privacy works" })).not.toBeInTheDocument();
    expect(screen.queryByText("1996-08-12")).not.toBeInTheDocument();
    expect(screen.queryByText("Fair")).not.toBeInTheDocument();
    expect(screen.getByText("Kashyap")).toBeInTheDocument();
    expect(screen.queryByText(/Ramesh Rao/)).not.toBeInTheDocument();
    expect(screen.queryByText("family@example.com")).not.toBeInTheDocument();
    expect(screen.getByAltText("Landscape")).toBeInTheDocument();
    const pairedRows = document.querySelectorAll(".portfolio-chapter-pair");
    expect(pairedRows).toHaveLength(2);
    expect(pairedRows[0].children).toHaveLength(2);
    expect(pairedRows[1].children).toHaveLength(2);
    const trailingChapters = document.querySelectorAll(".portfolio-chapters-trailing > .portfolio-chapter");
    expect(Array.from(trailingChapters, (chapter) => chapter.id)).toEqual(["preferences", "shared-life"]);
    expect(trailingChapters[0].children).toHaveLength(3);
    expect(trailingChapters[1].children).toHaveLength(3);
    expect(document.querySelector("#preferences .portfolio-long-copy")).toBeTruthy();
    expect(document.querySelector("#shared-life .portfolio-long-copy")).toBeTruthy();
    const gallery = document.querySelector(".portfolio-gallery");
    const preferences = document.getElementById("preferences");
    expect(gallery).toBeTruthy();
    expect(preferences).toBeTruthy();
    expect(gallery!.compareDocumentPosition(preferences!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the separate horoscope attachment only in an approved projection", () => {
    const attachment = {
      href: "/p/token/horoscope",
      formatLabel: "PDF document",
      languageLabel: "Kannada",
      pageCount: 3,
    };
    const { rerender } = render(
      <CelestialUnion data={createApprovedPortfolioSnapshot(complete)} themeColor="" sunSign="kanya" accessMode="approved" horoscopeAttachment={attachment} />
    );
    expect(screen.getByText("Full Approved View")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Personal details" })).not.toBeInTheDocument();
    const approvedPersonalStory = document.getElementById("personal-story");
    expect(approvedPersonalStory).toBeTruthy();
    expect(within(approvedPersonalStory!).getByText("Never Married")).toBeInTheDocument();
    expect(within(approvedPersonalStory!).getByText("Languages spoken")).toBeInTheDocument();
    expect(within(approvedPersonalStory!).getByText("Values")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /original horoscope/i })).toHaveAttribute("href", "/p/token/horoscope");
    expect(screen.getByText("PDF document · Kannada · 3 pages")).toBeInTheDocument();
    expect(screen.getByText("Ramesh Rao · Architect")).toBeInTheDocument();
    expect(screen.getByText("Kashyap")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Future plans" })).toBeInTheDocument();
    expect(screen.getByText("Near family, in a separate home")).toBeInTheDocument();
    expect(screen.queryByText("family@example.com")).not.toBeInTheDocument();

    rerender(<CelestialUnion data={createPublicPortfolioSnapshot(complete)} themeColor="" sunSign="kanya" accessMode="public" />);
    expect(screen.queryByRole("link", { name: /original horoscope/i })).not.toBeInTheDocument();
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

  it("uses the accessible zodiac fact and fixed dark design tokens", () => {
    const { container } = render(
      <CelestialUnion data={{ ...complete, style: { appearance: "dark" } }} themeColor="#ffffff" sunSign="kanya" photos={photos} />
    );
    expect(container.querySelector('[data-appearance="dark"]')).toBeTruthy();
    expect(within(screen.getByLabelText("At a glance")).getByText(/Kanya \(Virgo\)/)).toBeInTheDocument();
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

  it("clears stale fields while rerendering Private and Balanced modes", () => {
    const privateData = createPublicPortfolioSnapshot({ ...complete, privacy_mode: "private" });
    const balancedData = createPublicPortfolioSnapshot({ ...complete, privacy_mode: "balanced" });
    const balancedFamilyData = createPublicPortfolioSnapshot({
      ...complete,
      privacy_mode: "balanced",
      family: {
        ...complete.family,
        public_summary: "A close-knit family with roots in Karnataka.",
        paternal_origin: "Mysuru",
        maternal_origin: "Bengaluru",
      },
    });
    const { container, rerender } = render(
      <CelestialUnion data={privateData} themeColor="" sunSign="kanya" accessMode="public" photos={photos} />
    );

    expect(container.querySelector('[data-privacy-mode="private"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Education and career" })).toBeInTheDocument();
    expect(screen.queryByText(/Education and career information exists/)).not.toBeInTheDocument();
    expect(screen.queryByText("Northeastern · 2020")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("At a glance")).getByText(/Kanya \(Virgo\)/)).toBeInTheDocument();
    expect(screen.getByText("Uttara Phalguni")).toBeInTheDocument();
    expect(screen.queryByText("Kashyap")).not.toBeInTheDocument();
    expect(screen.queryByText("Bharadwaj")).not.toBeInTheDocument();
    expect(screen.getByText("Never Married")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("Hindu")).toBeInTheDocument();
    expect(screen.getByText("Smartha")).toBeInTheDocument();
    expect(screen.queryByText("Drinking")).not.toBeInTheDocument();
    expect(screen.queryByText("Smoking")).not.toBeInTheDocument();

    rerender(<CelestialUnion data={balancedData} themeColor="" sunSign="kanya" accessMode="public" photos={photos} />);
    expect(container.querySelector('[data-privacy-mode="balanced"]')).toBeTruthy();
    expect(screen.getByText("Never Married")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("Hindu")).toBeInTheDocument();
    expect(screen.getByText("Smartha")).toBeInTheDocument();
    expect(screen.getByText("Northeastern · 2020")).toBeInTheDocument();
    expect(screen.getByText("Drinking")).toBeInTheDocument();
    expect(screen.getByText("Smoking")).toBeInTheDocument();
    expect(within(screen.getByLabelText("At a glance")).getByText(/Kanya \(Virgo\)/)).toBeInTheDocument();
    expect(screen.queryByText("A close-knit family with roots in Karnataka.")).not.toBeInTheDocument();

    rerender(<CelestialUnion data={balancedFamilyData} themeColor="" sunSign="kanya" accessMode="public" photos={photos} />);
    expect(container.querySelector('[data-privacy-mode="balanced"]')).toBeTruthy();
    expect(screen.getByText("A close-knit family with roots in Karnataka.")).toBeInTheDocument();

    rerender(<CelestialUnion data={privateData} themeColor="" sunSign="kanya" accessMode="public" photos={photos} />);
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
    expect(container.querySelector('.portfolio-gallery-feature img[data-orientation="landscape"]')).toBeTruthy();
  });

  it("navigates and wraps the adaptive hero slideshow without autoplay", () => {
    vi.useFakeTimers();
    render(<AdaptivePortfolioHero photos={photos} />);
    fireEvent.click(screen.getByRole("button", { name: /next photo/i }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /previous photo/i }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("omits an empty gallery", () => {
    const { container } = render(<AdaptivePortfolioGallery photos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens and closes a clear gallery photo in the full-screen viewer", () => {
    render(<AdaptivePortfolioGallery photos={[photos[1]]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Landscape full screen" }));
    expect(screen.getByRole("dialog", { name: "Gallery photo viewer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close full-screen photo" }));
    expect(screen.queryByRole("dialog", { name: "Gallery photo viewer" })).not.toBeInTheDocument();
  });

  it("labels protected gallery derivatives without hiding the photo slot", () => {
    const protectedPhoto: PortfolioPhoto = {
      ...photos[1],
      presentation: "blurred",
    };
    const { container } = render(<AdaptivePortfolioGallery photos={[protectedPhoto]} />);

    expect(screen.queryByAltText(protectedPhoto.alt)).not.toBeInTheDocument();
    expect(screen.getByText("Photo shared after approval")).toBeInTheDocument();
    expect(
      container.querySelector('.portfolio-gallery-feature[data-presentation="blurred"]')
    ).toBeTruthy();
  });

  it("shows visible-to-all photos before protected photos while preserving each group order", () => {
    const protectedFirst: PortfolioPhoto = {
      ...photos[1],
      id: "protected-first",
      alt: "Protected first",
      presentation: "blurred",
    };
    const visibleSecond: PortfolioPhoto = {
      ...photos[1],
      id: "visible-second",
      alt: "Visible second",
      presentation: "clear",
    };
    const visibleThird: PortfolioPhoto = {
      ...photos[1],
      id: "visible-third",
      alt: "Visible third",
      presentation: "clear",
    };

    render(<AdaptivePortfolioGallery photos={[protectedFirst, visibleSecond, visibleThird]} />);

    expect(screen.getByAltText("Visible second")).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show photo 1" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Show photo 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Photo 3, shared after approval" })).toBeInTheDocument();
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
    expect(container.querySelector('.portfolio-gallery-feature img[data-orientation="landscape"]')).toBeTruthy();
  });
});
