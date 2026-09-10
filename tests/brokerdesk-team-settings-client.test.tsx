// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const startSecurity = vi.hoisted(() => vi.fn());
const inviteMember = vi.hoisted(() => vi.fn());
const replaceAccess = vi.hoisted(() => vi.fn());
const suspendMember = vi.hoisted(() => vi.fn());
vi.mock("@/features/organization-access/client/brokerdesk-team.api", () => ({
  startTeamActionSecurity: startSecurity,
  inviteTeamMember: inviteMember,
  replaceTeamMemberAccess: replaceAccess,
  suspendTeamMember: suspendMember,
}));
import { TeamSettingsClient } from "../src/app/brokerdesk/w/[workspaceRef]/settings/team/team-settings-client";

const workspaceRef = `wrk_${"a".repeat(32)}` as never;
const team = {
  available: true as const,
  workspaceRef,
  members: [{
    memberRef: `mbr_${"b".repeat(32)}` as never, displayName: "Agency Owner", email: "owner@example.com",
    rolePreset: "owner" as const, status: "active" as const, customerAccess: "all_customers" as const,
    assignedCustomerCount: 0, joinedAt: "2026-09-09T00:00:00Z", isCurrentUser: true,
  }, {
    memberRef: `mbr_${"c".repeat(32)}` as never, displayName: "Employee One", email: "employee@example.com",
    rolePreset: "advisor" as const, status: "active" as const, customerAccess: "none" as const,
    assignedCustomerCount: 0, joinedAt: "2026-09-09T00:00:00Z", isCurrentUser: false,
  }],
};

describe("BrokerDesk team settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSecurity.mockResolvedValue({ sent: true });
    inviteMember.mockResolvedValue({ invitationUrl: `http://local/join/team#token=${"a".repeat(43)}`, emailHint: "em***@example.com", expiresAt: "2026-09-16T00:00:00Z" });
    replaceAccess.mockResolvedValue({ status: "updated" });
    suspendMember.mockResolvedValue({ status: "suspended" });
  });

  it("explains the security check before an invitation", async () => {
    const user = userEvent.setup();
    render(<TeamSettingsClient team={team} reauthPurpose={null} />);
    expect(screen.getByText("Agency Owner (you)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Invite employee" }));
    await user.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
    expect(startSecurity).toHaveBeenCalledWith(workspaceRef, "email", "team_invite");
    expect(await screen.findByText(/sent a private sign-in link/i)).toBeInTheDocument();
  });

  it("creates a clear one-time invitation after reauthentication", async () => {
    const user = userEvent.setup();
    render(<TeamSettingsClient team={team} reauthPurpose="team_invite" />);
    await user.type(screen.getByLabelText("Email address"), "employee@example.com");
    await user.selectOptions(screen.getByLabelText("Role"), "advisor");
    await user.click(screen.getByRole("button", { name: "Create private invitation" }));
    expect(inviteMember).toHaveBeenCalledWith(workspaceRef, "employee@example.com", "advisor", expect.stringMatching(/^team-invite:/));
    expect(await screen.findByText("Private invitation ready")).toBeInTheDocument();
    expect(screen.getByText(/works once and only for their email/i)).toBeInTheDocument();
  });

  it("replaces a non-owner role only after the matching proof", async () => {
    const user = userEvent.setup();
    render(<TeamSettingsClient team={team} reauthPurpose="team_access_replace" />);
    await user.click(screen.getByRole("button", { name: "Change role for Employee One" }));
    await user.selectOptions(screen.getByLabelText("Role"), "coordinator");
    await user.click(screen.getByRole("button", { name: "Save role" }));
    expect(replaceAccess).toHaveBeenCalledWith(workspaceRef, team.members[1].memberRef, "coordinator", expect.stringMatching(/^team-access:/));
    expect(await screen.findByText(/effective immediately/i)).toBeInTheDocument();
  });

  it("explains the shared-identity boundary before suspension", async () => {
    const user = userEvent.setup();
    render(<TeamSettingsClient team={team} reauthPurpose="team_suspend" />);
    await user.click(screen.getByRole("button", { name: "Suspend Employee One" }));
    expect(screen.getByText(/access through any other agency are not changed/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Suspend access" }));
    expect(suspendMember).toHaveBeenCalledWith(workspaceRef, team.members[1].memberRef, expect.stringMatching(/^team-suspend:/));
  });
});
