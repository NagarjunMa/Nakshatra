// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerInvitationClient } from "../src/app/join/customer/customer-invitation-client";
import CustomerInvitationPage from "../src/app/join/customer/page";

describe("BrokerDesk customer invitation client", () => {
  beforeEach(() => history.replaceState(null, "", "/join/customer"));

  it("removes the fragment and waits for explicit customer consent before claiming", async () => {
    const token = "a".repeat(43);
    history.replaceState(null, "", `/join/customer#token=${token}`);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ready: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        available: true,
        status: "active",
        invitationRef: `inv_${"b".repeat(32)}`,
        workspaceName: "Agency A",
        relationshipRef: `bcr_${"c".repeat(32)}`,
        relationshipEndsAt: "2027-09-10T00:00:00Z",
      }), { status: 200 }));
    render(<CustomerInvitationClient />);
    expect(await screen.findByRole("heading", { name: "Join your broker on Nakshatra" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("");
    await userEvent.click(screen.getByRole("button", { name: "Join this broker" }));
    expect(await screen.findByRole("heading", { name: "You are connected to Agency A" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/customer/broker-invitations/claim", expect.objectContaining({
      body: JSON.stringify({ consent: true }),
    }));
  });

  it("continues the same invitation through sign-in and canonical portfolio completion", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 }));
    render(<CustomerInvitationClient />);
    await userEvent.click(await screen.findByRole("button", { name: "Join this broker" }));
    expect(await screen.findByRole("heading", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in securely" })).toHaveAttribute("href", "/login?next=/join/customer");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      available: true,
      status: "portfolio_required",
      invitationRef: `inv_${"b".repeat(32)}`,
      workspaceName: "Agency A",
      relationshipRef: null,
      relationshipEndsAt: "2027-09-10T00:00:00Z",
    }), { status: 200 }));
    history.replaceState(null, "", "/join/customer");
    const { unmount } = render(<CustomerInvitationClient />);
    await userEvent.click(await screen.findAllByRole("button", { name: "Join this broker" }).then((buttons) => buttons.at(-1)!));
    expect(await screen.findByRole("heading", { name: "Complete your one Nakshatra portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete my portfolio" })).toHaveAttribute("href", "/dashboard");
    unmount();
  });

  it("keeps unavailable invitations neutral", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    history.replaceState(null, "", `/join/customer#token=${"a".repeat(43)}`);
    render(<CustomerInvitationClient />);
    expect(await screen.findByRole("heading", { name: "Ask your broker for a new link" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe(""));
  });

  it("uses the customer invitation client as the public-shell page", async () => {
    render(<CustomerInvitationPage />);
    expect(await screen.findByRole("heading", { name: "Join your broker on Nakshatra" })).toBeInTheDocument();
  });
});
