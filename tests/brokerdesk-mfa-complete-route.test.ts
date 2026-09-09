import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const completeBrokerdeskReauth = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/organization-access/server/brokerdesk-reauth.service", () => {
  class BrokerdeskReauthError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) { super(message); }
  }
  return { BrokerdeskReauthError, completeBrokerdeskReauth };
});
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError }));

import { POST } from "../src/app/api/v1/brokerdesk/reauth/complete/route";
import { createBrokerdeskMfaPendingCookie } from "@/features/organization-access/server/brokerdesk-reauth-cookie";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const actor = {
  status: "authenticated" as const,
  user: { id: "22222222-2222-4222-8222-222222222222", sessionId: "33333333-3333-4333-8333-333333333333" },
  supabase: {},
};

function request(cookie?: string, origin = "http://local") {
  const headers: Record<string, string> = { Origin: origin, "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  return new Request("http://local/api/v1/brokerdesk/reauth/complete", {
    method: "POST",
    headers,
    body: "{}",
  });
}

function pendingCookie(purpose: "team_invite" | "verification_manage" = "team_invite") {
  const cookie = createBrokerdeskMfaPendingCookie({
    challengeId: "11111111-1111-4111-8111-111111111111",
    workspaceRef,
    purpose,
  });
  return `${cookie.name}=${cookie.value}`;
}

describe("BrokerDesk MFA completion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    completeBrokerdeskReauth.mockResolvedValue("verified");
  });

  it("issues an exact-workspace proof after the database verifies AAL2", async () => {
    const response = await POST(request(pendingCookie()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      next: `/brokerdesk/w/${workspaceRef}/settings/team?reauth=complete`,
    });
    expect(completeBrokerdeskReauth).toHaveBeenCalledWith(
      actor.supabase,
      "11111111-1111-4111-8111-111111111111",
      expect.stringMatching(/^[a-f0-9]{64}$/)
    );
    const cookies = response.headers.get("set-cookie") || "";
    expect(cookies).toContain("nakshatra_brokerdesk_proof=");
    expect(cookies).toContain(`Path=/api/v1/brokerdesk/workspaces/${workspaceRef}`);
    expect(cookies).toContain("nakshatra_brokerdesk_mfa_pending=;");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("uses a server-derived destination for representative verification", async () => {
    const response = await POST(request(pendingCookie("verification_manage")));
    await expect(response.json()).resolves.toEqual({ next: "/brokerdesk/onboarding?reauth=complete" });
  });

  it("does not issue a proof while the live session remains AAL1", async () => {
    completeBrokerdeskReauth.mockResolvedValueOnce("mfa_required");
    const response = await POST(request(pendingCookie()));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "BROKERDESK_MFA_REQUIRED" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects caller-supplied scope and fails closed for missing or tampered pending state", async () => {
    const injected = new Request("http://local/api/v1/brokerdesk/reauth/complete", {
      method: "POST",
      headers: { Origin: "http://local", "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceRef: `wrk_${"b".repeat(32)}`, purpose: "team_invite" }),
    });
    expect((await POST(injected)).status).toBe(400);

    const missing = await POST(request());
    expect(missing.status).toBe(403);
    expect(completeBrokerdeskReauth).not.toHaveBeenCalled();

    const tampered = await POST(request(`${pendingCookie()}x`));
    expect(tampered.status).toBe(403);
    expect(completeBrokerdeskReauth).not.toHaveBeenCalled();
  });

  it("rejects cross-site, unauthenticated, and rate-limited completion attempts", async () => {
    expect((await POST(request(pendingCookie(), "https://attacker.test"))).status).toBe(403);
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await POST(request(pendingCookie()))).status).toBe(401);
    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await POST(request(pendingCookie()))).status).toBe(429);
  });
});
