import { describe, expect, it, vi } from "vitest";
import {
  AccountPrivacyError,
  completeAccountDeletionReauth,
  consumeAccountDeletionReauth,
  startAccountDeletionReauth,
} from "../src/features/account/server/account.service";

const challengeId = "11111111-1111-4111-8111-111111111111";
const proofHash = "a".repeat(64);

function rpcClient(results: Record<string, { data: unknown; error: unknown }>) {
  return { rpc: vi.fn((name: string) => Promise.resolve(results[name])) };
}

describe("account deletion reauthentication service", () => {
  it("validates and returns a started challenge", async () => {
    const client = rpcClient({
      start_account_deletion_reauth: {
        data: { status: "started", challengeId, expiresAt: "2026-08-24T06:10:00.000Z" },
        error: null,
      },
    });

    await expect(startAccountDeletionReauth(client as never, challengeId)).resolves.toMatchObject({ status: "started", challengeId });
    expect(client.rpc).toHaveBeenCalledWith("start_account_deletion_reauth", { p_initiating_session_id: challengeId });
  });

  it("fails closed when challenge start or callback completion is malformed", async () => {
    const unavailable = rpcClient({ start_account_deletion_reauth: { data: null, error: new Error("private") } });
    await expect(startAccountDeletionReauth(unavailable as never, challengeId)).rejects.toMatchObject({
      code: "DELETION_REAUTH_START_FAILED",
      status: 503,
    });

    const malformed = rpcClient({ complete_account_deletion_reauth: { data: "unexpected", error: null } });
    await expect(completeAccountDeletionReauth(malformed as never, challengeId, proofHash)).rejects.toMatchObject({
      code: "DELETION_REAUTH_CALLBACK_FAILED",
      status: 503,
    });
  });

  it("passes through a verified callback and rejects invalid or expired proof consumption", async () => {
    const verified = rpcClient({ complete_account_deletion_reauth: { data: "verified", error: null } });
    await expect(completeAccountDeletionReauth(verified as never, challengeId, proofHash)).resolves.toBe("verified");
    expect(verified.rpc).toHaveBeenCalledWith("complete_account_deletion_reauth", {
      p_challenge_id: challengeId,
      p_proof_hash: proofHash,
    });

    for (const [status, code] of [["proof_invalid", "DELETION_REAUTH_REQUIRED"], ["proof_expired", "DELETION_REAUTH_EXPIRED"]] as const) {
      const client = rpcClient({ consume_account_deletion_reauth: { data: { status }, error: null } });
      await expect(consumeAccountDeletionReauth(client as never, proofHash)).rejects.toMatchObject({
        code,
        status: 403,
      });
    }
  });

  it("does not turn unexpected consumption output into an authorization success", async () => {
    const client = rpcClient({ consume_account_deletion_reauth: { data: { status: "verified" }, error: null } });
    await expect(consumeAccountDeletionReauth(client as never, proofHash)).rejects.toBeInstanceOf(AccountPrivacyError);
  });
});
