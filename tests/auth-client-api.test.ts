// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { startAuthentication } from "../src/features/auth/client/auth.api";

afterEach(() => vi.unstubAllGlobals());

describe("auth client API", () => {
  it("posts authentication requests only to the same-origin gateway", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(startAuthentication({
      method: "password_signin",
      email: "reader@example.com",
      password: "Wedding2026",
      redirect: "/dashboard",
    })).resolves.toEqual({ ok: true, body: { authenticated: true } });
    expect(fetch).toHaveBeenCalledWith("/api/auth/start", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        method: "password_signin",
        email: "reader@example.com",
        password: "Wedding2026",
        redirect: "/dashboard",
      }),
    }));
  });

  it("handles a non-JSON gateway failure safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(startAuthentication({ method: "google", redirect: "/dashboard" }))
      .resolves.toEqual({ ok: false, body: null });
  });

  it("turns a network failure into a safe retryable response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network details")));
    await expect(startAuthentication({ method: "google", redirect: "/dashboard" }))
      .resolves.toEqual({
        ok: false,
        body: {
          code: "AUTH_NETWORK_ERROR",
          error: "We could not connect. Check your internet connection and try again.",
        },
      });
  });
});
