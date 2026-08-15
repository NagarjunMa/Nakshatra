import sharp from "sharp";
import { describe, expect, it } from "vitest";

const onePixelRgb = Buffer.from([124, 58, 237]);

describe("Sharp runtime", () => {
  it("loads the native module and produces a valid WebP image", async () => {
    const output = await sharp(onePixelRgb, {
      raw: { width: 1, height: 1, channels: 3 },
    })
      .resize(8, 8)
      .webp()
      .toBuffer();
    const metadata = await sharp(output).metadata();

    expect(metadata).toMatchObject({ format: "webp", width: 8, height: 8 });
  });
});
