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

  it("starts Google OAuth with a sanitized callback", async () => {
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

  it("starts bounded viewer email verification without assigning an exclusive role", async () => {
    const response = await POST(request({ method: "email_otp", email: "Reader@Example.com", redirect: "/p/token" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "reader@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Fp%2Ftoken`,
        data: { entry_context: "viewer_interest" },
      },
    });
  });

  it("creates a password account and requests signup verification", async () => {
    const response = await POST(request({
      method: "password_signup",
      email: "Owner@Example.com",
      password: "strong-pass-1",
      redirect: "/edit",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      verificationRequired: true,
      email: "owner@example.com",
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "strong-pass-1",
      options: {
        emailRedirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Fedit`,
        data: { entry_context: "portfolio_owner" },
      },
    });
    expect(ensureOwnerPortfolio).not.toHaveBeenCalled();
  });

  it("provisions the owner portfolio when local signup returns a session", async () => {
    signUp.mockResolvedValueOnce({
      data: { user: { id: "new-owner" }, session: { access_token: "token" } },
      error: null,
    });
    const response = await POST(request({
      method: "password_signup",
      email: "owner@example.com",
      password: "strong-pass-1",
      redirect: "/edit",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true, redirect: "/edit" });
    expect(ensureOwnerPortfolio).toHaveBeenCalledWith(expect.anything(), "new-owner");
  });

  it("signs in an owner or viewer upgrading to owner with email and password", async () => {
    const response = await POST(request({
      method: "password_signin",
      email: "Owner@Example.com",
      password: "strong-pass-1",
      redirect: "/dashboard",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true, redirect: "/dashboard" });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "strong-pass-1",
    });
    expect(ensureOwnerPortfolio).toHaveBeenCalledWith(expect.anything(), "owner");
  });

  it("uses non-enumerating responses for rejected signup and sign-in", async () => {
    signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: new Error("duplicate") });
    const signup = await POST(request({
      method: "password_signup",
      email: "owner@example.com",
      password: "strong-pass-1",
    }));
    expect(signup.status).toBe(400);
    await expect(signup.json()).resolves.toMatchObject({ code: "SIGNUP_FAILED" });

    signInWithPassword.mockResolvedValueOnce({ data: { user: null }, error: new Error("invalid") });
    const signin = await POST(request({
      method: "password_signin",
      email: "owner@example.com",
      password: "wrong",
    }));
    expect(signin.status).toBe(401);
    await expect(signin.json()).resolves.toEqual({
      code: "SIGNIN_FAILED",
      error: "The email or password is incorrect, or the email has not been verified.",
    });
  });

  it("rejects weak passwords before contacting Supabase", async () => {
    const noNumber = await POST(request({
      method: "password_signup",
      email: "owner@example.com",
      password: "onlyletters",
    }));
    const tooShort = await POST(request({
      method: "password_signup",
      email: "owner@example.com",
      password: "a1",
    }));
    expect(noNumber.status).toBe(400);
    expect(tooShort.status).toBe(400);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("resends signup codes and sends non-enumerating password recovery", async () => {
    expect((await POST(request({
      method: "resend_signup",
      email: "Owner@Example.com",
      redirect: "/edit",
    }))).status).toBe(200);
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "owner@example.com",
      options: { emailRedirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Fedit` },
    });

    const recovery = await POST(request({ method: "password_recovery", email: "Owner@Example.com" }));
    expect(recovery.status).toBe(200);
    await expect(recovery.json()).resolves.toEqual({ sent: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "owner@example.com",
      { redirectTo: `${canonicalOrigin()}/api/auth/callback?next=%2Freset-password` }
    );
  });

  it("rejects cross-origin, invalid, and rate-limited requests before provider work", async () => {
    expect((await POST(request({ method: "google" }, "https://attacker.test"))).status).toBe(403);
    expect((await POST(request({ method: "password_signin", email: "bad", password: "secret" }))).status).toBe(400);

    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 30 });
    const limited = await POST(request({ method: "google" }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("30");
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("redacts unexpected provider failures and supplies a request id", async () => {
    resetPasswordForEmail.mockResolvedValueOnce({ error: new Error("smtp secret") });
    const response = await POST(request({ method: "password_recovery", email: "owner@example.com" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "AUTH_START_FAILED",
      error: "Authentication is temporarily unavailable. Please try again.",
    });
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    expect(logServerError).toHaveBeenCalledWith("auth.start.failed", expect.any(String), expect.any(Error));
  });
});
