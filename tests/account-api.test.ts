import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const exportAccountData = vi.hoisted(() => vi.fn());
const requestAccountDeletion = vi.hoisted(() => vi.fn());
const consumeAccountDeletionReauth = vi.hoisted(() => vi.fn());
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
    consumeAccountDeletionReauth,
    cancelAccountDeletion,
    getAccountDeletionStatus,
  };
});

import { GET as exportGet } from "../src/app/api/account/export/route";
import { DELETE as deletionDelete, GET as deletionGet, POST as deletionPost } from "../src/app/api/account/deletion/route";
import { DELETE as sessionsDelete } from "../src/app/api/account/sessions/route";
import { AccountPrivacyError } from "../src/features/account/server/account.service";
import { createDeletionProofCookie } from "../src/features/account/server/reauth-cookie";

const signOut = vi.fn();
const actor = { status: "authenticated", user: { id: "owner" }, supabase: { auth: { signOut } } };

function request(path: string, method = "POST", body?: unknown, cookie?: string) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      Origin: "http://local",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function deletionProofCookie() {
  const cookie = createDeletionProofCookie("11111111-1111-4111-8111-111111111111", "a".repeat(43));
  return `${cookie.name}=${cookie.value}`;
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
    consumeAccountDeletionReauth.mockResolvedValue({ status: "pending", scheduledFor: "2026-08-18T00:00:00Z" });
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

  it("schedules deletion without ending the pending account session", async () => {
    const response = await deletionPost(request(
      "/api/account/deletion", "POST", { confirmation: "DELETE" }, deletionProofCookie()
    ));
    expect(response.status).toBe(202);
    expect(consumeAccountDeletionReauth).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("does not sign out when organization ownership must be transferred", async () => {
    consumeAccountDeletionReauth.mockResolvedValue({ status: "ownership_transfer_required", organizationCount: 1 });
    const response = await deletionPost(request(
      "/api/account/deletion", "POST", { confirmation: "DELETE" }, deletionProofCookie()
    ));
    expect(response.status).toBe(409);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns a stable lock error after the worker claims deletion", async () => {
    consumeAccountDeletionReauth.mockRejectedValueOnce(new AccountPrivacyError(
      "Processing", "ACCOUNT_DELETION_PROCESSING", 409
    ));
    const response = await deletionPost(request(
      "/api/account/deletion", "POST", { confirmation: "DELETE" }, deletionProofCookie()
    ));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "ACCOUNT_DELETION_PROCESSING" });
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
    const response = await deletionPost(crossSite);
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getApiUser).not.toHaveBeenCalled();
  });

  it("does not schedule deletion without exact confirmation and a valid one-time proof", async () => {
    const invalidConfirmation = await deletionPost(request("/api/account/deletion", "POST", { confirmation: "delete" }));
    expect(invalidConfirmation.status).toBe(400);
    expect(invalidConfirmation.headers.get("Cache-Control")).toBe("private, no-store");

    const missingProof = await deletionPost(request("/api/account/deletion", "POST", { confirmation: "DELETE" }));
    expect(missingProof.status).toBe(403);
    await expect(missingProof.json()).resolves.toMatchObject({ code: "DELETION_REAUTH_REQUIRED" });
    expect(consumeAccountDeletionReauth).not.toHaveBeenCalled();
  });
});
