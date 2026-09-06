import { describe, expect, it } from "vitest";
import {
  composePortfolioName,
  normalizePortfolioName,
  resolvePortfolioNameParts,
} from "../src/features/portfolio/name";

describe("portfolio names", () => {
  it("concatenates first, optional middle, and last names cleanly", () => {
    expect(composePortfolioName({ first_name: " Aditi ", middle_name: "Lakshmi", last_name: " Rao " }))
      .toBe("Aditi Lakshmi Rao");
    expect(composePortfolioName({ first_name: "Aditi", last_name: "Rao" })).toBe("Aditi Rao");
  });

  it("derives editable parts from legacy full names without losing the canonical name", () => {
    expect(resolvePortfolioNameParts({ name: "Rahul Gollapalli Ranganatha" })).toEqual({
      first_name: "Rahul",
      middle_name: "Gollapalli",
      last_name: "Ranganatha",
    });
    expect(normalizePortfolioName({ name: "Aditi Rao" })).toMatchObject({
      name: "Aditi Rao",
      first_name: "Aditi",
      middle_name: "",
      last_name: "Rao",
    });
  });
});
