import { describe, expect, it, vi } from "vitest";
import {
  AccountPrivacyError,
  cancelAccountDeletion,
  exportAccountData,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from "../src/features/account/server/account.service";

function rpcClient(results: Record<string, { data: unknown; error: unknown }>) {
  return {
    rpc: vi.fn((name: string) => Promise.resolve(results[name])),
  };
}

describe("account privacy service", () => {
  it("returns a portable account export", async () => {
    const exportRecord = { profile: { display_name: "Aditi" }, portfolios: [] };
    const client = rpcClient({ export_my_account_data: { data: exportRecord, error: null } });

    await expect(exportAccountData(client as never)).resolves.toEqual(exportRecord);
  });

  it("fails safely when export persistence is unavailable", async () => {
    const client = rpcClient({ export_my_account_data: { data: null, error: new Error("private detail") } });

    await expect(exportAccountData(client as never)).rejects.toMatchObject({
      code: "ACCOUNT_EXPORT_FAILED",
      status: 503,
    });
  });

  it.each([
    [{ status: "pending", scheduledFor: "2026-08-18T00:00:00Z" }],
    [{ status: "ownership_transfer_required", organizationCount: 2 }],
  ])("accepts a supported deletion outcome", async (outcome) => {
    const client = rpcClient({ request_account_deletion: { data: outcome, error: null } });
    await expect(requestAccountDeletion(client as never)).resolves.toEqual(outcome);
  });

  it("rejects malformed deletion outcomes", async () => {
    const client = rpcClient({ request_account_deletion: { data: { status: "deleted" }, error: null } });
    await expect(requestAccountDeletion(client as never)).rejects.toBeInstanceOf(AccountPrivacyError);
  });

  it.each([
    ["processing", "ACCOUNT_DELETION_PROCESSING"],
    ["completed", "ACCOUNT_DELETION_COMPLETED"],
    ["unavailable", "ACCOUNT_DELETION_NOT_AVAILABLE"],
  ])("maps the %s state to a stable conflict", async (status, code) => {
    const client = rpcClient({ request_account_deletion: { data: { status }, error: null } });
    await expect(requestAccountDeletion(client as never)).rejects.toMatchObject({ code, status: 409 });
  });

  it("cancels only requests that remain recoverable", async () => {
    const success = rpcClient({ cancel_account_deletion: { data: "canceled", error: null } });
    await expect(cancelAccountDeletion(success as never)).resolves.toBeUndefined();

    const conflict = rpcClient({ cancel_account_deletion: { data: "not_cancelable", error: null } });
    await expect(cancelAccountDeletion(conflict as never)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_NOT_CANCELABLE",
      status: 409,
    });
  });

  it("maps the owner-visible deletion status and validates its shape", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        status: "pending",
        scheduled_for: "2026-08-18T00:00:00Z",
        requested_at: "2026-08-17T00:00:00Z",
      },
      error: null,
    });
    const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) })) };

    await expect(getAccountDeletionStatus(client as never)).resolves.toEqual({
      status: "pending",
      scheduledFor: "2026-08-18T00:00:00Z",
      requestedAt: "2026-08-17T00:00:00Z",
    });
  });
});
