import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const replaceAccess = vi.hoisted(() => vi.fn());
const suspendMember = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/organization-access/server/brokerdesk-team-command.service", () => {
  class BrokerdeskTeamCommandError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) { super(message); }
  }
  return { BrokerdeskTeamCommandError, replaceBrokerdeskTeamMemberAccess: replaceAccess, suspendBrokerdeskTeamMember: suspendMember };
});
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError: vi.fn() }));

import { PUT as replace } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/team/[memberRef]/access/route";
import { POST as suspend } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/team/[memberRef]/suspend/route";
import { createBrokerdeskProofCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";

const origin = "http://local";
const workspaceRef = `wrk_${"a".repeat(32)}`;
const memberRef = `mbr_${"b".repeat(32)}`;
const actor = { status: "authenticated" as const, user: { id: "11111111-1111-4111-8111-111111111111", sessionId: "session" }, supabase: {} };
const context = { params: Promise.resolve({ workspaceRef, memberRef }) };
function proof(purpose: "team_access_replace" | "team_suspend") {
  return createBrokerdeskProofCookie({ challengeId: "22222222-2222-4222-8222-222222222222", workspaceRef, purpose, proof: "p".repeat(43) });
}
function request(path: string, body: object, cookie: { name: string; value: string }, method = "POST") {
  return new Request(`${origin}${path}`, { method, headers: { Origin: origin, "Content-Type": "application/json", Cookie: `${cookie.name}=${cookie.value}` }, body: JSON.stringify(body) });
}

describe("BrokerDesk team command routes", () => {
  beforeEach(() => {
    vi.clearAllMocks(); getApiUser.mockResolvedValue(actor); enforceRateLimit.mockResolvedValue(null);
    replaceAccess.mockResolvedValue({ status: "updated", workspaceRef, memberRef, rolePreset: "coordinator", customerAccess: "none", assignedCustomerCount: 0 });
    suspendMember.mockResolvedValue({ status: "suspended", workspaceRef, memberRef });
  });

  it("replaces access through the exact opaque workspace/member and action proof", async () => {
    const cookie = proof("team_access_replace");
    const response = await replace(request(`/api/v1/brokerdesk/workspaces/${workspaceRef}/team/${memberRef}/access`, { rolePreset: "coordinator", idempotencyKey: "team-access:11111111-1111-4111-8111-111111111111" }, cookie, "PUT"), context);
    expect(response.status).toBe(200);
    expect(replaceAccess).toHaveBeenCalledWith(actor.supabase, expect.objectContaining({ workspaceRef, memberRef, rolePreset: "coordinator", proofHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(response.headers.get("set-cookie")).toContain("nakshatra_brokerdesk_proof=;");
  });

  it("suspends only with the independently scoped suspension proof", async () => {
    const wrong = proof("team_access_replace");
    expect((await suspend(request(`/api/v1/brokerdesk/workspaces/${workspaceRef}/team/${memberRef}/suspend`, { idempotencyKey: "team-suspend:11111111-1111-4111-8111-111111111111" }, wrong), context)).status).toBe(403);
    const cookie = proof("team_suspend");
    const response = await suspend(request(`/api/v1/brokerdesk/workspaces/${workspaceRef}/team/${memberRef}/suspend`, { idempotencyKey: "team-suspend:11111111-1111-4111-8111-111111111111" }, cookie), context);
    expect(response.status).toBe(200);
    expect(suspendMember).toHaveBeenCalledWith(actor.supabase, expect.objectContaining({ workspaceRef, memberRef, proofHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
  });

  it("rejects caller-expanded role commands and cross-origin requests", async () => {
    const cookie = proof("team_access_replace");
    const expanded = await replace(request("/api", { rolePreset: "owner", organizationId: "private", idempotencyKey: "team-access:11111111-1111-4111-8111-111111111111" }, cookie, "PUT"), context);
    expect(expanded.status).toBe(400);
    const crossOrigin = new Request(`${origin}/api`, { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: "{}" });
    expect((await suspend(crossOrigin, context)).status).toBe(403);
  });

  it("fails closed for missing sessions, throttling, and dependency failures", async () => {
    const cookie = proof("team_access_replace");
    const accessRequest = () => request("/api", { rolePreset: "viewer", idempotencyKey: "team-access:11111111-1111-4111-8111-111111111111" }, cookie, "PUT");
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await replace(accessRequest(), context)).status).toBe(401);
    enforceRateLimit.mockResolvedValueOnce(new Response("limited", { status: 429 }));
    expect((await replace(accessRequest(), context)).status).toBe(429);
    replaceAccess.mockRejectedValueOnce(new Error("database unavailable"));
    const unavailable = await replace(accessRequest(), context);
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({ code: "BROKERDESK_TEAM_COMMAND_UNAVAILABLE" });
  });
});
