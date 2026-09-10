// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getAuthenticatedUser = vi.hoisted(() => vi.fn());
const resolveRelationships = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
vi.mock("@/features/broker-relationships/server/customer-invitation.service", () => ({
  resolveCustomerBrokerRelationships: resolveRelationships,
}));

import CustomerBrokersPage from "../src/app/brokers/page";

describe("customer broker relationships page", () => {
  it("shows the customer's cross-agency view without exposing it to a broker", async () => {
    getAuthenticatedUser.mockResolvedValue({ supabase: {} });
    resolveRelationships.mockResolvedValue({
      available: true,
      relationships: [{
        relationshipRef: `bcr_${"a".repeat(32)}`,
        workspaceName: "Agency A",
        relationshipStatus: "active",
        startsAt: "2026-09-10T00:00:00Z",
        endsAt: "2027-09-10T00:00:00Z",
      }],
    });
    render(await CustomerBrokersPage());
    expect(screen.getByRole("heading", { name: "My brokers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agency A" })).toBeInTheDocument();
    expect(screen.getByText("Only you can see this complete list.")).toBeInTheDocument();
  });

  it("keeps the empty state simple", async () => {
    getAuthenticatedUser.mockResolvedValue({ supabase: {} });
    resolveRelationships.mockResolvedValue({ available: true, relationships: [] });
    render(await CustomerBrokersPage());
    expect(screen.getByRole("heading", { name: "No broker relationships yet" })).toBeInTheDocument();
  });
});
