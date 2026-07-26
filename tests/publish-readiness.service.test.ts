import { describe, expect, it } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";
import {
  PortfolioPublishReadinessError,
  requirePortfolioPublishReadiness,
} from "../src/features/portfolio/server/publish-readiness.service";

const readyPortfolio: PortfolioData = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
  astrology: { rashi: "kanya" },
  style: { rashi_palette: "kanya-midnight", theme_color: "#17151c" },
};

describe("portfolio publish readiness", () => {
  it("accepts core profile data with a rashi theme and public hero photo", () => {
    expect(() =>
      requirePortfolioPublishReadiness({ data: readyPortfolio, hasPublicHeroPhoto: true })
    ).not.toThrow();
  });

  it.each([
    [
      { ...readyPortfolio, personal: { ...readyPortfolio.personal, name: "" } },
      true,
      "Add your name",
    ],
    [
      { ...readyPortfolio, astrology: {} },
      true,
      "Choose your rashi",
    ],
    [
      { ...readyPortfolio, style: {} },
      true,
      "Choose a rashi colour theme",
    ],
    [readyPortfolio, false, "Choose one profile photo"],
  ] as const)("rejects incomplete public generation state", (data, hasPublicHeroPhoto, message) => {
    expect(() => requirePortfolioPublishReadiness({ data, hasPublicHeroPhoto })).toThrow(
      PortfolioPublishReadinessError
    );
    expect(() => requirePortfolioPublishReadiness({ data, hasPublicHeroPhoto })).toThrow(message);
  });
});
