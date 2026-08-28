import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());
const saveDashboardDraft = vi.hoisted(() => vi.fn());
const publishPortfolio = vi.hoisted(() => vi.fn());
const renewPortfolioLink = vi.hoisted(() => vi.fn());
const rotatePortfolioLink = vi.hoisted(() => vi.fn());
const unpublishPortfolio = vi.hoisted(() => vi.fn());
const managePortfolioGrant = vi.hoisted(() => vi.fn());
const uploadPortfolioPhoto = vi.hoisted(() => vi.fn());
const updatePortfolioPhoto = vi.hoisted(() => vi.fn());
const deletePortfolioPhoto = vi.hoisted(() => vi.fn());
const uploadHoroscope = vi.hoisted(() => vi.fn());
const deleteHoroscope = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth", () => ({ getApiUser }));
vi.mock("../src/lib/supabase/server", () => ({ createClient }));
vi.mock("../src/features/portfolio/server/dashboard.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/portfolio/server/dashboard.service")>();
  return { ...actual, saveDashboardDraft };
});
vi.mock("../src/features/portfolio/server/publish.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/portfolio/server/publish.service")>();
  return { ...actual, publishPortfolio };
});
vi.mock("../src/features/portfolio/server/renew.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/portfolio/server/renew.service")>();
  return { ...actual, renewPortfolioLink };
});
vi.mock("../src/features/portfolio/server/share-lifecycle.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/portfolio/server/share-lifecycle.service")>();
  return { ...actual, rotatePortfolioLink, unpublishPortfolio };
});
vi.mock("../src/features/access/server/access.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/access/server/access.service")>();
  return { ...actual, managePortfolioGrant };
});
vi.mock("../src/features/media/server/media.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/media/server/media.service")>();
  return { ...actual, uploadPortfolioPhoto, updatePortfolioPhoto, deletePortfolioPhoto };
});
vi.mock("../src/features/horoscope/server/horoscope.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/horoscope/server/horoscope.service")>();
  return { ...actual, uploadHoroscope, deleteHoroscope };
});
vi.mock("../src/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));

import { GET as authCallback } from "../src/app/api/auth/callback/route";
import { PUT as dashboardPut } from "../src/app/api/dashboard/route";
import { DELETE as mediaDelete, PATCH as mediaPatch, POST as mediaPost } from "../src/app/api/portfolio-media/route";
import { DELETE as horoscopeDelete, POST as horoscopePost } from "../src/app/api/portfolio-horoscope/route";
import { GET as horoscopeView } from "../src/app/api/portfolio-horoscope/view/route";
import { POST as publishPost } from "../src/app/api/portfolio/publish/route";
import { POST as renewPost } from "../src/app/api/portfolio/renew/route";
import { POST as rotatePost } from "../src/app/api/portfolio/share/rotate/route";
import { POST as unpublishPost } from "../src/app/api/portfolio/share/unpublish/route";
import { PATCH as accessGrantPatch } from "../src/app/api/access-grants/[id]/route";
import { DashboardSaveError } from "../src/features/portfolio/server/dashboard.service";
import { PortfolioMediaError } from "../src/features/media/server/media.service";
import { HoroscopeError } from "../src/features/horoscope/server/horoscope.service";
import { PortfolioPublishError } from "../src/features/portfolio/server/publish.service";
import { PortfolioRenewalError } from "../src/features/portfolio/server/renew.service";
import { PortfolioShareLifecycleError } from "../src/features/portfolio/server/share-lifecycle.service";
import { AccessLifecycleError } from "../src/features/access/server/access.service";

const actor = { status: "authenticated", user: { id: "owner" }, supabase: {} };
const accessGrantId = "11111111-1111-4111-8111-111111111111";
const data = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
  astrology: { rashi: "kanya" },
  style: { rashi_palette: "kanya-midnight" },
};

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", Origin: new URL(url).origin },
    body: JSON.stringify(body),
  });
}

function mutationRequest(url: string, method = "POST", body?: BodyInit) {
  return new Request(url, {
    method,
    headers: { Origin: new URL(url).origin },
    body,
  });
}

describe("API route authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    getApiUser.mockResolvedValue(actor);
    saveDashboardDraft.mockResolvedValue({ portfolioId: "portfolio" });
    publishPortfolio.mockResolvedValue({ shareUrl: "https://example.test/p/token", expiresAt: "2099-01-01", action: "created" });
    renewPortfolioLink.mockResolvedValue({ expiresAt: "2099-01-01" });
    rotatePortfolioLink.mockResolvedValue({ shareUrl: "https://example.test/p/new", shareToken: "new" });
    unpublishPortfolio.mockResolvedValue({ status: "unpublished" });
    managePortfolioGrant.mockResolvedValue({ status: "renewed", expiresAt: "2099-02-01" });
  });

  it.each([
    ["dashboard", () => dashboardPut(jsonRequest("http://local/api/dashboard", "PUT", { data }))],
    ["publish", () => publishPost(jsonRequest("http://local/api/portfolio/publish", "POST", { data }))],
    ["renew", () => renewPost(mutationRequest("http://local/api/portfolio/renew"))],
    ["rotate", () => rotatePost(mutationRequest("http://local/api/portfolio/share/rotate"))],
    ["unpublish", () => unpublishPost(mutationRequest("http://local/api/portfolio/share/unpublish"))],
    ["access grant", () => accessGrantPatch(
      jsonRequest(`http://local/api/access-grants/${accessGrantId}`, "PATCH", { action: "renew" }),
      { params: Promise.resolve({ id: accessGrantId }) }
    )],
    ["owner horoscope view", () => horoscopeView(new Request("http://local/api/portfolio-horoscope/view"))],
  ])("rejects missing sessions on %s", async (_name, call) => {
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await call()).status).toBe(401);
  });
});

describe("dashboard and portfolio lifecycle routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    getApiUser.mockResolvedValue(actor);
    saveDashboardDraft.mockResolvedValue({ portfolioId: "portfolio" });
    publishPortfolio.mockResolvedValue({ shareUrl: "https://example.test/p/token", expiresAt: "2099-01-01", action: "created" });
    renewPortfolioLink.mockResolvedValue({ expiresAt: "2099-01-01" });
    rotatePortfolioLink.mockResolvedValue({ shareUrl: "https://example.test/p/new", shareToken: "new" });
    unpublishPortfolio.mockResolvedValue({ status: "unpublished" });
    managePortfolioGrant.mockResolvedValue({ status: "renewed", expiresAt: "2099-02-01" });
  });

  it("validates and saves dashboard drafts", async () => {
    expect((await dashboardPut(mutationRequest("http://local/api/dashboard", "PUT", "{"))).status).toBe(400);
    expect((await dashboardPut(jsonRequest("http://local/api/dashboard", "PUT", { data: { personal: { gender: "other" } } }))).status).toBe(400);
    const response = await dashboardPut(jsonRequest("http://local/api/dashboard", "PUT", { data }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ portfolioId: "portfolio" });
  });

  it("maps dashboard failures without leaking unknown errors", async () => {
    saveDashboardDraft.mockRejectedValueOnce(new DashboardSaveError("Could not save portfolio"));
    expect(await (await dashboardPut(jsonRequest("http://local/api/dashboard", "PUT", { data }))).json()).toMatchObject({ error: "Could not save portfolio" });
    saveDashboardDraft.mockRejectedValueOnce(new Error("database password"));
    expect(await (await dashboardPut(jsonRequest("http://local/api/dashboard", "PUT", { data }))).json()).toMatchObject({ error: "Unable to save portfolio details" });
  });

  it("publishes valid data and reports validation and domain errors", async () => {
    expect((await publishPost(mutationRequest("http://local/api/portfolio/publish", "POST", "{"))).status).toBe(400);
    const success = await publishPost(jsonRequest("http://local/api/portfolio/publish", "POST", { data }));
    expect(await success.json()).toMatchObject({ ok: true, action: "created" });
    expect(saveDashboardDraft).toHaveBeenCalledBefore(publishPortfolio);

    publishPortfolio.mockRejectedValueOnce(new PortfolioPublishError("Not ready", "PORTFOLIO_NOT_READY", 400));
    const failure = await publishPost(jsonRequest("http://local/api/portfolio/publish", "POST", { data }));
    expect(failure.status).toBe(400);
    expect(await failure.json()).toMatchObject({ code: "PORTFOLIO_NOT_READY", error: "Not ready" });
  });

  it("handles renew, rotate, and unpublish success and failures", async () => {
    expect((await renewPost(mutationRequest("http://local/api/portfolio/renew"))).status).toBe(200);
    expect(await (await rotatePost(mutationRequest("http://local/api/portfolio/share/rotate"))).json()).toMatchObject({ shareToken: "new" });
    expect(await (await unpublishPost(mutationRequest("http://local/api/portfolio/share/unpublish"))).json()).toEqual({ status: "unpublished" });

    renewPortfolioLink.mockRejectedValueOnce(new PortfolioRenewalError("Not published", "PORTFOLIO_NOT_PUBLISHED", 400));
    expect((await renewPost(mutationRequest("http://local/api/portfolio/renew"))).status).toBe(400);
    rotatePortfolioLink.mockRejectedValueOnce(new PortfolioShareLifecycleError("Cannot rotate", "ROTATE_FAILED", 409));
    expect((await rotatePost(mutationRequest("http://local/api/portfolio/share/rotate"))).status).toBe(409);
    unpublishPortfolio.mockRejectedValueOnce(new Error("private database detail"));
    const response = await unpublishPost(mutationRequest("http://local/api/portfolio/share/unpublish"));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: "PORTFOLIO_UNPUBLISH_FAILED" });
  });

  it("validates and safely maps owner grant actions", async () => {
    const success = await accessGrantPatch(
      jsonRequest(`http://local/api/access-grants/${accessGrantId}`, "PATCH", { action: "renew" }),
      { params: Promise.resolve({ id: accessGrantId }) }
    );
    expect(await success.json()).toMatchObject({ status: "renewed", expiresAt: "2099-02-01" });
    expect(managePortfolioGrant).toHaveBeenCalledWith(actor.supabase, accessGrantId, "renew");

    const invalid = await accessGrantPatch(
      jsonRequest("http://local/api/access-grants/not-a-uuid", "PATCH", { action: "delete" }),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(invalid.status).toBe(400);

    managePortfolioGrant.mockRejectedValueOnce(
      new AccessLifecycleError("Only approved access can be renewed.", "ACCESS_INVALID_TRANSITION", 409)
    );
    const conflict = await accessGrantPatch(
      jsonRequest(`http://local/api/access-grants/${accessGrantId}`, "PATCH", { action: "renew" }),
      { params: Promise.resolve({ id: accessGrantId }) }
    );
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      code: "ACCESS_INVALID_TRANSITION",
      error: "Only approved access can be renewed.",
    });
  });
});

describe("portfolio media route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    getApiUser.mockResolvedValue(actor);
    uploadPortfolioPhoto.mockResolvedValue({ id: "media" });
    updatePortfolioPhoto.mockResolvedValue({ id: "media", visibility: "public" });
    deletePortfolioPhoto.mockResolvedValue(undefined);
  });

  it("validates and uploads a photo", async () => {
    const invalid = new FormData();
    expect((await mediaPost(mutationRequest("http://local/api/portfolio-media", "POST", invalid))).status).toBe(400);
    const form = new FormData();
    form.set("photo", new File(["image"], "photo.png", { type: "image/png" }));
    form.set("portfolioId", "portfolio");
    form.set("visibility", "public");
    expect(await (await mediaPost(mutationRequest("http://local/api/portfolio-media", "POST", form))).json()).toEqual({ media: { id: "media" } });
  });

  it("validates, updates, and deletes media", async () => {
    expect((await mediaPatch(mutationRequest("http://local/api/portfolio-media", "PATCH", "{"))).status).toBe(400);
    expect((await mediaPatch(jsonRequest("http://local/api/portfolio-media", "PATCH", { mediaId: "bad" }))).status).toBe(400);
    const mediaId = "8f378bb8-ec91-4f3f-90ef-b7eea2c01506";
    expect((await mediaPatch(jsonRequest("http://local/api/portfolio-media", "PATCH", { mediaId, visibility: "public" }))).status).toBe(200);
    expect((await mediaDelete(mutationRequest("http://local/api/portfolio-media", "DELETE"))).status).toBe(400);
    expect((await mediaDelete(mutationRequest(`http://local/api/portfolio-media?mediaId=${mediaId}`, "DELETE"))).status).toBe(200);
  });

  it("preserves domain status and hides unknown errors", async () => {
    updatePortfolioPhoto.mockRejectedValueOnce(new PortfolioMediaError("Photo not found", 404));
    const mediaId = "8f378bb8-ec91-4f3f-90ef-b7eea2c01506";
    expect((await mediaPatch(jsonRequest("http://local/api/portfolio-media", "PATCH", { mediaId, visibility: "public" }))).status).toBe(404);
    deletePortfolioPhoto.mockRejectedValueOnce(new Error("secret"));
    const response = await mediaDelete(mutationRequest(`http://local/api/portfolio-media?mediaId=${mediaId}`, "DELETE"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "PHOTO_OPERATION_FAILED",
      error: "Unable to manage photo",
    });
  });
});

describe("horoscope attachment route", () => {
  const portfolioId = "8f378bb8-ec91-4f3f-90ef-b7eea2c01506";

  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
    getApiUser.mockResolvedValue(actor);
    uploadHoroscope.mockResolvedValue({ id: "horoscope", portfolio_id: portfolioId });
    deleteHoroscope.mockResolvedValue(undefined);
  });

  it("requires authentication and validates upload identity", async () => {
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await horoscopePost(mutationRequest("http://local/api/portfolio-horoscope", "POST", new FormData()))).status).toBe(401);

    const invalid = new FormData();
    invalid.set("horoscope", new File(["%PDF-1.7"], "chart.pdf", { type: "application/pdf" }));
    invalid.set("portfolioId", "not-a-uuid");
    expect((await horoscopePost(mutationRequest("http://local/api/portfolio-horoscope", "POST", invalid))).status).toBe(400);
  });

  it("uploads and deletes the one attachment", async () => {
    const form = new FormData();
    form.set("horoscope", new File(["%PDF-1.7"], "chart.pdf", { type: "application/pdf" }));
    form.set("portfolioId", portfolioId);
    form.set("language", "Kannada");
    expect(await (await horoscopePost(mutationRequest("http://local/api/portfolio-horoscope", "POST", form))).json()).toMatchObject({ horoscope: { id: "horoscope" } });
    expect(uploadHoroscope).toHaveBeenCalledWith(expect.objectContaining({ portfolioId, language: "Kannada" }));

    expect((await horoscopeDelete(mutationRequest("http://local/api/portfolio-horoscope", "DELETE"))).status).toBe(400);
    expect((await horoscopeDelete(mutationRequest(`http://local/api/portfolio-horoscope?horoscopeId=${portfolioId}`, "DELETE"))).status).toBe(200);
  });

  it("preserves safe domain errors", async () => {
    uploadHoroscope.mockRejectedValueOnce(new HoroscopeError("Use a file up to 20MB", 413));
    const form = new FormData();
    form.set("horoscope", new File(["%PDF-1.7"], "chart.pdf", { type: "application/pdf" }));
    form.set("portfolioId", portfolioId);
    const response = await horoscopePost(mutationRequest("http://local/api/portfolio-horoscope", "POST", form));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      code: "HOROSCOPE_TOO_LARGE",
      error: "Use a file up to 20MB",
    });
  });

  it("opens the owner's attachment through a short-lived signed URL", async () => {
    const portfolioSingle = vi.fn().mockResolvedValue({ data: { id: portfolioId } });
    const horoscopeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "horoscope-id",
        portfolio_id: portfolioId,
        storage_path: `${portfolioId}/original/chart.pdf`,
        mime_type: "application/pdf",
        file_extension: "pdf",
        byte_size: 1024,
        language_label: "Kannada",
        page_count: 2,
        published_at: null,
        created_at: "2026-08-04T00:00:00Z",
        updated_at: "2026-08-04T00:00:00Z",
      },
    });
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => table === "portfolios"
          ? { single: portfolioSingle }
          : { maybeSingle: horoscopeSingle }),
      })),
    }));
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.test/chart.pdf?token=short-lived" },
      error: null,
    });
    getApiUser.mockResolvedValueOnce({
      status: "authenticated",
      user: { id: "owner" },
      supabase: { from, storage: { from: vi.fn(() => ({ createSignedUrl })) } },
    });

    const response = await horoscopeView(new Request("http://local/api/portfolio-horoscope/view"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://storage.test/chart.pdf?token=short-lived");
    expect(createSignedUrl).toHaveBeenCalledWith(`${portfolioId}/original/chart.pdf`, 300, undefined);
  });
});

describe("authentication callback", () => {
  it("redirects failed callbacks to login", async () => {
    const origin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : "http://local";
    expect((await authCallback(new Request("http://local/api/auth/callback"))).headers.get("location")).toBe(`${origin}/login?error=auth_failed`);
  });

  it("creates a portfolio for a new authenticated user", async () => {
    const createdSingle = vi.fn().mockResolvedValue({ data: { id: "portfolio-id" }, error: null });
    const insertSelect = vi.fn(() => ({ single: createdSingle }));
    const insert = vi.fn(() => ({ select: insertSelect }));
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select, insert }));
    createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner", user_metadata: {} } } }),
      },
      from,
    });
    const response = await authCallback(new Request("http://local/api/auth/callback?code=ok&next=/edit"));
    const origin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : "http://local";
    expect(response.headers.get("location")).toBe(`${origin}/edit`);
    expect(insert).toHaveBeenCalled();
  });
});
