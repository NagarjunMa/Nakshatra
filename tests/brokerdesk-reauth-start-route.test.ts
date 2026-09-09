import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const startBrokerdeskReauth = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/organization-access/server/brokerdesk-reauth.service", async () => {
  class BrokerdeskReauthError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) {
      super(message);
    }
  }
  return { BrokerdeskReauthError, startBrokerdeskReauth };
});
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError }));

import { POST } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/reauth/start/route";
import { BrokerdeskReauthError } from "@/features/organization-access/server/brokerdesk-reauth.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const sessionId = "11111111-1111-4111-8111-111111111111";
const actor = {
  status: "authenticated" as const,
  user: { id: "22222222-2222-4222-8222-222222222222", sessionId },
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
    },
  },
};

function request(body: unknown, origin = "http://local") {
  return new Request(`http://local/api/v1/brokerdesk/workspaces/${workspaceRef}/reauth/start`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ workspaceRef }) };

describe("BrokerDesk privileged reauthentication start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    startBrokerdeskReauth.mockResolvedValue({
      status: "started",
      challengeId: "33333333-3333-4333-8333-333333333333",
      workspaceRef,
      purpose: "team_invite",
      expiresAt: "2026-09-09T18:10:00.000Z",
    });
    actor.supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: actor.user.id,
          email: "owner@example.test",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    });
    actor.supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.test/oauth" },
      error: null,
    });
    actor.supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
  });

  it("starts a Google flow bound to the server-authorized workspace and purpose", async () => {
    const response = await POST(request({ method: "google", purpose: "team_invite" }), context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://accounts.google.test/oauth" });
    expect(startBrokerdeskReauth).toHaveBeenCalledWith(actor.supabase, workspaceRef, "team_invite", sessionId);
    expect(actor.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://local/api/auth/callback?reauth=brokerdesk_action",
        skipBrowserRedirect: true,
      },
    });
    expect(response.headers.get("set-cookie")).toContain("nakshatra_brokerdesk_reauth=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("sends an email link only to the current verified account", async () => {
    const response = await POST(request({ method: "email", purpose: "verification_manage" }), context);
    expect(response.status).toBe(200);
    expect(actor.supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "owner@example.test",
      options: { emailRedirectTo: "http://local/api/auth/callback?reauth=brokerdesk_action" },
    });
  });

  it("rejects caller-selected identity or unrecognized action fields", async () => {
    expect((await POST(request({
      method: "google",
      purpose: "team_invite",
      email: "attacker@example.test",
    }), context)).status).toBe(400);
    expect((await POST(request({ method: "google", purpose: "billing_admin" }), context)).status).toBe(400);
    expect(startBrokerdeskReauth).not.toHaveBeenCalled();
  });

  it("fails closed for cross-site, missing-session, quota, and authorization failures", async () => {
    expect((await POST(
      request({ method: "google", purpose: "team_invite" }, "https://attacker.test"),
      context
    )).status).toBe(403);

    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await POST(request({ method: "google", purpose: "team_invite" }), context)).status).toBe(401);

    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await POST(request({ method: "google", purpose: "team_invite" }), context)).status).toBe(429);

    startBrokerdeskReauth.mockRejectedValueOnce(
      new BrokerdeskReauthError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404)
    );
    expect((await POST(request({ method: "google", purpose: "team_invite" }), context)).status).toBe(404);
  });
});
