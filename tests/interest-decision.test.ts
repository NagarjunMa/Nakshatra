import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));

import { PATCH } from "../src/app/api/interest/[id]/route";

function authenticatedClient(result: string = "approved", error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data: result, error });
  getApiUser.mockResolvedValue({
    status: "authenticated",
    user: { id: "owner-1" },
    supabase: { rpc },
  });
  return rpc;
}

function patch(decision: unknown, id = "11111111-1111-4111-8111-111111111111") {
  return PATCH(new Request("http://local/api/interest/request", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Origin: "http://local" },
    body: JSON.stringify({ decision }),
  }), { params: Promise.resolve({ id }) });
}

describe("interest decision endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(null);
  });

  it("rejects requests without an authenticated owner", async () => {
    getApiUser.mockResolvedValue({ status: "missing_session" });
    const response = await patch("approved");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_SESSION_MISSING" });
  });

  it("rejects invalid decisions before calling the database", async () => {
    const rpc = authenticatedClient();
    expect((await patch("maybe")).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps unavailable, sign-in, and authorization outcomes safely", async () => {
    authenticatedClient("not_found");
    expect((await patch("approved")).status).toBe(404);
    authenticatedClient("signin_required");
    expect((await patch("approved")).status).toBe(409);
    authenticatedClient("unauthorized");
    expect((await patch("approved")).status).toBe(403);
  });

  it("delegates approval, rejection, and explicit reopening to the atomic database command", async () => {
    const approveRpc = authenticatedClient("approved");
    const approved = await patch("approved");
    expect(approved.status).toBe(200);
    await expect(approved.json()).resolves.toEqual({ ok: true, status: "approved" });
    expect(approveRpc).toHaveBeenCalledWith("decide_interest_request", {
      p_interest_request_id: "11111111-1111-4111-8111-111111111111",
      p_decision: "approved",
    });

    const rejectRpc = authenticatedClient("rejected");
    const rejected = await patch("rejected");
    expect(rejected.status).toBe(200);
    expect(rejectRpc).toHaveBeenCalledWith("decide_interest_request", expect.objectContaining({ p_decision: "rejected" }));

    const reopenRpc = authenticatedClient("reopened");
    const reopened = await patch("reopened");
    expect(reopened.status).toBe(200);
    expect(reopenRpc).toHaveBeenCalledWith("decide_interest_request", expect.objectContaining({ p_decision: "reopened" }));
  });

  it("reports invalid transitions and treats repeated decisions idempotently", async () => {
    authenticatedClient("invalid_transition");
    const invalid = await patch("approved");
    expect(invalid.status).toBe(409);
    await expect(invalid.json()).resolves.toMatchObject({ error: expect.stringMatching(/reopen/i) });

    authenticatedClient("already_approved");
    await expect((await patch("approved")).json()).resolves.toEqual({ ok: true, status: "already_approved" });
    authenticatedClient("already_rejected");
    await expect((await patch("rejected")).json()).resolves.toEqual({ ok: true, status: "already_rejected" });
  });

  it("does not expose database failures", async () => {
    authenticatedClient("approved", new Error("sensitive database failure"));
    const response = await patch("approved");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: "INTEREST_DECISION_FAILED",
      error: "This interest could not be updated.",
    });

    authenticatedClient("unexpected_status");
    const malformed = await patch("approved");
    expect(malformed.status).toBe(500);
  });
});
