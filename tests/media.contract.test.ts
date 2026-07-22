import { describe, expect, it } from "vitest";
import {
  mediaVisibilitySchema,
  updatePortfolioMediaSchema,
} from "../src/features/media/server/media.contract";

describe("portfolio media contracts", () => {
  it("accepts supported visibility levels", () => {
    expect(mediaVisibilitySchema.parse("interest_required")).toBe("interest_required");
    expect(mediaVisibilitySchema.safeParse("anyone").success).toBe(false);
  });

  it("requires an id and a real update", () => {
    const mediaId = "8f378bb8-ec91-4f3f-90ef-b7eea2c01506";
    expect(
      updatePortfolioMediaSchema.safeParse({ mediaId, visibility: "public" }).success
    ).toBe(true);
    expect(updatePortfolioMediaSchema.safeParse({ mediaId }).success).toBe(false);
    expect(
      updatePortfolioMediaSchema.safeParse({ mediaId: "not-a-uuid", visibility: "public" }).success
    ).toBe(false);
  });
});
