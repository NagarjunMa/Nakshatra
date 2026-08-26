import { afterEach, describe, expect, it, vi } from "vitest";
const signOut = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));
import {
  cancelAccountDeletionRequest,
  clearLocalAccountSession,
  downloadAccountExportRequest,
  requestAccountDeletionRequest,
  revokeOtherSessionsRequest,
} from "../src/features/account/client/account.api";

afterEach(() => vi.unstubAllGlobals());

describe("account browser API", () => {
  it("clears the local Supabase credentials after account deletion", async () => {
    signOut.mockResolvedValue({ error: null });
    await clearLocalAccountSession();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("returns an export blob and uses explicit methods", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const result = await downloadAccountExportRequest();
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/account/export", { method: "GET" });
  });

  it("maps server and network failures without exposing internals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ code: "ACCOUNT_EXPORT_FAILED", error: "Export unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )));
    await expect(downloadAccountExportRequest()).resolves.toMatchObject({
      ok: false,
      code: "ACCOUNT_EXPORT_FAILED",
      message: "Export unavailable",
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network detail")));
    await expect(revokeOtherSessionsRequest()).resolves.toMatchObject({
      ok: false,
      code: "NETWORK_UNAVAILABLE",
    });
  });

  it("calls the deletion and session endpoints with the expected verbs", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetch);

    await revokeOtherSessionsRequest();
    await requestAccountDeletionRequest();
    await cancelAccountDeletionRequest();
    expect(fetch.mock.calls).toEqual([
      ["/api/account/sessions", { method: "DELETE" }],
      ["/api/account/deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }],
      ["/api/account/deletion", { method: "DELETE" }],
    ]);
  });
});
