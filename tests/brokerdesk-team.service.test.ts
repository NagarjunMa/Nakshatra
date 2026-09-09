import { describe, expect, it, vi } from "vitest";
import {
  OrganizationAccessError,
  resolveBrokerDeskTeam,
} from "@/features/organization-access/server/organization-access.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const memberRef = `mbr_${"b".repeat(32)}`;

function rpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

describe("BrokerDesk team projection service", () => {
  it("returns only the validated opaque member projection", async () => {
    const data = {
      available: true,
      workspaceRef,
      members: [{
        memberRef,
        displayName: "Anita Rao",
        email: "anita@example.test",
        rolePreset: "owner",
        status: "active",
        customerAccess: "all_customers",
        assignedCustomerCount: 0,
        joinedAt: "2026-09-09T20:00:00.000Z",
        isCurrentUser: true,
      }],
    };
    const client = rpcClient({ data, error: null });

    await expect(resolveBrokerDeskTeam(client as never, workspaceRef)).resolves.toEqual(data);
    expect(client.rpc).toHaveBeenCalledWith("resolve_brokerdesk_team", { p_workspace_ref: workspaceRef });
  });

  it("keeps malformed, missing, and unauthorized references indistinguishable", async () => {
    const malformed = rpcClient({ data: null, error: null });
    await expect(resolveBrokerDeskTeam(malformed as never, "internal-uuid"))
      .resolves.toEqual({ available: false });
    expect(malformed.rpc).not.toHaveBeenCalled();

    const unavailable = rpcClient({ data: { available: false }, error: null });
    await expect(resolveBrokerDeskTeam(unavailable as never, workspaceRef))
      .resolves.toEqual({ available: false });
  });

  it("fails closed on persistence and projection contract errors", async () => {
    const privateLeak = rpcClient({
      data: { available: true, workspaceRef, members: [{ id: "internal" }] },
      error: null,
    });
    await expect(resolveBrokerDeskTeam(privateLeak as never, workspaceRef))
      .rejects.toBeInstanceOf(OrganizationAccessError);
    await expect(resolveBrokerDeskTeam(privateLeak as never, workspaceRef))
      .rejects.toMatchObject({ code: "BROKERDESK_TEAM_UNAVAILABLE", status: 503 });
  });
});
