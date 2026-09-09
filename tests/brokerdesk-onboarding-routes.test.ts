import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const getBrokerdeskBootstrap = vi.hoisted(() => vi.fn());
const createBrokerdeskWorkspace = vi.hoisted(() => vi.fn());
const getBrokerdeskOnboarding = vi.hoisted(() => vi.fn());
const saveBrokerdeskOnboarding = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth", () => ({ getApiUser }));
vi.mock("../src/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("../src/features/organizations/server/brokerdesk-onboarding.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/organizations/server/brokerdesk-onboarding.service")>();
  return {
    ...actual,
    getBrokerdeskBootstrap,
    createBrokerdeskWorkspace,
    getBrokerdeskOnboarding,
    saveBrokerdeskOnboarding,
  };
});

import { GET as bootstrapGet } from "../src/app/api/v1/brokerdesk/bootstrap/route";
import { POST as workspacePost } from "../src/app/api/v1/brokerdesk/workspaces/route";
import { GET as onboardingGet } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/onboarding/route";
import { PUT as profilePut } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/business-profile/route";

const WORKSPACE_REF = `wrk_${"a".repeat(32)}`;
const actor = { status: "authenticated", user: { id: "broker", sessionId: "session" }, supabase: {} };
const context = { params: Promise.resolve({ workspaceRef: WORKSPACE_REF }) };

function request(path: string, method = "GET", body?: unknown, origin = "http://local") {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": origin === "http://local" ? "same-origin" : "cross-site",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("BrokerDesk onboarding routes", () => {
  beforeEach(() => {
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    getBrokerdeskBootstrap.mockResolvedValue({ workspaces: [], nextAction: "create_workspace" });
    createBrokerdeskWorkspace.mockResolvedValue({ available: true, workspaceRef: WORKSPACE_REF });
    getBrokerdeskOnboarding.mockResolvedValue({ available: true, workspaceRef: WORKSPACE_REF });
    saveBrokerdeskOnboarding.mockResolvedValue({ available: true, workspaceRef: WORKSPACE_REF });
  });

  it("authenticates and rate limits bootstrap reads", async () => {
    const response = await bootstrapGet(request("/api/v1/brokerdesk/bootstrap"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(enforceRateLimit).toHaveBeenCalledWith(actor.supabase, expect.any(Request), "brokerdesk_bootstrap");
  });

  it("blocks cross-site workspace creation before authentication", async () => {
    const response = await workspacePost(request(
      "/api/v1/brokerdesk/workspaces", "POST", {}, "https://attacker.test"
    ));
    expect(response.status).toBe(403);
    expect(getApiUser).not.toHaveBeenCalled();
    expect(createBrokerdeskWorkspace).not.toHaveBeenCalled();
  });

  it("rejects client-controlled role, status and organization fields", async () => {
    const response = await workspacePost(request("/api/v1/brokerdesk/workspaces", "POST", {
      profile: {
        legalName: "Trusted Matches",
        businessType: "partnership",
        primaryCity: "Pune",
        primaryCountry: "IN",
        rolePreset: "owner",
        verificationStatus: "verified",
      },
      organizationId: "chosen-by-client",
      idempotencyKey: "signup:broker:0001",
    }));
    expect(response.status).toBe(400);
    expect(createBrokerdeskWorkspace).not.toHaveBeenCalled();
  });

  it("returns the same 404 shape for unavailable onboarding workspaces", async () => {
    getBrokerdeskOnboarding.mockResolvedValue({ available: false });
    const response = await onboardingGet(request(`/api/v1/brokerdesk/workspaces/${WORKSPACE_REF}/onboarding`), context);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "BROKERDESK_WORKSPACE_UNAVAILABLE",
      error: "Workspace unavailable.",
    });
  });

  it("requires same-origin and forwards optimistic version metadata on saves", async () => {
    const command = {
      profile: { representativeFullName: "Anita Rao" },
      expectedVersion: 2,
      submitForVerification: false,
      idempotencyKey: "save:brokerdesk:0001",
    };
    const response = await profilePut(request(
      `/api/v1/brokerdesk/workspaces/${WORKSPACE_REF}/business-profile`, "PUT", command
    ), context);
    expect(response.status).toBe(200);
    expect(saveBrokerdeskOnboarding).toHaveBeenCalledWith(
      actor.supabase, WORKSPACE_REF, command.profile, 2, false, "save:brokerdesk:0001"
    );
    expect(enforceRateLimit).toHaveBeenCalledWith(actor.supabase, expect.any(Request), "brokerdesk_onboarding_write");
  });

  it("requires authentication on every onboarding endpoint", async () => {
    getApiUser.mockResolvedValue({ status: "missing_session" });
    expect((await bootstrapGet(request("/api/v1/brokerdesk/bootstrap"))).status).toBe(401);
    expect((await workspacePost(request("/api/v1/brokerdesk/workspaces", "POST", {}))).status).toBe(401);
    expect((await onboardingGet(request("/onboarding"), context)).status).toBe(401);
    expect((await profilePut(request("/business-profile", "PUT", {}), context)).status).toBe(401);
  });
});
