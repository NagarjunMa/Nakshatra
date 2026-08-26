import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  listPortfolioAccess: vi.fn(),
  manageGrant: vi.fn(),
}));

vi.mock("../src/features/access/server/access.repository", () => ({
  AccessRepository: class {
    constructor() {
      return repository;
    }
  },
}));

import {
  AccessLifecycleError,
  getPortfolioAccessSummary,
  managePortfolioGrant,
} from "../src/features/access/server/access.service";

const summary = {
  grants: [{
    id: "11111111-1111-4111-8111-111111111111",
    interestRequestId: "22222222-2222-4222-8222-222222222222",
    viewerName: "Rohan Mehta",
    status: "active",
    expiresAt: "2099-01-01T00:00:00.000Z",
    renewedAt: null,
    revokedAt: null,
    lastAccessedAt: null,
  }],
  events: [{
    id: 1,
    eventType: "grant_created",
    viewerName: "Rohan Mehta",
    createdAt: "2026-08-16T00:00:00.000Z",
    metadata: { expires_at: "2099-01-01T00:00:00.000Z" },
  }],
};

describe("access lifecycle service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the owner's validated grants and immutable history", async () => {
    repository.listPortfolioAccess.mockResolvedValue({ data: summary, error: null });
    await expect(getPortfolioAccessSummary({} as never)).resolves.toEqual(summary);
  });

  it("fails closed when the access summary contract is unavailable", async () => {
    repository.listPortfolioAccess.mockResolvedValue({ data: { grants: "unsafe" }, error: null });
    await expect(getPortfolioAccessSummary({} as never)).resolves.toEqual({ grants: [], events: [] });
  });

  it("renews and revokes through the atomic grant command", async () => {
    repository.manageGrant.mockResolvedValue({
      data: { status: "renewed", expiresAt: "2099-02-01T00:00:00.000Z" },
      error: null,
    });
    await expect(managePortfolioGrant({} as never, summary.grants[0].id, "renew"))
      .resolves.toMatchObject({ status: "renewed" });
    expect(repository.manageGrant).toHaveBeenCalledWith(summary.grants[0].id, "renew");

    repository.manageGrant.mockResolvedValue({ data: { status: "revoked" }, error: null });
    await expect(managePortfolioGrant({} as never, summary.grants[0].id, "revoke"))
      .resolves.toEqual({ status: "revoked" });
  });

  it("maps authorization, transition, and persistence failures safely", async () => {
    for (const status of ["not_found", "unauthorized", "invalid_transition"] as const) {
      repository.manageGrant.mockResolvedValue({ data: { status }, error: null });
      await expect(managePortfolioGrant({} as never, summary.grants[0].id, "renew"))
        .rejects.toBeInstanceOf(AccessLifecycleError);
    }
    repository.manageGrant.mockResolvedValue({ data: null, error: new Error("private database error") });
    await expect(managePortfolioGrant({} as never, summary.grants[0].id, "revoke"))
      .rejects.toMatchObject({ message: "This access change could not be saved." });
  });
});
