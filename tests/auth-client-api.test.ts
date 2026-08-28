// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  continueToAuthProvider,
  startAuthentication,
  updateRecoveredPassword,
  verifyAuthenticationCode,
} from "../src/features/auth/client/auth.api";

afterEach(() => vi.unstubAllGlobals());

describe("auth client API", () => {
  it("posts authentication requests only to the same-origin gateway", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sent: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(startAuthentication({ method: "email_otp", email: "reader@example.com", redirect: "/dashboard" }))
      .resolves.toEqual({ ok: true, body: { sent: true } });
    expect(fetch).toHaveBeenCalledWith("/api/auth/start", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ method: "email_otp", email: "reader@example.com", redirect: "/dashboard" }),
    }));
  });

  it("handles a non-JSON gateway failure safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(startAuthentication({ method: "google", redirect: "/dashboard" }))
      .resolves.toEqual({ ok: false, body: null });
  });

  it("uses the guarded verification and password endpoints", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ verified: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ updated: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await verifyAuthenticationCode({
      purpose: "viewer_interest",
      email: "reader@example.com",
      token: "123456",
      redirect: "/p/token",
    });
    await updateRecoveredPassword("strong-pass-1");

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/auth/verify", expect.objectContaining({ method: "POST" }));
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/auth/password", expect.objectContaining({
      body: JSON.stringify({ password: "strong-pass-1" }),
    }));
  });

  it("leaves the app only for the provider URL returned by the gateway", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign },
    });
    continueToAuthProvider("https://accounts.google.test/oauth");
    expect(assign).toHaveBeenCalledWith("https://accounts.google.test/oauth");
  });
});
