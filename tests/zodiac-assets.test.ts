import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RASHI_OPTIONS } from "../src/types/portfolio";

describe("licensed zodiac wordmark assets", () => {
  it("provides a transparent clipped vector for every rashi in both appearances", () => {
    for (const rashi of RASHI_OPTIONS) {
      for (const appearance of ["light", "dark"] as const) {
        const path = join(process.cwd(), "public", "zodiac", `${rashi.key}-${appearance}.svg`);
        expect(existsSync(path), path).toBe(true);
        const svg = readFileSync(path, "utf8");
        expect(svg).toContain("<svg");
        expect(svg).toContain("<clipPath");
        expect(svg).toContain(`${rashi.key} zodiac wordmark`);
        expect(svg).not.toContain("<image");
      }
    }
  });

  it("uses a brighter teal in dark appearance without changing the vector geometry", () => {
    const light = readFileSync(join(process.cwd(), "public", "zodiac", "kumbha-light.svg"), "utf8");
    const dark = readFileSync(join(process.cwd(), "public", "zodiac", "kumbha-dark.svg"), "utf8");
    expect(light).toContain("#0c97ba");
    expect(dark).toContain("#7db7b3");
    expect(light.replace(/#[0-9a-f]{6}/g, "#color")).toBe(
      dark.replace(/#[0-9a-f]{6}/g, "#color")
    );
  });
});
