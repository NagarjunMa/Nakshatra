import { describe, expect, it, vi } from "vitest";

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(public element: unknown, public options: unknown) {}
  },
}));

import { metadata } from "../src/app/page";
import OpenGraphImage, { alt, contentType, size } from "../src/app/opengraph-image";

describe("marketing metadata", () => {
  it("uses the biodata recognition anchor and controlled-introduction promise", () => {
    expect(metadata.title).toBe("Nakshatra | Private Wedding Biodata Portfolio");
    expect(metadata.description).toMatch(/wedding biodata portfolio/i);
    expect(metadata.description).toMatch(/approve who receives protected details/i);
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: "Nakshatra | One introduction. On your terms.",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Nakshatra | One introduction. On your terms.",
    });
  });

  it("defines a large, accessible root social preview", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
    expect(alt).toMatch(/Nakshatra/i);
    expect(OpenGraphImage()).toMatchObject({ options: size });
  });
});
