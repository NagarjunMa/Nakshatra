import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recordPublicPortfolioView,
  resolveApprovedHoroscope,
  resolvePortfolioView,
  resolvePublicPortfolio,
} from "../src/features/portfolio/server/public-portfolio.service";

const publicPayload = {
  data: {
    privacy_mode: "private",
    personal: { name: "Aditi", age: 29, gender: "female" },
    astrology: { rashi: "kanya" },
  },
  templateId: 3,
  themeColor: "#17151c",
  sunSign: "kanya",
  media: [{
    key: "safe-key",
    accessPath: "owner/portfolio/hero.webp",
    altText: "Aditi portrait",
    mediaType: "hero",
    sortOrder: 0,
    width: 800,
    height: 1200,
    presentation: "clear",
  }],
};

function client(outcomes: Record<string, { data: unknown; error?: unknown }>) {
  const rpc = vi.fn((name: string) => Promise.resolve(outcomes[name] ?? { data: null, error: null }));
  const createSignedUrl = vi.fn((path: string) => Promise.resolve({
    data: { signedUrl: `https://signed.test/${path}` },
    error: null,
  }));
  return {
    supabase: {
      rpc,
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as unknown as SupabaseClient,
    rpc,
    createSignedUrl,
  };
}

describe("public portfolio service", () => {
  it("returns only valid token-resolver payloads", async () => {
    const valid = client({ resolve_public_portfolio: { data: publicPayload } });
    await expect(resolvePublicPortfolio(valid.supabase, "valid-token")).resolves.toMatchObject({
      data: { personal: { name: "Aditi" } },
    });
    expect(valid.rpc).toHaveBeenCalledWith("resolve_public_portfolio", { p_share_token: "valid-token" });

    const malformed = client({ resolve_public_portfolio: { data: { portfolioId: "private-id" } } });
    await expect(resolvePublicPortfolio(malformed.supabase, "valid-token")).resolves.toBeNull();
  });

  it("signs only descriptors returned by the public resolver", async () => {
    const fixture = client({ resolve_public_portfolio: { data: publicPayload } });
    const view = await resolvePortfolioView(fixture.supabase, "valid-token", false);
    expect(view).toMatchObject({
      accessMode: "public",
      photos: [{
        id: "safe-key",
        src: "https://signed.test/owner/portfolio/hero.webp",
        orientation: "portrait",
      }],
    });
    expect(fixture.rpc).not.toHaveBeenCalledWith("resolve_approved_portfolio", expect.anything());
  });

  it("uses an approved projection only when the database returns one", async () => {
    const approved = {
      ...publicPayload,
      accessExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      data: { ...publicPayload.data, personal: { ...publicPayload.data.personal, name: "Approved Aditi" } },
    };
    const fixture = client({
      resolve_public_portfolio: { data: publicPayload },
      resolve_approved_portfolio: { data: approved },
    });
    const view = await resolvePortfolioView(fixture.supabase, "valid-token", true);
    expect(view?.accessMode).toBe("approved");
    expect(view?.data.personal.name).toBe("Approved Aditi");
  });

  it("records views by token and signs approved horoscopes briefly", async () => {
    const fixture = client({
      record_public_portfolio_view: { data: true },
      resolve_approved_horoscope: { data: {
        accessPath: "owner/portfolio/private.webp",
        mimeType: "image/webp",
        fileExtension: "webp",
        profileName: "Aditi",
        accessExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      } },
    });
    await recordPublicPortfolioView(fixture.supabase, "valid-token");
    expect(fixture.rpc).toHaveBeenCalledWith("record_public_portfolio_view", { p_share_token: "valid-token" });

    const horoscope = await resolveApprovedHoroscope(fixture.supabase, "valid-token");
    expect(horoscope?.signedUrl).toContain("private.webp");
    expect(fixture.createSignedUrl).toHaveBeenCalledWith(
      "owner/portfolio/private.webp",
      expect.any(Number),
      undefined
    );
  });
});
