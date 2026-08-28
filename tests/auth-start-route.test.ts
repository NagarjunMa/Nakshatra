import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
const consumeRateLimit = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());
const ensureOwnerPortfolio = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/auth/server/portfolio-bootstrap", () => ({ ensureOwnerPortfolio }));
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
  const signUp = vi.fn();
  const signInWithPassword = vi.fn();
  const resend = vi.fn();
  const resetPasswordForEmail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({
      auth: {
        signInWithOAuth,
        signInWithOtp,
        signUp,
        signInWithPassword,
        resend,
        resetPasswordForEmail,
      },
    });
    consumeRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/oauth" }, error: null });
    signInWithOtp.mockResolvedValue({ error: null });
    signUp.mockResolvedValue({ data: { user: { id: "owner" }, session: null }, error: null });
    signInWithPassword.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    resend.mockResolvedValue({ error: null });
    resetPasswordForEmail.mockResolvedValue({ error: null });
    ensureOwnerPortfolio.mockResolvedValue("portfolio-id");
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

  it("starts a bounded inline viewer email verification request", async () => {
    const response = await POST(request({ method: "email_otp", email: "reader@example.com", redirect: "/p/token" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "reader@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Fp%2Ftoken`,
        data: { account_type: "portfolio_viewer" },
      },
    });
  });

  it("creates a password account and asks for its signup code", async () => {
    const response = await POST(request({
      method: "password_signup",
      name: "Aditi Rao",
      email: "Owner@Example.com",
      password: "strong-pass-1",
      redirect: "/edit",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      verificationRequired: true,
      email: "owner@example.com",
    });
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "Owner@Example.com",
      password: "strong-pass-1",
      options: expect.objectContaining({
        data: { full_name: "Aditi Rao", account_type: "portfolio_owner" },
      }),
    }));
  });

  it("boots the owner portfolio when signup or password sign-in returns a session", async () => {
    signUp.mockResolvedValueOnce({
      data: { user: { id: "new-owner" }, session: { access_token: "token" } },
      error: null,
    });
    const signup = await POST(request({
      method: "password_signup",
      name: "Aditi Rao",
      email: "owner@example.com",
      password: "strong-pass-1",
      redirect: "/edit",
    }));
    expect(signup.status).toBe(200);
    await expect(signup.json()).resolves.toEqual({ authenticated: true, redirect: "/edit" });
    expect(ensureOwnerPortfolio).toHaveBeenCalledWith(expect.anything(), "new-owner");

    const signin = await POST(request({
      method: "password_signin",
      email: "owner@example.com",
      password: "strong-pass-1",
      redirect: "/dashboard",
    }));
    expect(signin.status).toBe(200);
    await expect(signin.json()).resolves.toEqual({ authenticated: true, redirect: "/dashboard" });
    expect(ensureOwnerPortfolio).toHaveBeenCalledWith(expect.anything(), "owner");
  });

  it("returns clear bounded responses for rejected signup and sign-in attempts", async () => {
    signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: new Error("duplicate") });
    expect((await POST(request({
      method: "password_signup",
      name: "Aditi Rao",
      email: "owner@example.com",
      password: "strong-pass-1",
    }))).status).toBe(400);

    signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: new Error("invalid") });
    expect((await POST(request({
      method: "password_signin",
      email: "owner@example.com",
      password: "wrong",
    }))).status).toBe(401);
  });

  it("resends signup codes and sends password recovery through the server gateway", async () => {
    const resendResponse = await POST(request({
      method: "resend_signup",
      email: "owner@example.com",
      redirect: "/edit",
    }));
    expect(resendResponse.status).toBe(200);
    expect(resend).toHaveBeenCalledWith(expect.objectContaining({
      type: "signup",
      email: "owner@example.com",
    }));

    const recoveryResponse = await POST(request({
      method: "password_recovery",
      email: "owner@example.com",
    }));
    expect(recoveryResponse.status).toBe(200);
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "owner@example.com",
      expect.objectContaining({ redirectTo: expect.stringContaining("/api/auth/callback?next=%2Freset-password") })
    );
  });

  it("rejects cross-origin and invalid requests before contacting Supabase", async () => {
    expect((await POST(request({ method: "google" }, "https://attacker.test"))).status).toBe(403);
    expect((await POST(request({ method: "email_otp", email: "not-an-email" }))).status).toBe(400);
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

  it("redacts email-provider failures behind the same stable response", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({ error: new Error("smtp secret") });
    const response = await POST(request({
      method: "password_recovery",
      email: "owner@example.com",
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_START_FAILED" });
  });

  it("redacts signup-code resend failures", async () => {
    resend.mockResolvedValueOnce({ error: new Error("smtp unavailable") });
    const response = await POST(request({
      method: "resend_signup",
      email: "owner@example.com",
      redirect: "/edit",
    }));
    expect(response.status).toBe(503);
  });
});
