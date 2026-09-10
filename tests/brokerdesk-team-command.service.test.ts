import { describe, expect, it, vi } from "vitest";
import { BrokerdeskTeamCommandError, replaceBrokerdeskTeamMemberAccess, suspendBrokerdeskTeamMember } from "@/features/organization-access/server/brokerdesk-team-command.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const memberRef = `mbr_${"b".repeat(32)}`;
const common = { workspaceRef, memberRef, proofHash: "c".repeat(64), idempotencyKey: "team-command:11111111-1111-4111-8111-111111111111" };
function client(data: unknown, error: unknown = null) { return { rpc: vi.fn().mockResolvedValue({ data, error }) }; }

describe("BrokerDesk team command service", () => {
  it("accepts only safe access and suspension projections", async () => {
    const updated = { status: "updated", workspaceRef, memberRef, rolePreset: "coordinator", customerAccess: "none", assignedCustomerCount: 0 };
    await expect(replaceBrokerdeskTeamMemberAccess(client(updated) as never, { ...common, rolePreset: "coordinator" })).resolves.toEqual(updated);
    const suspended = { status: "suspended", workspaceRef, memberRef };
    await expect(suspendBrokerdeskTeamMember(client(suspended) as never, common)).resolves.toEqual(suspended);
  });

  it("maps database denials and rejects malformed output", async () => {
    await expect(replaceBrokerdeskTeamMemberAccess(client(null, { code: "42501" }) as never, { ...common, rolePreset: "viewer" }))
      .rejects.toMatchObject({ code: "BROKERDESK_TEAM_COMMAND_FORBIDDEN", status: 403 });
    await expect(suspendBrokerdeskTeamMember(client(null, { code: "22023" }) as never, common))
      .rejects.toMatchObject({ code: "BROKERDESK_TEAM_COMMAND_INVALID", status: 400 });
    await expect(suspendBrokerdeskTeamMember(client({ organizationId: "private" }) as never, common))
      .rejects.toBeInstanceOf(BrokerdeskTeamCommandError);
  });
});
