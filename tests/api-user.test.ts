import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/supabase/server", () => ({ createClient }));

import { getApiUser } from "../src/lib/auth";

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
