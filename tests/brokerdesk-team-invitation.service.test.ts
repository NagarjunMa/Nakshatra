import { describe, expect, it, vi } from "vitest";
import {
  acceptBrokerdeskTeamInvitation,
  BrokerdeskTeamInvitationError,
  createBrokerdeskTeamInvitation,
} from "@/features/organization-access/server/brokerdesk-team-invitation.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const created = {
  status: "created", invitationRef: `inv_${"b".repeat(32)}`, workspaceRef,
  emailHint: "em***@example.com", rolePreset: "advisor", expiresAt: "2026-09-16T00:00:00Z",
};
const input = {
  workspaceRef, rolePreset: "advisor" as const, emailHash: "a".repeat(64), emailHint: "em***@example.com",
  tokenHash: "b".repeat(64), proofHash: "c".repeat(64), idempotencyKey: "invite:11111111-1111-4111-8111-111111111111",
};
function client(data: unknown, error: unknown = null) { return { rpc: vi.fn().mockResolvedValue({ data, error }) }; }

describe("BrokerDesk team invitation service", () => {
  it("validates safe creation and acceptance projections", async () => {
    await expect(createBrokerdeskTeamInvitation(client(created) as never, input)).resolves.toEqual(created);
    const accepted = { available: true, workspaceRef, workspaceName: "Trusted Matchmakers", rolePreset: "advisor", memberRef: `mbr_${"c".repeat(32)}` };
    await expect(acceptBrokerdeskTeamInvitation(client(accepted) as never, "d".repeat(64))).resolves.toEqual(accepted);
    await expect(acceptBrokerdeskTeamInvitation(client({ available: false }) as never, "d".repeat(64))).resolves.toEqual({ available: false });
  });

  it("maps database denials, invalid input, and malformed output safely", async () => {
    await expect(createBrokerdeskTeamInvitation(client(null, { code: "42501" }) as never, input))
      .rejects.toMatchObject({ code: "BROKERDESK_TEAM_INVITATION_FORBIDDEN", status: 403 });
    await expect(createBrokerdeskTeamInvitation(client(null, { code: "22023" }) as never, input))
      .rejects.toMatchObject({ code: "BROKERDESK_TEAM_INVITATION_INVALID", status: 400 });
    await expect(createBrokerdeskTeamInvitation(client({ organizationId: "private" }) as never, input))
      .rejects.toBeInstanceOf(BrokerdeskTeamInvitationError);
    await expect(acceptBrokerdeskTeamInvitation(client({ available: true, organizationId: "private" }) as never, "d".repeat(64)))
      .rejects.toMatchObject({ code: "BROKERDESK_TEAM_INVITATION_UNAVAILABLE", status: 403 });
  });
});
