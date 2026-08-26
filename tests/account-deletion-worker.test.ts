import { describe, expect, it, vi } from "vitest";
import { createAccountDeletionWorker } from "../scripts/account-deletion-worker.mjs";

const claim = {
  request_id: "request",
  user_id: "user",
  claim_token: "claim",
  processing_stage: "claimed",
};

function workerClient({
  requests = [claim],
  rpcResults = {},
  storageError = null,
  authError = null,
}: {
  requests?: Array<Record<string, unknown>>;
  rpcResults?: Record<string, { data?: unknown; error?: unknown }>;
  storageError?: unknown;
  authError?: unknown;
} = {}) {
  const rpc = vi.fn((name: string) => Promise.resolve(
    rpcResults[name] ?? (name === "claim_account_deletion_batch"
      ? { data: requests, error: null }
      : { data: name === "prepare_account_deletion" ? {} : true, error: null })
  ));
  const list = vi.fn().mockResolvedValue({ data: [{ id: "object", name: "private.webp" }], error: storageError });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const storage = { from: vi.fn(() => ({ list, remove })) };
  const deleteUser = vi.fn().mockResolvedValue({ error: authError });
  return { client: { rpc, storage, auth: { admin: { deleteUser } } }, rpc, list, remove, deleteUser };
}

describe("account deletion worker", () => {
  it("runs the six deletion stages and writes the completion receipt", async () => {
    const { client, rpc, list, remove, deleteUser } = workerClient();
    const result = await createAccountDeletionWorker(client).run(10);

    expect(result).toMatchObject({ claimed: 1, completed: 1, deferred: 0 });
    expect(list).toHaveBeenCalledTimes(4);
    expect(remove).toHaveBeenCalledTimes(4);
    expect(deleteUser).toHaveBeenCalledWith("user");
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "claim_account_deletion_batch",
      "advance_account_deletion_stage",
      "prepare_account_deletion",
      "advance_account_deletion_stage",
      "record_account_deletion_auth_deleted",
      "complete_account_deletion",
    ]);
    expect(rpc).toHaveBeenCalledWith("advance_account_deletion_stage", expect.objectContaining({
      p_stage: "initial_storage_cleaned",
      p_claim_token: "claim",
    }));
    expect(rpc).toHaveBeenCalledWith("advance_account_deletion_stage", expect.objectContaining({
      p_stage: "final_storage_cleaned",
      p_claim_token: "claim",
    }));
  });

  it("persists an owned retry when destructive work fails before Auth deletion", async () => {
    const { client, rpc, deleteUser } = workerClient({ storageError: new Error("provider detail") });
    const result = await createAccountDeletionWorker(client).run(10);

    expect(result).toMatchObject({ claimed: 1, completed: 0, deferred: 1 });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("fail_account_deletion", {
      p_request_id: "request",
      p_claim_token: "claim",
      p_error_code: "STORAGE_LIST_FAILED",
    });
  });

  it("terminates when retry-state persistence cannot be verified", async () => {
    const { client, rpc } = workerClient({
      storageError: new Error("provider detail"),
      rpcResults: { fail_account_deletion: { data: false, error: null } },
    });

    await expect(createAccountDeletionWorker(client).run(10)).rejects.toThrow("FAILURE_STATE_PERSISTENCE_FAILED");
    expect(rpc).toHaveBeenCalledWith("fail_account_deletion", expect.any(Object));
  });

  it("does not convert an Auth-deleted account back into retryable work when receipt persistence fails", async () => {
    const { client, rpc } = workerClient({
      rpcResults: { complete_account_deletion: { data: false, error: null } },
    });

    await expect(createAccountDeletionWorker(client).run(10)).rejects.toThrow("RECEIPT_PERSISTENCE_FAILED");
    expect(rpc).not.toHaveBeenCalledWith("fail_account_deletion", expect.any(Object));
  });

  it("resumes a reclaimed Auth-deleted record by persisting its receipt without repeating destructive work", async () => {
    const resumed = { ...claim, user_id: null, processing_stage: "auth_deleted" };
    const { client, rpc, list, deleteUser } = workerClient({ requests: [resumed] });

    await expect(createAccountDeletionWorker(client).run(1)).resolves.toMatchObject({ completed: 1, deferred: 0 });
    expect(list).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "claim_account_deletion_batch",
      "complete_account_deletion",
    ]);
  });
});
