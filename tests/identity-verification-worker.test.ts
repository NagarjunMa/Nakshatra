import { describe, expect, it, vi } from "vitest";
import { createIdentityVerificationWorker, evaluateDiditDecision } from "../scripts/identity-verification-worker.mjs";
import { hashIdentityBirthDate } from "../src/features/identity-verification/server/identity-match.mjs";

const claim = {
  attempt_id: "11111111-1111-4111-8111-111111111111",
  birth_date: "1990-01-01",
  candidate_id: "22222222-2222-4222-8222-222222222222",
  claim_token: "33333333-3333-4333-8333-333333333333",
  legal_name: "Test Person",
  provider_session_ref: "44444444-4444-4444-8444-444444444444",
  subject_type: "candidate",
  task_type: "reconcile",
};

const approvedDecision = {
  session_id: claim.provider_session_ref,
  status: "Approved",
  id_verifications: [{ status: "Approved", first_name: "Test", last_name: "Person", date_of_birth: "1990-01-01" }],
  liveness_checks: [{ status: "Approved", method: "PASSIVE_3D" }],
  face_matches: [{ status: "Approved" }],
};

function workerClient(claims = [claim]) {
  const rpc = vi.fn((name: string) => Promise.resolve(
    name === "claim_identity_verification_work" ? { data: claims, error: null } : { data: true, error: null }
  ));
  return { rpc, client: { rpc } };
}

describe("identity-verification worker", () => {
  it("accepts a provider approval only when every required check and expected detail matches", () => {
    expect(evaluateDiditDecision(approvedDecision, claim)).toEqual({
      outcome: "verified",
      idVerified: true,
      passiveLivenessVerified: true,
      faceMatchVerified: true,
      nameMatches: true,
      birthDateMatches: true,
    });
    expect(evaluateDiditDecision({ ...approvedDecision, liveness_checks: [{ status: "Approved", method: "ACTIVE" }] }, claim).outcome).toBe("declined");
    expect(evaluateDiditDecision({ ...approvedDecision, id_verifications: [...approvedDecision.id_verifications, approvedDecision.id_verifications[0]] }, claim).outcome).toBe("declined");
    expect(evaluateDiditDecision({ ...approvedDecision, status: "In Review" }, claim).outcome).toBe("pending");
    expect(evaluateDiditDecision({ ...approvedDecision, status: "Abandoned" }, claim).outcome).toBe("expired");
  });

  it("matches a representative birth date through its keyed digest without a retained raw date", () => {
    const key = "representative-test-match-key-with-at-least-32-characters";
    const representativeClaim = {
      ...claim,
      birth_date: null,
      birth_date_hash: hashIdentityBirthDate("1990-01-01", key),
      candidate_id: null,
      subject_type: "organization_representative",
    };
    expect(evaluateDiditDecision(approvedDecision, representativeClaim, key).birthDateMatches).toBe(true);
    expect(evaluateDiditDecision(
      { ...approvedDecision, id_verifications: [{ ...approvedDecision.id_verifications[0], date_of_birth: "1990-01-02" }] },
      representativeClaim,
      key
    ).birthDateMatches).toBe(false);
    expect(JSON.stringify(representativeClaim)).not.toContain("1990-01-01");
    expect(() => evaluateDiditDecision(approvedDecision, representativeClaim, "too-short"))
      .toThrow("IDENTITY_MATCH_KEY_UNAVAILABLE");
  });

  it("reconciles decisions through the lease-bound RPC without retaining provider payloads", async () => {
    const { client, rpc } = workerClient();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(approvedDecision), { status: 200 }));
    const result = await createIdentityVerificationWorker(client, { apiKey: "test-api-key", fetchImpl }).run(10);

    expect(result).toMatchObject({ claimed: 1, completed: 1, pending: 0, deferred: 0 });
    expect(rpc).toHaveBeenCalledWith("complete_identity_verification_reconciliation", expect.objectContaining({
      p_attempt_id: claim.attempt_id,
      p_outcome: "verified",
      p_passive_liveness_verified: true,
    }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("id_verifications");
  });

  it("defers transient decision failures and treats an already-deleted terminal session as purged", async () => {
    const { client, rpc } = workerClient();
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("network"));
    const worker = createIdentityVerificationWorker(client, { apiKey: "test-api-key", fetchImpl });
    await expect(worker.run(1)).resolves.toMatchObject({ completed: 0, pending: 0, deferred: 1 });
    expect(rpc).toHaveBeenCalledWith("defer_identity_verification_work", expect.objectContaining({
      p_error_code: "DIDIT_DECISION_FETCH_FAILED",
    }));

    const redaction = { ...claim, task_type: "provider_redaction" };
    const redactionClient = workerClient([redaction]);
    const deleteFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    await expect(createIdentityVerificationWorker(redactionClient.client, { apiKey: "test-api-key", fetchImpl: deleteFetch }).run(1))
      .resolves.toMatchObject({ completed: 1, pending: 0, deferred: 0 });
    expect(redactionClient.rpc).toHaveBeenCalledWith("complete_identity_verification_provider_redaction", expect.any(Object));
  });

  it("bounds an unavailable Didit request and defers it through the database policy", async () => {
    vi.useFakeTimers();
    try {
      const { client, rpc } = workerClient();
      const fetchMock = vi.fn((_url: RequestInfo | URL, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }));
      const run = createIdentityVerificationWorker(client, {
        apiKey: "test-api-key",
        fetchImpl: fetchMock as typeof fetch,
        requestTimeoutMs: 100,
      }).run(1);

      await vi.advanceTimersByTimeAsync(100);
      await expect(run).resolves.toMatchObject({ completed: 0, pending: 0, deferred: 1 });
      expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(rpc).toHaveBeenCalledWith("defer_identity_verification_work", expect.not.objectContaining({
        p_delay_seconds: expect.anything(),
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps an in-review decision distinct from a failed deferred operation", async () => {
    const { client, rpc } = workerClient();
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...approvedDecision,
      status: "In Review",
    }), { status: 200 }));

    await expect(createIdentityVerificationWorker(client, { apiKey: "test-api-key", fetchImpl }).run(1))
      .resolves.toMatchObject({ claimed: 1, completed: 0, pending: 1, deferred: 0 });
    expect(rpc).toHaveBeenCalledWith("complete_identity_verification_reconciliation", expect.objectContaining({
      p_outcome: "pending",
    }));
    expect(rpc).not.toHaveBeenCalledWith("defer_identity_verification_work", expect.anything());
  });
});
