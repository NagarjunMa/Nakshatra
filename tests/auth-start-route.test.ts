import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
const consumeRateLimit = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/security/server/rate-limit.service", async () => {
  const actual = await vi.importActual<typeof import("../src/features/security/server/rate-limit.service")>(
    "../src/features/security/server/rate-limit.service"
  );
  return { ...actual, consumeRateLimit };
});
vi.mock("@/lib/security/logging", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/security/logging")>("../src/lib/security/logging");
  return { ...actual, logServerError };
});

import { POST } from "../src/app/api/auth/start/route";

function request(payload: unknown, origin = "http://local") {
  return new Request("http://local/api/auth/start", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(payload),
  });
}

describe("authentication start route", () => {
  const signInWithOAuth = vi.fn();
  const signInWithOtp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { signInWithOAuth, signInWithOtp } });
    consumeRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/oauth" }, error: null });
    signInWithOtp.mockResolvedValue({ error: null });
  });

  const canonicalOrigin = () => process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : "http://local";

  it("starts Google OAuth with a sanitized callback and no browser-side provider call", async () => {
    const response = await POST(request({ method: "google", redirect: "https://attacker.test" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://accounts.google.test/oauth" });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Fdashboard`,
        skipBrowserRedirect: true,
      },
    });
    expect(consumeRateLimit).toHaveBeenCalledWith(expect.anything(), expect.any(Request), "auth_google");
  });

  it("starts a bounded email link request", async () => {
    const response = await POST(request({ method: "email", email: "reader@example.com", redirect: "/p/token" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "reader@example.com",
      options: { emailRedirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Fp%2Ftoken` },
    });
  });

  it("rejects cross-origin and invalid requests before contacting Supabase", async () => {
    expect((await POST(request({ method: "google" }, "https://attacker.test"))).status).toBe(403);
    expect((await POST(request({ method: "email", email: "not-an-email" }))).status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 429 when the application quota is exhausted", async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 30 });
    const response = await POST(request({ method: "google" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("redacts provider failures behind a stable public response", async () => {
    signInWithOAuth.mockResolvedValueOnce({ data: { url: null }, error: new Error("provider secret") });
    const response = await POST(request({ method: "google" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_START_FAILED" });
    expect(logServerError).toHaveBeenCalledWith("auth.start.failed", expect.any(String), expect.any(Error));
  });
});
