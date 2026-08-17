// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { startAuthentication } from "../src/features/auth/client/auth.api";

afterEach(() => vi.unstubAllGlobals());

describe("auth client API", () => {
  it("posts authentication requests only to the same-origin gateway", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sent: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(startAuthentication({ method: "email", email: "reader@example.com", redirect: "/dashboard" }))
      .resolves.toEqual({ ok: true, body: { sent: true } });
    expect(fetch).toHaveBeenCalledWith("/api/auth/start", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ method: "email", email: "reader@example.com", redirect: "/dashboard" }),
    }));
  });

  it("handles a non-JSON gateway failure safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(startAuthentication({ method: "google", redirect: "/dashboard" }))
      .resolves.toEqual({ ok: false, body: null });
  });
});
