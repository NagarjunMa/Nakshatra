import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const startAccountDeletionReauth = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/account/server/account.service", () => ({ startAccountDeletionReauth }));
vi.mock("@/lib/security/logging", () => ({
  getRequestId: () => "request-id",
  logServerError,
}));

import { POST } from "../src/app/api/account/reauth/start/route";

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
  return new Request("http://local/api/account/reauth/start", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("account deletion reauthentication start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    startAccountDeletionReauth.mockResolvedValue({
      status: "started",
      challengeId: "33333333-3333-4333-8333-333333333333",
      expiresAt: "2026-08-24T06:10:00.000Z",
    });
    actor.supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: actor.user.id, email: "owner@example.test", email_confirmed_at: "2026-01-01T00:00:00Z" } },
      error: null,
    });
    actor.supabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/oauth" }, error: null });
    actor.supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
  });

  it("starts Google reauthentication with a signed callback cookie and no caller email", async () => {
    const response = await POST(request({ method: "google", email: "attacker@example.test" }));
    expect(response.status).toBe(400);

    const valid = await POST(request({ method: "google" }));
    expect(valid.status).toBe(200);
    await expect(valid.json()).resolves.toEqual({ url: "https://accounts.google.test/oauth" });
    expect(startAccountDeletionReauth).toHaveBeenCalledWith(actor.supabase, sessionId);
    expect(actor.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://local/api/auth/callback?reauth=account_deletion",
        skipBrowserRedirect: true,
      },
    });
    expect(valid.headers.get("set-cookie")).toContain("nakshatra_deletion_reauth=");
    expect(valid.headers.get("set-cookie")).toContain("HttpOnly");
    expect(valid.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("sends an email link only to the verified authenticated account", async () => {
    const response = await POST(request({ method: "email" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: true });
    expect(actor.supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "owner@example.test",
      options: { emailRedirectTo: "http://local/api/auth/callback?reauth=account_deletion" },
    });
  });

  it("fails closed for cross-site, unauthenticated, rate-limited, and unverified-email requests", async () => {
    expect((await POST(request({ method: "google" }, "https://attacker.test"))).status).toBe(403);

    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await POST(request({ method: "google" }))).status).toBe(401);

    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await POST(request({ method: "google" }))).status).toBe(429);

    actor.supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: actor.user.id, email: "owner@example.test", email_confirmed_at: null } },
      error: null,
    });
    expect((await POST(request({ method: "google" }))).status).toBe(503);
    expect(startAccountDeletionReauth).not.toHaveBeenCalled();
  });
});
