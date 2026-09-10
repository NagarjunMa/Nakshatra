import { describe, expect, it, vi } from "vitest";
import {
  claimCustomerInvitation,
  createCustomerInvitation,
  CustomerInvitationError,
  resolveBrokerdeskCustomers,
  resolveCustomerBrokerRelationships,
} from "@/features/broker-relationships/server/customer-invitation.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const created = {
  status: "created", invitationRef: `inv_${"b".repeat(32)}`, workspaceRef,
  emailHint: "cu***@example.com", expiresAt: "2026-09-17T00:00:00Z",
};
const input = {
  workspaceRef, emailHash: "a".repeat(64), emailHint: "cu***@example.com",
  tokenHash: "b".repeat(64), idempotencyKey: "customer-invite:1111111111111111",
};
function client(data: unknown, error: unknown = null) { return { rpc: vi.fn().mockResolvedValue({ data, error }) }; }

describe("BrokerDesk customer invitation service", () => {
  it("validates creation, claim, broker, and customer projections", async () => {
    await expect(createCustomerInvitation(client(created) as never, input)).resolves.toEqual(created);
    const claim = {
      available: true, status: "active", invitationRef: `inv_${"b".repeat(32)}`,
      workspaceName: "Agency A", relationshipRef: `bcr_${"c".repeat(32)}`,
      relationshipEndsAt: "2027-09-10T00:00:00Z",
    };
    await expect(claimCustomerInvitation(client(claim) as never, "d".repeat(64))).resolves.toEqual(claim);
    await expect(claimCustomerInvitation(client({ available: false }) as never, "d".repeat(64))).resolves.toEqual({ available: false });
    const customers = { available: true, workspaceRef, customers: [] };
    await expect(resolveBrokerdeskCustomers(client(customers) as never, workspaceRef)).resolves.toEqual(customers);
    const brokers = { available: true, relationships: [] };
    await expect(resolveCustomerBrokerRelationships(client(brokers) as never)).resolves.toEqual(brokers);
  });

  it("maps denied, invalid, malformed, and unavailable results without leaking database details", async () => {
    await expect(createCustomerInvitation(client(null, { code: "42501" }) as never, input))
      .rejects.toMatchObject({ code: "BROKERDESK_WORKSPACE_UNAVAILABLE", status: 404 });
    await expect(createCustomerInvitation(client(null, { code: "22023" }) as never, input))
      .rejects.toMatchObject({ code: "BROKERDESK_CUSTOMER_INVITATION_INVALID", status: 400 });
    await expect(createCustomerInvitation(client({ organizationId: "private" }) as never, input))
      .rejects.toBeInstanceOf(CustomerInvitationError);
    await expect(createCustomerInvitation(client(created) as never, { ...input, workspaceRef: "bad" }))
      .rejects.toMatchObject({ status: 404 });
    await expect(claimCustomerInvitation(client({ available: true, organizationId: "private" }) as never, "d".repeat(64)))
      .rejects.toMatchObject({ status: 403 });
    await expect(resolveBrokerdeskCustomers(client(null, { code: "x" }) as never, workspaceRef))
      .rejects.toMatchObject({ code: "BROKERDESK_CUSTOMERS_UNAVAILABLE" });
    await expect(resolveBrokerdeskCustomers(client(null) as never, "bad")).resolves.toEqual({ available: false });
    await expect(resolveCustomerBrokerRelationships(client({ internal: true }) as never))
      .rejects.toMatchObject({ code: "CUSTOMER_BROKERS_UNAVAILABLE" });
  });
});
