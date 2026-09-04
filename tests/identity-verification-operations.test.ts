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
    expect(workflow).toContain("EXPECTED_SUPABASE_HOST: xizzzczzhqzabcipbgep.supabase.co");
    expect(workflow).not.toContain("pull_request:");
  });

  it("scopes secrets to worker steps and pins the approved Supabase destination", () => {
    const jobEnvironment = workflow.slice(workflow.indexOf("    env:"), workflow.indexOf("    steps:"));
    expect(jobEnvironment).not.toContain("secrets.");
    expect(workflow).toContain("secrets.DIDIT_API_KEY");
    expect(workflow).toContain("secrets.SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain('url.hostname === process.env.EXPECTED_SUPABASE_HOST');
    expect(workflow).not.toMatch(/DIDIT_API_KEY\s*:\s*[A-Za-z0-9_-]{24,}\s*$/m);
    expect(workflow).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*:\s*eyJ[A-Za-z0-9_-]+/);
  });

  it("routes deduplicated alerts through a trusted label and accountable assignee", () => {
    expect(workflow).toContain('alert_label="ops-worker-failure"');
    expect(workflow).toContain('--label "$alert_label"');
    expect(workflow).toContain('--assignee "$ALERT_ASSIGNEE"');
    expect(workflow).toContain("vars.DIDIT_ALERT_ASSIGNEE");
  });

  it("keeps live verification behind durable deployment, retention, and legal gates", () => {
    expect(readiness).toContain("DIDIT_WORKER_ENABLED=true");
    expect(readiness).toContain("20260902141433");
    expect(readiness).toContain("20260902143932");
    expect(readiness).toContain("DPA");
    expect(readiness).toContain("shortest available retention period");
    expect(readiness).not.toContain("GitHub CLI access is not currently authenticated");
  });
});
