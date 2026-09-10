import { describe, expect, it } from "vitest";
import {
  deriveTeamInvitationToken,
  hashInvitationEmail,
  hashTeamInvitationToken,
  invitationEmailHint,
} from "@/features/organization-access/server/brokerdesk-team-invitation.token";
import {
  clearTeamInvitationExchangeCookie,
  createTeamInvitationExchangeCookie,
  readTeamInvitationExchangeCookie,
} from "@/features/organization-access/server/brokerdesk-team-invitation.cookie";

describe("BrokerDesk team invitation credentials", () => {
  it("derives a stable high-entropy token only for an identical idempotent command", () => {
    const input = {
      actorUserId: "11111111-1111-4111-8111-111111111111",
      workspaceRef: `wrk_${"a".repeat(32)}`,
      email: " Employee@Example.com ",
      rolePreset: "advisor",
      idempotencyKey: "invite:11111111-1111-4111-8111-111111111111",
    };
    const token = deriveTeamInvitationToken(input);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(deriveTeamInvitationToken({ ...input, email: "employee@example.com" })).toBe(token);
    expect(deriveTeamInvitationToken({ ...input, rolePreset: "viewer" })).not.toBe(token);
    expect(hashTeamInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("stores only a normalized email hash and a masked display hint", () => {
    expect(hashInvitationEmail(" Employee@Example.com ")).toBe(hashInvitationEmail("employee@example.com"));
    expect(invitationEmailHint("employee@example.com")).toBe("em***@example.com");
  });

  it("moves the fragment token into a signed exact-path HttpOnly cookie", () => {
    const token = "a".repeat(43);
    const cookie = createTeamInvitationExchangeCookie(token);
    expect(cookie).toMatchObject({
      httpOnly: true,
      path: "/api/v1/brokerdesk/team-invitations/accept",
      maxAge: 900,
    });
    expect(readTeamInvitationExchangeCookie(cookie.value)).toBe(token);
    expect(readTeamInvitationExchangeCookie(`${cookie.value}x`)).toBeNull();
    expect(clearTeamInvitationExchangeCookie()).toMatchObject({ value: "", maxAge: 0 });
  });
});
