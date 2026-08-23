import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.hoisted(() => vi.fn(() => ({ kind: "browser" })));
const createServerClient = vi.hoisted(() => vi.fn());
const cookies = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({ createBrowserClient, createServerClient }));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("../src/lib/env", () => ({
  env: { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable" },
}));

import { NextRequest } from "next/server";
import { createClient as createBrowserSupabase } from "../src/lib/supabase/client";
import { createClient as createServerSupabase } from "../src/lib/supabase/server";
import { updateSession } from "../src/lib/supabase/proxy";

describe("Supabase client factories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the browser client from validated public configuration", () => {
    expect(createBrowserSupabase()).toEqual({ kind: "browser" });
    expect(createBrowserClient).toHaveBeenCalledWith("https://project.supabase.co", "publishable");
  });

  it("bridges server cookies and tolerates read-only component stores", async () => {
    const getAll = vi.fn(() => [{ name: "session", value: "value" }]);
    const set = vi.fn();
    cookies.mockResolvedValue({ getAll, set });
    let cookieAdapter: { getAll: () => unknown; setAll: (values: Array<{ name: string; value: string; options: object }>) => void } | undefined;
    createServerClient.mockImplementation((_url, _key, options) => {
      cookieAdapter = options.cookies;
      return { kind: "server" };
    });
    expect(await createServerSupabase()).toEqual({ kind: "server" });
    expect(cookieAdapter?.getAll()).toEqual([{ name: "session", value: "value" }]);
    cookieAdapter?.setAll([{ name: "session", value: "new", options: { secure: true } }]);
    expect(set).toHaveBeenCalled();

    set.mockImplementationOnce(() => { throw new Error("read-only"); });
    expect(() => cookieAdapter?.setAll([{ name: "session", value: "new", options: {} }])).not.toThrow();
  });
});

describe("Supabase request session proxy", () => {
  let adapter: { getAll: () => unknown; setAll: (values: Array<{ name: string; value: string; options: object }>) => void };
  const getClaims = vi.fn();
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: true, error: null });
    createServerClient.mockImplementation((_url, _key, options) => {
      adapter = options.cookies;
      return { auth: { getClaims }, rpc };
    });
  });

  it("redirects unauthenticated protected routes and preserves the destination", async () => {
    getClaims.mockResolvedValue({ data: { claims: null } });
    const response = await updateSession(new NextRequest("https://app.test/dashboard/settings"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.test/login?redirect=%2Fdashboard%2Fsettings");
  });

  it("redirects authenticated users away from login and passes public pages through", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } } });
    expect((await updateSession(new NextRequest("https://app.test/login"))).headers.get("location")).toBe("https://app.test/dashboard");
    expect((await updateSession(new NextRequest("https://app.test/about"))).status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("treats revoked and unverifiable sessions as signed out without matching sibling routes", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } } });
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await updateSession(new NextRequest("https://app.test/login"))).status).toBe(200);

    rpc.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });
    const protectedResponse = await updateSession(new NextRequest("https://app.test/account"));
    expect(protectedResponse.headers.get("location")).toBe("https://app.test/login?redirect=%2Faccount");

    expect((await updateSession(new NextRequest("https://app.test/dashboard-old"))).status).toBe(200);
  });

  it("reads incoming cookies and propagates refreshed cookies", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "owner" } } });
    const request = new NextRequest("https://app.test/about", { headers: { cookie: "old=value" } });
    await updateSession(request);
    expect(adapter.getAll()).toEqual(expect.arrayContaining([expect.objectContaining({ name: "old", value: "value" })]));
    adapter.setAll([{ name: "session", value: "fresh", options: { httpOnly: true } }]);
    expect(request.cookies.get("session")?.value).toBe("fresh");
  });
});
