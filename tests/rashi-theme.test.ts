import { describe, expect, it } from "vitest";
import {
  DARK_FONT_COLOR,
  LIGHT_FONT_COLOR,
  PORTFOLIO_HERO_SURFACE_COLOR,
  RASHI_THEMES,
  contrastRatio,
  getDefaultRashiPalette,
  getRashiPalette,
  getRashiPalettes,
  resolveForeground,
  resolveRashiTheme,
} from "../src/features/portfolio/rashi-theme";

describe("rashi theme catalog", () => {
  it("provides curated palettes and constellation assets for all twelve rashis", () => {
    expect(Object.keys(RASHI_THEMES)).toHaveLength(12);

    for (const [rashi, theme] of Object.entries(RASHI_THEMES)) {
      expect(theme.constellationPath).toBe(`/constellations/${rashi}.svg`);
      expect(theme.palettes.length).toBeGreaterThanOrEqual(3);
      expect(theme.palettes.every((palette) => palette.background.startsWith("#"))).toBe(true);
    }
  });

  it("only returns palettes from the selected rashi", () => {
    expect(getRashiPalettes("tula").map((palette) => palette.id)).toEqual([
      "tula-pastel-pink",
      "tula-cream",
      "tula-black",
    ]);
    expect(getRashiPalettes("unknown")).toEqual([]);
    expect(getDefaultRashiPalette("mesha")?.id).toBe("mesha-rust");
    expect(getRashiPalette("tula-cream", "tula")?.label).toBe("Cream");
    expect(getRashiPalette("tula-cream", "mesha")).toBeNull();
  });
});

describe("rashi theme contrast", () => {
  it("uses dark text on light backgrounds and light text on dark backgrounds", () => {
    expect(resolveForeground("#fff5df")).toMatchObject({
      foreground: DARK_FONT_COLOR,
      isLightBackground: true,
    });
    expect(resolveForeground("#4a2744")).toMatchObject({
      foreground: LIGHT_FONT_COLOR,
      isLightBackground: false,
    });
  });

  it("resolves semantic theme values from a persisted palette and legacy background", () => {
    expect(resolveRashiTheme({ rashi: "tula", paletteId: "tula-black" })).toMatchObject({
      background: "#1b1a1c",
      foreground: LIGHT_FONT_COLOR,
      constellationPath: "/constellations/tula.svg",
    });
    expect(resolveRashiTheme({ rashi: "karka", backgroundColor: "#b8dfd2" })).toMatchObject({
      background: "#b8dfd2",
      foreground: DARK_FONT_COLOR,
      constellationPath: "/constellations/karka.svg",
    });
  });

  it("resolves separate readable accents for the page surface and dark hero", () => {
    expect(
      resolveRashiTheme({
        rashi: "kanya",
        paletteId: "kanya-peach",
        backgroundColor: "#f2c6a7",
      })
    ).toMatchObject({
      accentOnSurface: DARK_FONT_COLOR,
      accentOnHero: "#688db1",
    });
  });

  it("falls back to a readable midnight theme for invalid persisted values", () => {
    expect(resolveRashiTheme({ rashi: "not-a-rashi", backgroundColor: "blue" })).toMatchObject({
      background: "#17151c",
      foreground: LIGHT_FONT_COLOR,
      constellationPath: null,
    });
  });

  it("keeps every selectable background above the body-text contrast threshold", () => {
    for (const [rashi, theme] of Object.entries(RASHI_THEMES)) {
      for (const palette of theme.palettes) {
        expect(resolveForeground(palette.background).contrast, palette.id).toBeGreaterThanOrEqual(4.5);
        const resolved = resolveRashiTheme({
          rashi,
          paletteId: palette.id,
        });
        expect(
          contrastRatio(resolved.accentOnSurface, resolved.background),
          `${palette.id} surface accent`
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(resolved.accentOnHero, PORTFOLIO_HERO_SURFACE_COLOR),
          `${palette.id} hero accent`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
