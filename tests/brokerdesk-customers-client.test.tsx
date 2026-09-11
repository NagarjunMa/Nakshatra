// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { brokerdeskCustomersSchema } from "@/features/broker-relationships/server/customer-invitation.contract";

const invite = vi.hoisted(() => vi.fn());
vi.mock("@/features/broker-relationships/client/customer-invitation.api", () => ({ inviteBrokerdeskCustomer: invite }));

import { BrokerdeskCustomersClient } from "../src/app/brokerdesk/w/[workspaceRef]/customers/brokerdesk-customers-client";

const workspaceRef = `wrk_${"a".repeat(32)}`;

describe("BrokerDesk customers client", () => {
  it("groups only the agency projection and explains waiting invitations", () => {
    render(<BrokerdeskCustomersClient customers={brokerdeskCustomersSchema.parse({
      available: true,
      workspaceRef,
      customers: [
        { kind: "relationship", relationshipRef: `bcr_${"b".repeat(32)}`, displayName: "Ananya", gender: "female", relationshipStatus: "active", portfolioStatus: "published", startsAt: "2026-09-10T00:00:00Z", endsAt: "2027-09-10T00:00:00Z" },
        { kind: "relationship", relationshipRef: `bcr_${"c".repeat(32)}`, displayName: "Arjun", gender: "male", relationshipStatus: "active", portfolioStatus: "completing", startsAt: "2026-09-10T00:00:00Z", endsAt: null },
        { kind: "invitation", invitationRef: `inv_${"d".repeat(32)}`, emailHint: "cu***@example.com", invitationStatus: "portfolio_required", expiresAt: "2026-09-17T00:00:00Z" },
      ],
    })} />);
    expect(screen.getByRole("heading", { name: "Men" })).toBeInTheDocument();
    expect(screen.getByText("Arjun")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Women" })).toBeInTheDocument();
    expect(screen.getByText("Ananya")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ananya/ })).toHaveAttribute(
      "href", `/brokerdesk/w/${workspaceRef}/customers/bcr_${"b".repeat(32)}`
    );
    expect(screen.getByText("Customer joined · portfolio not complete")).toBeInTheDocument();
    expect(screen.getByText("This list never reveals whether a customer works with another broker.")).toBeInTheDocument();
  });

  it("creates a private manual invitation through the routine broker workflow", async () => {
    invite.mockResolvedValueOnce({
      invitationUrl: `http://local/join/customer#token=${"a".repeat(43)}`,
      emailHint: "cu***@example.com",
      expiresAt: "2026-09-17T00:00:00Z",
    });
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<BrokerdeskCustomersClient customers={brokerdeskCustomersSchema.parse({ available: true, workspaceRef, customers: [] })} />);
    await userEvent.click(screen.getByRole("button", { name: "Invite customer" }));
    await userEvent.type(screen.getByLabelText("Email address"), "customer@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create private invitation" }));
    expect(await screen.findByText("Invitation ready")).toBeInTheDocument();
    expect(invite).toHaveBeenCalledWith(workspaceRef, "customer@example.com", expect.stringMatching(/^customer-invite:/));
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/join/customer#token="));
  });

  it("uses the same unavailable view for missing and unauthorized workspaces", () => {
    render(<BrokerdeskCustomersClient customers={{ available: false }} />);
    expect(screen.getByRole("heading", { name: "Customers are unavailable" })).toBeInTheDocument();
  });
});
