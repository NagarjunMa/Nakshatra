import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const createInvitation = vi.hoisted(() => vi.fn());
const acceptInvitation = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/organization-access/server/brokerdesk-team-invitation.service", () => {
  class BrokerdeskTeamInvitationError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) { super(message); }
  }
  return {
    BrokerdeskTeamInvitationError,
    createBrokerdeskTeamInvitation: createInvitation,
    acceptBrokerdeskTeamInvitation: acceptInvitation,
  };
});
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError: vi.fn() }));

import { POST as create } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/team-invitations/route";
import { POST as exchange } from "../src/app/api/v1/brokerdesk/team-invitations/exchange/route";
import { POST as accept } from "../src/app/api/v1/brokerdesk/team-invitations/accept/route";
import { createBrokerdeskProofCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import { createTeamInvitationExchangeCookie } from "@/features/organization-access/server/brokerdesk-team-invitation.cookie";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const actor = { status: "authenticated" as const, user: { id: "11111111-1111-4111-8111-111111111111", sessionId: "session" }, supabase: {} };
const origin = "http://local";

function commandRequest(cookie?: string, extra: object = {}) {
  return new Request(`${origin}/api/v1/brokerdesk/workspaces/${workspaceRef}/team-invitations`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({
      email: "employee@example.com",
      rolePreset: "advisor",
      idempotencyKey: "invite:11111111-1111-4111-8111-111111111111",
      ...extra,
    }),
  });
}

describe("BrokerDesk team invitation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    createClient.mockResolvedValue({});
    createInvitation.mockResolvedValue({
      status: "created", invitationRef: `inv_${"b".repeat(32)}`, workspaceRef,
      emailHint: "em***@example.com", rolePreset: "advisor", expiresAt: "2026-09-16T00:00:00Z",
    });
    acceptInvitation.mockResolvedValue({
      available: true, workspaceRef, workspaceName: "Trusted Matchmakers", rolePreset: "advisor", memberRef: `mbr_${"c".repeat(32)}`,
    });
  });

  it("creates a fragment-only invitation after the exact team-invite proof", async () => {
    const proof = createBrokerdeskProofCookie({
      challengeId: "22222222-2222-4222-8222-222222222222", workspaceRef, purpose: "team_invite", proof: "p".repeat(43),
    });
    const response = await create(commandRequest(`${proof.name}=${proof.value}`), { params: Promise.resolve({ workspaceRef }) });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.invitationUrl).toMatch(/^http:\/\/local\/join\/team#token=[A-Za-z0-9_-]{43}$/);
    expect(result.invitationUrl).not.toContain("?token=");
    expect(createInvitation).toHaveBeenCalledWith(actor.supabase, expect.objectContaining({
      workspaceRef, rolePreset: "advisor", emailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      proofHash: expect.stringMatching(/^[a-f0-9]{64}$/), tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(response.headers.get("set-cookie")).toContain("nakshatra_brokerdesk_proof=;");
  });

  it("rejects missing, cross-purpose, and caller-expanded commands", async () => {
    expect((await create(commandRequest(), { params: Promise.resolve({ workspaceRef }) })).status).toBe(403);
    const proof = createBrokerdeskProofCookie({
      challengeId: "22222222-2222-4222-8222-222222222222", workspaceRef, purpose: "team_suspend", proof: "p".repeat(43),
    });
    expect((await create(commandRequest(`${proof.name}=${proof.value}`), { params: Promise.resolve({ workspaceRef }) })).status).toBe(403);
    expect((await create(commandRequest(undefined, { organizationId: "internal" }), { params: Promise.resolve({ workspaceRef }) })).status).toBe(400);
  });

  it("exchanges without consuming and accepts only through the HttpOnly credential", async () => {
    const token = "a".repeat(43);
    const exchanged = await exchange(new Request(`${origin}/api/v1/brokerdesk/team-invitations/exchange`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    }));
    expect(exchanged.status).toBe(200);
    expect(exchanged.headers.get("set-cookie")).toContain("nakshatra_team_invitation=");

    const cookie = createTeamInvitationExchangeCookie(token);
    const accepted = await accept(new Request(`${origin}/api/v1/brokerdesk/team-invitations/accept`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: `${cookie.name}=${cookie.value}` }, body: "{}",
    }));
    expect(accepted.status).toBe(200);
    expect(acceptInvitation).toHaveBeenCalledWith(actor.supabase, expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(accepted.headers.get("set-cookie")).toContain("nakshatra_team_invitation=;");
  });

  it("returns neutral failures for malformed exchange and wrong-account acceptance", async () => {
    const malformed = await exchange(new Request(`${origin}/api/v1/brokerdesk/team-invitations/exchange`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ token: "short" }),
    }));
    await expect(malformed.json()).resolves.toEqual({ ready: true });
    expect(malformed.headers.get("set-cookie")).toBeNull();
    acceptInvitation.mockResolvedValueOnce({ available: false });
    const cookie = createTeamInvitationExchangeCookie("a".repeat(43));
    const denied = await accept(new Request(`${origin}/api/v1/brokerdesk/team-invitations/accept`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: `${cookie.name}=${cookie.value}` }, body: "{}",
    }));
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toEqual({ available: false });
  });

  it("fails closed across origin, authentication, throttling, and service failures", async () => {
    const crossOrigin = await exchange(new Request(`${origin}/api/v1/brokerdesk/team-invitations/exchange`, {
      method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify({ token: "a".repeat(43) }),
    }));
    expect(crossOrigin.status).toBe(403);

    const cookie = createTeamInvitationExchangeCookie("a".repeat(43));
    const acceptRequest = () => new Request(`${origin}/api/v1/brokerdesk/team-invitations/accept`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: `${cookie.name}=${cookie.value}` }, body: "{}",
    });
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await accept(acceptRequest())).status).toBe(401);

    enforceRateLimit.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    expect((await accept(acceptRequest())).status).toBe(429);

    acceptInvitation.mockRejectedValueOnce(new Error("database unavailable"));
    const unavailable = await accept(acceptRequest());
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({ available: false });
  });
});
