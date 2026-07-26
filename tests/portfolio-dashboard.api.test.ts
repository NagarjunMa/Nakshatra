import { afterEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";
import {
  publishPortfolioRequest,
  renewPortfolioLinkRequest,
} from "../src/features/portfolio/client/portfolio-dashboard.api";

const draft: PortfolioData = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
  astrology: { rashi: "kanya" },
  style: { rashi_palette: "kanya-midnight" },
};

describe("portfolio dashboard API client", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends a publish request and returns the typed public-link result", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ shareUrl: "https://nakshatra.example/p/token", expiresAt: "2099-01-01", action: "created" }), { status: 200 })
    );

    await expect(publishPortfolioRequest(draft)).resolves.toMatchObject({
      ok: true,
      data: { action: "created", shareUrl: expect.stringContaining("/p/") },
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/portfolio/publish",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("preserves structured authentication errors for the dashboard", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "AUTH_SESSION_INVALID", error: "We could not verify your session." }), { status: 401 })
    );

    await expect(renewPortfolioLinkRequest()).resolves.toEqual({
      ok: false,
      error: { code: "AUTH_SESSION_INVALID", message: "We could not verify your session.", status: 401 },
    });
  });

  it("returns a useful message when the browser cannot reach the API", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("offline"));

    await expect(renewPortfolioLinkRequest()).resolves.toMatchObject({
      ok: false,
      error: { code: "NETWORK_UNAVAILABLE", status: 0 },
    });
  });
});
