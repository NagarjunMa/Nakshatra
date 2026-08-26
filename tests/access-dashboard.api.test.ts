import { afterEach, describe, expect, it, vi } from "vitest";
import { manageAccessGrantRequest } from "../src/features/access/client/access-dashboard.api";

const grantId = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("access dashboard API", () => {
  it("returns a normalized successful grant action", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "renewed",
      expiresAt: "2099-02-01T00:00:00.000Z",
    })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(manageAccessGrantRequest(grantId, "renew")).resolves.toEqual({
      ok: true,
      status: "renewed",
      expiresAt: "2099-02-01T00:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/access-grants/${grantId}`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ action: "renew" }) })
    );
  });

  it("preserves safe API errors for the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "ACCESS_INVALID_TRANSITION",
      error: "Only approved access can be renewed.",
    }), { status: 409 })));

    await expect(manageAccessGrantRequest(grantId, "renew")).resolves.toEqual({
      ok: false,
      code: "ACCESS_INVALID_TRANSITION",
      error: "Only approved access can be renewed.",
      status: 409,
    });
  });

  it("returns an actionable message when the network is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(manageAccessGrantRequest(grantId, "revoke")).resolves.toMatchObject({
      ok: false,
      code: "NETWORK_UNAVAILABLE",
      status: 0,
    });
  });
});
