import { describe, expect, it } from "vitest";
import { findFeatureCoverageFailures } from "../scripts/check-feature-coverage.mjs";

function metrics(percentage: number) {
  return Object.fromEntries(
    ["statements", "branches", "functions", "lines"].map((metric) => [
      metric,
      { total: 10, covered: percentage / 10, skipped: 0, pct: percentage },
    ])
  );
}

describe("feature coverage guard", () => {
  it("checks feature mappers, services, and contracts per file", () => {
    const result = findFeatureCoverageFailures({
      total: metrics(100),
      "C:\\repo\\src\\features\\portfolio\\dashboard.mapper.ts": metrics(80),
      "/repo/src/features/interest/interest.service.ts": metrics(92),
      "/repo/src/features/media/media.contract.ts": metrics(100),
      "/repo/src/app/page.tsx": metrics(0),
    });

    expect(result).toEqual({ checkedFiles: 3, failures: [] });
  });

  it("reports every metric below the per-file minimum", () => {
    const result = findFeatureCoverageFailures({
      total: metrics(100),
      "/repo/src/features/portfolio/publish.service.ts": {
        ...metrics(90),
        branches: { total: 10, covered: 7, skipped: 0, pct: 70 },
        functions: { total: 10, covered: 7.9, skipped: 0, pct: 79 },
      },
    });

    expect(result.failures).toEqual([
      expect.objectContaining({ metric: "branches", percentage: 70, minimum: 80 }),
      expect.objectContaining({ metric: "functions", percentage: 79, minimum: 80 }),
    ]);
  });

  it("fails closed when the coverage report contains no governed feature files", () => {
    expect(() => findFeatureCoverageFailures({ total: metrics(100) })).toThrow(
      "No feature mapper, service, or contract files"
    );
  });
});
