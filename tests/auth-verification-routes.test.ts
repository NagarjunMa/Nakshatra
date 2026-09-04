import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
const consumeRateLimit = vi.hoisted(() => vi.fn());
const ensureOwnerPortfolio = vi.hoisted(() => vi.fn());
const getApiUser = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/auth/server/portfolio-bootstrap", () => ({ ensureOwnerPortfolio }));
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", async () => {
  const actual = await vi.importActual<typeof import("../src/features/security/server/rate-limit.service")>(
    "../src/features/security/server/rate-limit.service"
  );
  return { ...actual, consumeRateLimit };
});
vi.mock("@/lib/security/logging", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/security/logging")>(
    "../src/lib/security/logging"
  );
  return { ...actual, logServerError };
});

import { POST as verifyPost } from "../src/app/api/auth/verify/route";
import { POST as passwordPost } from "../src/app/api/auth/password/route";

function request(path: string, payload: unknown, origin = "http://local") {
  return new Request(`http://local${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(payload),
  });
}

describe("authentication verification routes", () => {
  const verifyOtp = vi.fn();
  const signOut = vi.fn();
  const updateUser = vi.fn();
  const supabase = { auth: { verifyOtp, signOut, updateUser } };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
    consumeRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    ensureOwnerPortfolio.mockResolvedValue("portfolio-id");
    verifyOtp.mockResolvedValue({
      data: {
        user: { id: "viewer", email: "reader@example.com" },
        session: { access_token: "token" },
      },
      error: null,
    });
    signOut.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
    getApiUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "owner" },
      supabase,
    });
  });

  it("verifies a viewer email without creating an owner portfolio", async () => {
    const response = await verifyPost(request("/api/auth/verify", {
      purpose: "viewer_interest",
      email: "Reader@Example.com",
      token: "123456",
      redirect: "/p/token",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      verified: true,
      email: "reader@example.com",
      redirect: "/p/token",
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "Reader@Example.com",
      token: "123456",
      type: "email",
    });
    expect(ensureOwnerPortfolio).not.toHaveBeenCalled();
  });

  it("verifies signup codes and creates the owner's draft portfolio", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: {
        user: { id: "owner", email: "owner@example.com" },
        session: { access_token: "token" },
      },
      error: null,
    });
    const response = await verifyPost(request("/api/auth/verify", {
      purpose: "owner_signup",
      email: "owner@example.com",
      token: "654321",
      redirect: "/edit",
    }));
    expect(response.status).toBe(200);
    expect(verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ type: "signup" }));
    expect(ensureOwnerPortfolio).toHaveBeenCalledWith(supabase, "owner");
  });

  it("redacts an owner portfolio bootstrap failure", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: {
        user: { id: "owner", email: "owner@example.com" },
        session: { access_token: "token" },
      },
      error: null,
    });
    ensureOwnerPortfolio.mockRejectedValueOnce(new Error("database secret"));
    const response = await verifyPost(request("/api/auth/verify", {
      purpose: "owner_signup",
      email: "owner@example.com",
      token: "654321",
      redirect: "/edit",
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "OTP_VERIFY_FAILED" });
    expect(logServerError).toHaveBeenCalledWith("auth.verify.failed", expect.any(String), expect.any(Error));
  });

  it("rejects malformed, expired, mismatched, cross-origin, and rate-limited verification", async () => {
    expect((await verifyPost(request("/api/auth/verify", {
      purpose: "viewer_interest",
      email: "bad",
      token: "1",
    }))).status).toBe(400);

    verifyOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: new Error("expired") });
    expect((await verifyPost(request("/api/auth/verify", {
      purpose: "viewer_interest",
      email: "reader@example.com",
      token: "123456",
    }))).status).toBe(400);

    verifyOtp.mockResolvedValueOnce({
      data: {
        user: { id: "viewer", email: "other@example.com" },
        session: { access_token: "token" },
      },
      error: null,
    });
    expect((await verifyPost(request("/api/auth/verify", {
      purpose: "viewer_interest",
      email: "reader@example.com",
      token: "123456",
    }))).status).toBe(400);
    expect(signOut).toHaveBeenCalled();

    expect((await verifyPost(request("/api/auth/verify", {
      purpose: "viewer_interest",
      email: "reader@example.com",
      token: "123456",
    }, "https://attacker.test"))).status).toBe(403);

    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfter: 30 });
    const limited = await verifyPost(request("/api/auth/verify", {
      purpose: "viewer_interest",
      email: "reader@example.com",
      token: "123456",
    }));
    expect(limited.status).toBe(429);
  });

  it("updates a recovered password only for an authenticated session", async () => {
    const response = await passwordPost(request("/api/auth/password", {
      password: "NewStrongPass1",
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: true });
    expect(updateUser).toHaveBeenCalledWith({ password: "NewStrongPass1" });

    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await passwordPost(request("/api/auth/password", {
      password: "NewStrongPass1",
    }))).status).toBe(401);
  });

  it("rejects weak, cross-origin, and failed password updates", async () => {
    expect((await passwordPost(request("/api/auth/password", { password: "short" }))).status).toBe(400);
    expect((await passwordPost(request(
      "/api/auth/password",
      { password: "NewStrongPass1" },
      "https://attacker.test"
    ))).status).toBe(403);

    updateUser.mockResolvedValueOnce({ error: new Error("expired") });
    expect((await passwordPost(request("/api/auth/password", {
      password: "NewStrongPass1",
    }))).status).toBe(500);
  });
});
