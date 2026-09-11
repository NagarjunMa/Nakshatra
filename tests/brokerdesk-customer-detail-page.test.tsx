// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getAuthenticatedUser = vi.hoisted(() => vi.fn());
const resolveCustomer = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
vi.mock("@/features/broker-relationships/server/customer-invitation.service", () => ({
  resolveBrokerdeskCustomer: resolveCustomer,
}));

import BrokerdeskCustomerDetailPage from "../src/app/brokerdesk/w/[workspaceRef]/customers/[relationshipRef]/page";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const relationshipRef = `bcr_${"b".repeat(32)}`;

describe("BrokerDesk customer detail page", () => {
  it("shows only the mandate-approved relationship summary and assigned team", async () => {
    getAuthenticatedUser.mockResolvedValue({ supabase: {} });
    resolveCustomer.mockResolvedValue({
      available: true, workspaceRef, relationshipRef, displayName: "Ananya",
      gender: "female", location: "Pune, IN", relationshipStatus: "active",
      startsAt: "2026-09-10T00:00:00Z", endsAt: "2027-09-10T00:00:00Z", version: 1,
      portfolio: { status: "published", publishedAt: "2026-09-10T00:00:00Z" },
      assignedTeam: [{ memberRef: `mbr_${"c".repeat(32)}`, displayName: "Meera", rolePreset: "advisor" }],
      actions: { canReviewPortfolio: true, canCreateIntroduction: false },
    });
    render(await BrokerdeskCustomerDetailPage({ params: Promise.resolve({ workspaceRef, relationshipRef }) }));
    expect(screen.getByRole("heading", { name: "Ananya" })).toBeInTheDocument();
    expect(screen.getByText("Pune, IN")).toBeInTheDocument();
    expect(screen.getByText("Meera")).toBeInTheDocument();
    expect(screen.getByText("Portfolio review allowed")).toBeInTheDocument();
    expect(screen.getByText("Introduction setup unavailable")).toBeInTheDocument();
    expect(screen.getByText("This page never reveals another broker, agency, or Introduction route.")).toBeInTheDocument();
  });

  it("uses one unavailable view for missing, unassigned, and cross-agency references", async () => {
    getAuthenticatedUser.mockResolvedValue({ supabase: {} });
    resolveCustomer.mockResolvedValue({ available: false });
    render(await BrokerdeskCustomerDetailPage({ params: Promise.resolve({ workspaceRef, relationshipRef }) }));
    expect(screen.getByRole("heading", { name: "Customer unavailable" })).toBeInTheDocument();
  });
});
