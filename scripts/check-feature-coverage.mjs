import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const COVERAGE_METRICS = ["statements", "branches", "functions", "lines"];
const FEATURE_FILE_PATTERN = /\.(?:mapper|service|contract)\.[cm]?[jt]sx?$/;

/** Returns per-file coverage failures for feature mappers, services, and contracts. */
export function findFeatureCoverageFailures(summary, minimum = 80) {
  const featureEntries = Object.entries(summary).filter(
    ([file]) => file !== "total" && FEATURE_FILE_PATTERN.test(file.replaceAll("\\", "/"))
  );

  if (!featureEntries.length) {
    throw new Error("No feature mapper, service, or contract files were found in the coverage summary.");
  }

  const failures = [];
  for (const [file, coverage] of featureEntries) {
    for (const metric of COVERAGE_METRICS) {
      const percentage = coverage?.[metric]?.pct;
      if (typeof percentage !== "number" || percentage < minimum) {
        failures.push({
          file: file.replaceAll("\\", "/"),
          metric,
          percentage: typeof percentage === "number" ? percentage : 0,
          minimum,
        });
      }
    }
  }

  return { checkedFiles: featureEntries.length, failures };
}

async function main() {
  const summaryPath = path.resolve(process.argv[2] ?? "coverage/coverage-summary.json");
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  const result = findFeatureCoverageFailures(summary);

  if (result.failures.length) {
    console.error("Feature coverage must be at least 80% per file for every metric:");
    for (const failure of result.failures) {
      console.error(
        `- ${failure.file}: ${failure.metric} ${failure.percentage}% (minimum ${failure.minimum}%)`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Feature coverage passed for ${result.checkedFiles} mapper, service, and contract files (80% per metric).`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
