// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TeamInvitationClient } from "../src/app/join/team/team-invitation-client";

describe("BrokerDesk team invitation client", () => {
  beforeEach(() => {
    sessionStorage.clear();
    history.replaceState(null, "", "/join/team");
  });

  it("removes the fragment before accepting into the existing account", async () => {
    const token = "a".repeat(43);
    history.replaceState(null, "", `/join/team#token=${token}`);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ready: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        available: true,
        workspaceRef: `wrk_${"b".repeat(32)}`,
        workspaceName: "Trusted Matchmakers",
        rolePreset: "advisor",
        memberRef: `mbr_${"c".repeat(32)}`,
      }), { status: 200 }));
    render(<TeamInvitationClient />);
    expect(await screen.findByRole("heading", { name: "Welcome to Trusted Matchmakers" })).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/brokerdesk/team-invitations/exchange", expect.anything());
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/brokerdesk/team-invitations/accept", expect.anything());
    expect(screen.getByRole("link", { name: "Open BrokerDesk" })).toHaveAttribute("href", "/brokerdesk");
  });

  it("asks for the matching Nakshatra account without revealing invitation state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 }));
    render(<TeamInvitationClient />);
    expect(await screen.findByRole("heading", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in securely" })).toHaveAttribute("href", "/login?next=/join/team");
    await waitFor(() => expect(window.location.hash).toBe(""));
  });
});
