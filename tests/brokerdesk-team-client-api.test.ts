import { afterEach, describe, expect, it, vi } from "vitest";
import { inviteTeamMember, replaceTeamMemberAccess, startTeamInvitationSecurity, suspendTeamMember } from "@/features/organization-access/client/brokerdesk-team.api";

const workspaceRef = `wrk_${"a".repeat(32)}`;

describe("BrokerDesk team client API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends only the allowlisted reauthentication and invitation fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ sent: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ invitationUrl: "http://local/join/team#token=x", emailHint: "em***@example.com", expiresAt: "later" }), { status: 200 }));
    await expect(startTeamInvitationSecurity(workspaceRef, "email")).resolves.toEqual({ sent: true });
    await expect(inviteTeamMember(workspaceRef, "employee@example.com", "advisor", "invite:11111111-1111-4111-8111-111111111111"))
      .resolves.toMatchObject({ emailHint: "em***@example.com" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/v1/brokerdesk/workspaces/${workspaceRef}/reauth/start`, expect.objectContaining({
      method: "POST", credentials: "same-origin", body: JSON.stringify({ method: "email", purpose: "team_invite" }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/v1/brokerdesk/workspaces/${workspaceRef}/team-invitations`, expect.objectContaining({
      body: JSON.stringify({ email: "employee@example.com", rolePreset: "advisor", idempotencyKey: "invite:11111111-1111-4111-8111-111111111111" }),
    }));
  });

  it("uses only a safe response error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: "Complete the security check." }), { status: 403 }));
    await expect(startTeamInvitationSecurity(workspaceRef, "google")).rejects.toThrow("Complete the security check.");
  });

  it("uses explicit member command URLs and allowlisted bodies", async () => {
    const memberRef = `mbr_${"b".repeat(32)}`;
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "updated" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "suspended" }), { status: 200 }));
    await replaceTeamMemberAccess(workspaceRef, memberRef, "viewer", "team-access:11111111-1111-4111-8111-111111111111");
    await suspendTeamMember(workspaceRef, memberRef, "team-suspend:11111111-1111-4111-8111-111111111111");
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/v1/brokerdesk/workspaces/${workspaceRef}/team/${memberRef}/access`, expect.objectContaining({
      method: "PUT", body: JSON.stringify({ rolePreset: "viewer", idempotencyKey: "team-access:11111111-1111-4111-8111-111111111111" }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/v1/brokerdesk/workspaces/${workspaceRef}/team/${memberRef}/suspend`, expect.objectContaining({
      method: "POST", body: JSON.stringify({ idempotencyKey: "team-suspend:11111111-1111-4111-8111-111111111111" }),
    }));
  });
});
