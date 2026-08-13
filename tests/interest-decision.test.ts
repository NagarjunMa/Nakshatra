import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));

import { PATCH } from "../src/app/api/interest/[id]/route";

type InterestRow = {
  id: string;
  portfolio_id: string;
  requester_user_id: string | null;
  status: string;
};

function authenticatedClient(options: {
  interest?: InterestRow | null;
  interestError?: unknown;
  existingGrant?: { id: string } | null;
  grantError?: unknown;
  updateError?: unknown;
} = {}) {
  const interest = options.interest === undefined
    ? {
        id: "interest-1",
        portfolio_id: "portfolio-1",
        requester_user_id: "viewer-1",
        status: "new",
      }
    : options.interest;

  const interestLookup = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(async () => ({ data: interest, error: options.interestError ?? null })),
  };
  interestLookup.select.mockReturnValue(interestLookup);
  interestLookup.eq.mockReturnValue(interestLookup);

  const interestUpdate = {
    eq: vi.fn(async () => ({ error: options.updateError ?? null })),
  };
  const update = vi.fn(() => interestUpdate);

  const grantLookup = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: options.existingGrant ?? null })),
  };
  grantLookup.select.mockReturnValue(grantLookup);
  grantLookup.eq.mockReturnValue(grantLookup);
  grantLookup.is.mockReturnValue(grantLookup);
  const insert = vi.fn(async () => ({ error: options.grantError ?? null }));

  const from = vi.fn((table: string) => {
    if (table === "interest_requests") {
      return { ...interestLookup, update };
    }
    if (table === "reveal_grants") {
      return { ...grantLookup, insert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  const supabase = { from };
  getApiUser.mockResolvedValue({
    status: "authenticated",
    user: { id: "owner-1" },
    supabase,
  });

  return { from, insert, update, interestUpdate };
}

function decisionRequest(decision: unknown) {
  return new Request("http://local/api/interest/interest-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
}

function patch(decision: unknown, id = "interest-1") {
  return PATCH(decisionRequest(decision), { params: Promise.resolve({ id }) });
}

describe("interest decision endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects requests without an authenticated owner", async () => {
    getApiUser.mockResolvedValue({ status: "missing_session" });

    const response = await patch("approved");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "AUTH_SESSION_MISSING" });
  });

  it("rejects invalid decisions and missing interests", async () => {
    authenticatedClient();
    const invalid = await patch("maybe");
    expect(invalid.status).toBe(400);

    authenticatedClient({ interest: null });
    const missing = await patch("approved", "missing");
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({ error: expect.stringMatching(/could not be found/i) });
  });

  it("requires the viewer to sign in before Full View can be approved", async () => {
    authenticatedClient({
      interest: {
        id: "interest-1",
        portfolio_id: "portfolio-1",
        requester_user_id: null,
        status: "new",
      },
    });

    const response = await patch("approved");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/sign in/i) });
  });

  it("creates Full View access and marks an interest approved", async () => {
    const client = authenticatedClient();

    const response = await patch("approved");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "approved" });
    expect(client.insert).toHaveBeenCalledWith({
      interest_request_id: "interest-1",
      portfolio_id: "portfolio-1",
      viewer_user_id: "viewer-1",
      access_level: "full",
      granted_sections: ["full"],
      granted_by: "owner-1",
    });
    expect(client.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "approved",
      decided_by: "owner-1",
    }));
  });

  it("reuses existing access and can decline without creating a grant", async () => {
    const existing = authenticatedClient({ existingGrant: { id: "grant-1" } });
    expect((await patch("approved")).status).toBe(200);
    expect(existing.insert).not.toHaveBeenCalled();

    const declined = authenticatedClient();
    const response = await patch("rejected");
    expect(response.status).toBe(200);
    expect(declined.insert).not.toHaveBeenCalled();
    expect(declined.update).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected" }));
  });

  it("returns safe errors when access creation or status updates fail", async () => {
    authenticatedClient({ grantError: new Error("insert failed") });
    const grantFailure = await patch("approved");
    expect(grantFailure.status).toBe(500);
    await expect(grantFailure.json()).resolves.toMatchObject({ error: expect.stringMatching(/could not be created/i) });

    authenticatedClient({ updateError: new Error("update failed") });
    const updateFailure = await patch("rejected");
    expect(updateFailure.status).toBe(500);
    await expect(updateFailure.json()).resolves.toMatchObject({ error: expect.stringMatching(/could not be updated/i) });
  });
});
