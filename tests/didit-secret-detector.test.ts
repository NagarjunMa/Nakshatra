import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(new URL("../.github/trufflehog.yml", import.meta.url), "utf8");
const detectorPattern = config
  .split("\n")
  .find((line) => line.trimStart().startsWith("didit_credential: "))
  ?.trim()
  .replace("didit_credential: ", "")
  .replace(/^'|'$/g, "")
  .replaceAll("''", "'");

describe("Didit TruffleHog detector", () => {
  it("detects high-entropy credentials assigned to server-only Didit variables", () => {
    expect(config).toContain("name: DiditCredentialAssignment");
    expect(detectorPattern).toBeDefined();

    const detector = new RegExp(detectorPattern!);
    const apiKeyAssignment = ["DIDIT_API_KEY", "=", "Qp7xM2vR9kLs4aBc8dEf1GhJ6nTu3wY"].join("");
    const webhookSecretAssignment = ["DIDIT_WEBHOOK_SECRET", ': "', "R9mK2xV7qL4sT8aB1cD5eF6gH3jN0pW", '"'].join("");

    expect(detector.test(apiKeyAssignment)).toBe(true);
    expect(detector.test(webhookSecretAssignment)).toBe(true);
  });

  it("does not treat a variable name or short placeholder as a credential", () => {
    const detector = new RegExp(detectorPattern!);
    expect(detector.test("DIDIT_API_KEY=<set-in-secret-manager>")).toBe(false);
    expect(detector.test("DIDIT_WEBHOOK_SECRET=short-placeholder")).toBe(false);
  });
});
