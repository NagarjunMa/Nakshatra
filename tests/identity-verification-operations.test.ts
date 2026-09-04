import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/identity-verification-worker.yml", "utf8");
const readiness = readFileSync("docs/identity-verification/production-readiness.md", "utf8");

describe("identity verification operations", () => {
  it("keeps the five-minute worker isolated, main-only, and disabled by default", () => {
    expect(workflow).toContain('cron: "*/5 * * * *"');
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("vars.DIDIT_WORKER_ENABLED == 'true'");
    expect(workflow).toContain("environment: identity-verification-worker-production");
    expect(workflow).not.toContain("pull_request:");
  });

  it("uses environment secrets without embedding credential-shaped values", () => {
    expect(workflow).toContain("secrets.DIDIT_API_KEY");
    expect(workflow).toContain("secrets.SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).not.toMatch(/DIDIT_API_KEY\s*:\s*[A-Za-z0-9_-]{24,}\s*$/m);
    expect(workflow).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*:\s*eyJ[A-Za-z0-9_-]+/);
  });

  it("keeps live verification behind explicit deployment, retention, and legal gates", () => {
    expect(readiness).toContain("**NO-GO.**");
    expect(readiness).toContain("DIDIT_WORKER_ENABLED=true");
    expect(readiness).toContain("DPA");
    expect(readiness).toContain("shortest available retention period");
  });
});
