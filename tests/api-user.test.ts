import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
}));

vi.mock("../src/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({ redirect }));

import { getApiUser, getAuthenticatedUser } from "../src/lib/auth";

describe("getApiUser", () => {
  const getClaims = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { getClaims } });
  });

  it("returns an authenticated actor when Supabase verifies a subject claim", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null });

    await expect(getApiUser()).resolves.toMatchObject({
      status: "authenticated",
      user: { id: "user-id" },
    });
  });

  it("distinguishes a missing session from an invalid one", async () => {
    getClaims.mockResolvedValueOnce({ data: { claims: {} }, error: null });
    await expect(getApiUser()).resolves.toEqual({ status: "missing_session" });

    getClaims.mockResolvedValueOnce({ data: { claims: null }, error: new Error("token invalid") });
    await expect(getApiUser()).resolves.toEqual({ status: "invalid_session" });
  });

  it("reports Supabase client initialization failures without leaking internals", async () => {
    createClient.mockRejectedValueOnce(new Error("missing environment variable"));

    await expect(getApiUser()).resolves.toEqual({ status: "service_unavailable" });
  });
});

describe("getAuthenticatedUser", () => {
  it("returns the authenticated Supabase actor", async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } }, error: null }) },
    };
    createClient.mockResolvedValue(supabase);

    await expect(getAuthenticatedUser()).resolves.toEqual({ supabase, user: { id: "owner" } });
  });

  it.each([
    [{ data: { user: null }, error: null }],
    [{ data: { user: { id: "owner" } }, error: new Error("expired") }],
  ])("redirects when the session is not usable", async (result) => {
    createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue(result) } });

    await expect(getAuthenticatedUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
