import { describe, expect, it, vi } from "vitest";
import {
  OrganizationAccessError,
  resolveBrokerDeskAccess,
} from "@/features/organization-access/server/organization-access.service";

const WORKSPACE_REF = `wrk_${"a".repeat(32)}`;

function rpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

describe("BrokerDesk organization access service", () => {
  it("returns the validated capability envelope for an entitled member", async () => {
    const access = {
      enabled: true,
      workspaceRef: WORKSPACE_REF,
      rolePreset: "advisor",
      capabilities: [
        { key: "customers.read", scope: "assigned_customers" },
        { key: "introductions.send", scope: "assigned_customers" },
      ],
    };
    const client = rpcClient({ data: access, error: null });

    await expect(resolveBrokerDeskAccess(client as never, WORKSPACE_REF)).resolves.toEqual(access);
    expect(client.rpc).toHaveBeenCalledWith("resolve_brokerdesk_access", {
      p_workspace_ref: WORKSPACE_REF,
    });
  });

  it("preserves the uniform disabled response", async () => {
    const client = rpcClient({ data: { enabled: false }, error: null });
    await expect(resolveBrokerDeskAccess(client as never, WORKSPACE_REF)).resolves.toEqual({ enabled: false });
  });

  it("fails closed before persistence for malformed workspace references", async () => {
    const client = rpcClient({ data: { enabled: true }, error: null });
    await expect(resolveBrokerDeskAccess(client as never, "93000000-0000-4000-8000-000000000001")).resolves.toEqual({ enabled: false });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ data: null, error: new Error("private database detail") }],
    [{ data: { enabled: true, workspaceRef: WORKSPACE_REF }, error: null }],
    [{ data: { enabled: false, organizationId: "internal" }, error: null }],
  ])("maps persistence or contract failures to one safe service error", async (result) => {
    const client = rpcClient(result);
    await expect(resolveBrokerDeskAccess(client as never, WORKSPACE_REF)).rejects.toBeInstanceOf(OrganizationAccessError);
    await expect(resolveBrokerDeskAccess(client as never, WORKSPACE_REF)).rejects.toMatchObject({
      code: "BROKERDESK_ACCESS_UNAVAILABLE",
      status: 503,
    });
  });
});
