import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const exportAccountData = vi.hoisted(() => vi.fn());
const requestAccountDeletion = vi.hoisted(() => vi.fn());
const cancelAccountDeletion = vi.hoisted(() => vi.fn());
const getAccountDeletionStatus = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth", () => ({ getApiUser }));
vi.mock("../src/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("../src/features/account/server/account.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/account/server/account.service")>();
  return {
    ...actual,
    exportAccountData,
    requestAccountDeletion,
    cancelAccountDeletion,
    getAccountDeletionStatus,
  };
});

import { GET as exportGet } from "../src/app/api/account/export/route";
import { DELETE as deletionDelete, GET as deletionGet, POST as deletionPost } from "../src/app/api/account/deletion/route";
import { DELETE as sessionsDelete } from "../src/app/api/account/sessions/route";
import { AccountPrivacyError } from "../src/features/account/server/account.service";

const signOut = vi.fn();
const actor = { status: "authenticated", user: { id: "owner" }, supabase: { auth: { signOut } } };

function request(path: string, method = "POST") {
  return new Request(`http://local${path}`, { method, headers: { Origin: "http://local" } });
}

describe("account privacy routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    signOut.mockResolvedValue({ error: null });
    exportAccountData.mockResolvedValue({ portfolios: [] });
    getAccountDeletionStatus.mockResolvedValue(null);
    cancelAccountDeletion.mockResolvedValue(undefined);
  });

  it("requires authentication for every account operation", async () => {
    getApiUser.mockResolvedValue({ status: "missing_session" });
    expect((await exportGet(request("/api/account/export", "GET"))).status).toBe(401);
    expect((await deletionGet()).status).toBe(401);
    expect((await deletionPost(request("/api/account/deletion"))).status).toBe(401);
    expect((await deletionDelete(request("/api/account/deletion", "DELETE"))).status).toBe(401);
    expect((await sessionsDelete(request("/api/account/sessions", "DELETE"))).status).toBe(401);
  });

  it("downloads JSON with an attachment boundary", async () => {
    const response = await exportGet(request("/api/account/export", "GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    await expect(response.json()).resolves.toEqual({ portfolios: [] });
  });

  it("schedules deletion and globally revokes sessions", async () => {
    requestAccountDeletion.mockResolvedValue({ status: "pending", scheduledFor: "2026-08-18T00:00:00Z" });
    const response = await deletionPost(request("/api/account/deletion"));
    expect(response.status).toBe(202);
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("does not sign out when organization ownership must be transferred", async () => {
    requestAccountDeletion.mockResolvedValue({ status: "ownership_transfer_required", organizationCount: 1 });
    const response = await deletionPost(request("/api/account/deletion"));
    expect(response.status).toBe(409);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns stable errors and supports cancellation", async () => {
    exportAccountData.mockRejectedValueOnce(new AccountPrivacyError("Unavailable", "ACCOUNT_EXPORT_FAILED", 503));
    await expect((await exportGet(request("/api/account/export", "GET"))).json()).resolves.toMatchObject({
      code: "ACCOUNT_EXPORT_FAILED",
    });
    expect((await deletionDelete(request("/api/account/deletion", "DELETE"))).status).toBe(200);
  });

  it("revokes other sessions but keeps the current one", async () => {
    expect((await sessionsDelete(request("/api/account/sessions", "DELETE"))).status).toBe(200);
    expect(signOut).toHaveBeenCalledWith({ scope: "others" });

    signOut.mockResolvedValueOnce({ error: new Error("unavailable") });
    expect((await sessionsDelete(request("/api/account/sessions", "DELETE"))).status).toBe(503);
  });

  it("blocks cross-site mutations before authentication work", async () => {
    const crossSite = new Request("http://local/api/account/deletion", {
      method: "POST",
      headers: { Origin: "https://attacker.test" },
    });
    expect((await deletionPost(crossSite)).status).toBe(403);
    expect(getApiUser).not.toHaveBeenCalled();
  });
});
