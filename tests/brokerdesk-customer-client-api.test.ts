import { afterEach, describe, expect, it, vi } from "vitest";
import { inviteBrokerdeskCustomer } from "@/features/broker-relationships/client/customer-invitation.api";

describe("BrokerDesk customer invitation client API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends only the workspace path and bounded command body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      invitationUrl: `https://example.test/join/customer#token=${"a".repeat(43)}`,
      emailHint: "cu***@example.com",
      expiresAt: "2026-09-17T00:00:00Z",
    }), { status: 200 }));
    await expect(inviteBrokerdeskCustomer("wrk_safe", "customer@example.com", "customer-invite:0001"))
      .resolves.toMatchObject({ emailHint: "cu***@example.com" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/brokerdesk/workspaces/wrk_safe/customer-invitations",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ email: "customer@example.com", idempotencyKey: "customer-invite:0001" }),
      })
    );
  });

  it("uses the safe server message and a neutral fallback for failed responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Complete your sign-in first." }), { status: 403 }))
      .mockResolvedValueOnce(new Response("not json", { status: 503 }));
    await expect(inviteBrokerdeskCustomer("workspace", "customer@example.com", "request-one"))
      .rejects.toThrow("Complete your sign-in first.");
    await expect(inviteBrokerdeskCustomer("workspace", "customer@example.com", "request-two"))
      .rejects.toThrow("This action is temporarily unavailable.");
  });
});

