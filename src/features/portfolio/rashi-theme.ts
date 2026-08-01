import type { RashiKey } from "@/types/portfolio";

export const DARK_FONT_COLOR = "#17151c";
export const LIGHT_FONT_COLOR = "#fffdf8";
export const PORTFOLIO_HERO_SURFACE_COLOR = "#111415";

export interface RashiPalette {
  id: string;
  label: string;
  background: string;
  accent: string;
}

export interface RashiTheme {
  label: string;
  constellationPath: string;
  palettes: readonly RashiPalette[];
}

export interface ResolvedRashiTheme {
  palette: RashiPalette;
  background: string;
  foreground: string;
  mutedForeground: string;
  accentOnSurface: string;
  accentOnHero: string;
  constellationPath: string | null;
  isLightBackground: boolean;
}

/**
 * Defines the portfolio palette choices for every rashi.
 * Input: a known RashiKey through the lookup helpers below. Output: branded, selectable background palettes.
 */
export const RASHI_THEMES: Record<RashiKey, RashiTheme> = {
  mesha: {
    label: "Mesha (Aries)",
    constellationPath: "/constellations/mesha.svg",
    palettes: [
      { id: "mesha-rust", label: "Rust", background: "#ce6841", accent: "#5a2034" },
      { id: "mesha-mustard", label: "Mustard", background: "#d6a03a", accent: "#542b18" },
      { id: "mesha-eggplant", label: "Eggplant", background: "#4a2744", accent: "#e5ab61" },
    ],
  },
  vrishabha: {
    label: "Vrishabha (Taurus)",
    constellationPath: "/constellations/vrishabha.svg",
    palettes: [
      { id: "vrishabha-beige", label: "Beige", background: "#e9dcc5", accent: "#496b4c" },
      { id: "vrishabha-pink", label: "Bubblegum Pink", background: "#db9aae", accent: "#375c3d" },
      { id: "vrishabha-black", label: "Black", background: "#1d1b1c", accent: "#9fcaa8" },
    ],
  },
  mithuna: {
    label: "Mithuna (Gemini)",
    constellationPath: "/constellations/mithuna.svg",
    palettes: [
      { id: "mithuna-light-green", label: "Light Green", background: "#c7e5be", accent: "#3d763f" },
      { id: "mithuna-rose", label: "Rose", background: "#e7bfc9", accent: "#36784f" },
      { id: "mithuna-white", label: "White", background: "#fffdf7", accent: "#3c8c55" },
    ],
  },
  karka: {
    label: "Karka (Cancer)",
    constellationPath: "/constellations/karka.svg",
    palettes: [
      { id: "karka-seafoam", label: "Seafoam Green", background: "#b8dfd2", accent: "#3e7892" },
      { id: "karka-blue", label: "Blue", background: "#759ccd", accent: "#c99536" },
      { id: "karka-mustard", label: "Mustard", background: "#d8ad47", accent: "#3e7892" },
    ],
  },
  simha: {
    label: "Simha (Leo)",
    constellationPath: "/constellations/simha.svg",
    palettes: [
      { id: "simha-pale-pink", label: "Pale Pink", background: "#f0c6d5", accent: "#6285d0" },
      { id: "simha-cornflower", label: "Cornflower Blue", background: "#6f8fd7", accent: "#f4d6df" },
      { id: "simha-white", label: "White", background: "#fffdf9", accent: "#6f8fd7" },
    ],
  },
  kanya: {
    label: "Kanya (Virgo)",
    constellationPath: "/constellations/kanya.svg",
    palettes: [
      { id: "kanya-peach", label: "Peach", background: "#f2c6a7", accent: "#688db1" },
      { id: "kanya-light-blue", label: "Light Blue", background: "#bbd9ef", accent: "#545454" },
      { id: "kanya-black", label: "Black", background: "#1b1b1b", accent: "#e8c6a4" },
    ],
  },
  tula: {
    label: "Tula (Libra)",
    constellationPath: "/constellations/tula.svg",
    palettes: [
      { id: "tula-pastel-pink", label: "Pastel Pink", background: "#edb7c6", accent: "#6a394b" },
      { id: "tula-cream", label: "Cream", background: "#fff5df", accent: "#6c516b" },
      { id: "tula-black", label: "Black", background: "#1b1a1c", accent: "#f0bbc9" },
    ],
  },
  vrishchika: {
    label: "Vrishchika (Scorpio)",
    constellationPath: "/constellations/vrishchika.svg",
    palettes: [
      { id: "vrishchika-violet", label: "Violet", background: "#582c83", accent: "#f1a856" },
      { id: "vrishchika-pomegranate", label: "Pomegranate", background: "#8d273c", accent: "#efad61" },
      { id: "vrishchika-burnt-orange", label: "Burnt Orange", background: "#b75b31", accent: "#4e286f" },
    ],
  },
  dhanu: {
    label: "Dhanu (Sagittarius)",
    constellationPath: "/constellations/dhanu.svg",
    palettes: [
      { id: "dhanu-saffron", label: "Saffron", background: "#ed9f23", accent: "#65412e" },
      { id: "dhanu-cornflower", label: "Cornflower Blue", background: "#7090d4", accent: "#f0ad38" },
      { id: "dhanu-sienna", label: "Sienna", background: "#98583e", accent: "#f0ad38" },
    ],
  },
  makara: {
    label: "Makara (Capricorn)",
    constellationPath: "/constellations/makara.svg",
    palettes: [
      { id: "makara-grey", label: "Grey", background: "#929292", accent: "#293c64" },
      { id: "makara-navy", label: "Navy Blue", background: "#293c64", accent: "#c4ae7e" },
      { id: "makara-khaki", label: "Khaki", background: "#c3ae7d", accent: "#293c64" },
      { id: "makara-black", label: "Black", background: "#1b1b1b", accent: "#c4ae7e" },
    ],
  },
  kumbha: {
    label: "Kumbha (Aquarius)",
    constellationPath: "/constellations/kumbha.svg",
    palettes: [
      { id: "kumbha-silver", label: "Silver", background: "#c6cbd0", accent: "#579bd0" },
      { id: "kumbha-sky-blue", label: "Sky Blue", background: "#90d1f2", accent: "#7164a9" },
      { id: "kumbha-lilac", label: "Lilac", background: "#c9bbe7", accent: "#4e86be" },
    ],
  },
  meena: {
    label: "Meena (Pisces)",
    constellationPath: "/constellations/meena.svg",
    palettes: [
      { id: "meena-peach", label: "Peach", background: "#f1c4a4", accent: "#6a8dc5" },
      { id: "meena-cotton-blue", label: "Cotton Candy Blue", background: "#acd9f1", accent: "#9174b1" },
      { id: "meena-lavender", label: "Lavender", background: "#c8b6e6", accent: "#4f83bb" },
    ],
  },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Returns the available palette choices for a selected rashi.
 * Input: optional rashi key. Output: an empty array when the rashi is missing or invalid.
 */
export function getRashiPalettes(rashi?: string | null): readonly RashiPalette[] {
  return isRashiKey(rashi) ? RASHI_THEMES[rashi].palettes : [];
}

/**
 * Finds a persisted palette by ID, optionally constrained to the selected rashi.
 * Input: palette ID and optional rashi key. Output: matching palette or null.
 */
export function getRashiPalette(paletteId?: string | null, rashi?: string | null): RashiPalette | null {
  if (!paletteId) return null;
  const themes = isRashiKey(rashi) ? [RASHI_THEMES[rashi]] : Object.values(RASHI_THEMES);
  return themes.flatMap((theme) => theme.palettes).find((palette) => palette.id === paletteId) ?? null;
}

/**
 * Gets the default palette for a rashi after it is selected in the dashboard.
 * Input: optional rashi key. Output: the first curated palette or null.
 */
export function getDefaultRashiPalette(rashi?: string | null): RashiPalette | null {
  return getRashiPalettes(rashi)[0] ?? null;
}

/**
 * Chooses the most readable approved foreground for a background color.
 * Input: a six-digit hex background. Output: dark or light font color plus the background classification.
 */
export function resolveForeground(background: string) {
  const normalized = normalizeHex(background) ?? DARK_FONT_COLOR;
  const darkContrast = contrastRatio(normalized, DARK_FONT_COLOR);
  const lightContrast = contrastRatio(normalized, LIGHT_FONT_COLOR);
  const foreground = darkContrast >= lightContrast ? DARK_FONT_COLOR : LIGHT_FONT_COLOR;

  return {
    foreground,
    isLightBackground: foreground === DARK_FONT_COLOR,
    contrast: Math.max(darkContrast, lightContrast),
  };
}

/**
 * Resolves persisted palette data into semantic portfolio color tokens.
 * Input: rashi key, palette ID, and optional legacy background color. Output: a complete theme safe for templates.
 */
export function resolveRashiTheme({
  rashi,
  paletteId,
  backgroundColor,
}: {
  rashi?: string | null;
  paletteId?: string | null;
  backgroundColor?: string | null;
}): ResolvedRashiTheme {
  const palette = getRashiPalette(paletteId, rashi) ?? getDefaultRashiPalette(rashi) ?? FALLBACK_PALETTE;
  const background = normalizeHex(backgroundColor) ?? palette.background;
  const { foreground, isLightBackground } = resolveForeground(background);
  const accentOnSurface =
    contrastRatio(palette.accent, background) >= 4.5
      ? palette.accent
      : foreground;
  const heroForeground = resolveForeground(PORTFOLIO_HERO_SURFACE_COLOR).foreground;
  const accentOnHero =
    contrastRatio(palette.accent, PORTFOLIO_HERO_SURFACE_COLOR) >= 4.5
      ? palette.accent
      : heroForeground;

  return {
    palette,
    background,
    foreground,
    mutedForeground: isLightBackground ? "#4b4642" : "#ddd6ca",
    accentOnSurface,
    accentOnHero,
    constellationPath: isRashiKey(rashi) ? RASHI_THEMES[rashi].constellationPath : null,
    isLightBackground,
  };
}

const FALLBACK_PALETTE: RashiPalette = {
  id: "fallback-midnight",
  label: "Midnight",
  background: "#17151c",
  accent: "#e4c878",
};

/** Converts an sRGB hex channel into a relative luminance channel. Input: 0-255 channel. Output: linearized channel value. */
function linearize(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

/** Calculates WCAG relative luminance. Input: six-digit hex color. Output: luminance from 0 to 1. */
function relativeLuminance(color: string) {
  const normalized = normalizeHex(color);
  if (!normalized) return 0;
  const channels = [1, 3, 5].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
  return 0.2126 * linearize(channels[0]) + 0.7152 * linearize(channels[1]) + 0.0722 * linearize(channels[2]);
}

/** Calculates WCAG contrast between two hex colors. Input: foreground and background colors. Output: contrast ratio. */
export function contrastRatio(first: string, second: string) {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** Checks whether a value is one of the supported rashi keys. Input: unknown rashi value. Output: typed key guard. */
function isRashiKey(rashi?: string | null): rashi is RashiKey {
  return Boolean(rashi && Object.hasOwn(RASHI_THEMES, rashi));
}

/** Normalizes accepted six-digit colors. Input: untrusted color value. Output: lowercase hex or null. */
function normalizeHex(color?: string | null) {
  return color && HEX_COLOR.test(color) ? color.toLowerCase() : null;
}
