import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const createInvitation = vi.hoisted(() => vi.fn());
const claimInvitation = vi.hoisted(() => vi.fn());
const resolveCustomers = vi.hoisted(() => vi.fn());
const resolveCustomer = vi.hoisted(() => vi.fn());
const resolveBrokers = vi.hoisted(() => vi.fn());
const createClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/broker-relationships/server/customer-invitation.service", () => {
  class CustomerInvitationError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) { super(message); }
  }
  return {
    CustomerInvitationError,
    createCustomerInvitation: createInvitation,
    claimCustomerInvitation: claimInvitation,
    resolveBrokerdeskCustomers: resolveCustomers,
    resolveBrokerdeskCustomer: resolveCustomer,
    resolveCustomerBrokerRelationships: resolveBrokers,
  };
});
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError: vi.fn() }));

import { POST as create } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/customer-invitations/route";
import { GET as list } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/customers/route";
import { GET as detail } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/customers/[relationshipRef]/route";
import { POST as exchange } from "../src/app/api/v1/customer/broker-invitations/exchange/route";
import { POST as claim } from "../src/app/api/v1/customer/broker-invitations/claim/route";
import { GET as brokers } from "../src/app/api/v1/customer/brokers/route";
import { createCustomerInvitationExchangeCookie } from "@/features/broker-relationships/server/customer-invitation.cookie";
import { CustomerInvitationError } from "@/features/broker-relationships/server/customer-invitation.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const actor = { status: "authenticated" as const, user: { id: "11111111-1111-4111-8111-111111111111", sessionId: "session" }, supabase: {} };
const origin = "http://local";

function createRequest(extra: object = {}) {
  return new Request(`${origin}/api/v1/brokerdesk/workspaces/${workspaceRef}/customer-invitations`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "customer@example.com",
      idempotencyKey: "customer-invite:11111111-1111-4111-8111-111111111111",
      ...extra,
    }),
  });
}

describe("BrokerDesk customer invitation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    createClient.mockResolvedValue({});
    createInvitation.mockResolvedValue({
      status: "created", invitationRef: `inv_${"b".repeat(32)}`, workspaceRef,
      emailHint: "cu***@example.com", expiresAt: "2026-09-17T00:00:00Z",
    });
    claimInvitation.mockResolvedValue({
      available: true, status: "active", invitationRef: `inv_${"b".repeat(32)}`,
      workspaceName: "Agency A", relationshipRef: `bcr_${"c".repeat(32)}`,
      relationshipEndsAt: "2027-09-10T00:00:00Z",
    });
    resolveCustomers.mockResolvedValue({ available: true, workspaceRef, customers: [] });
    resolveCustomer.mockResolvedValue({
      available: true, workspaceRef, relationshipRef: `bcr_${"c".repeat(32)}`,
      displayName: "Customer One", gender: "female", location: null,
      relationshipStatus: "active", startsAt: "2026-09-10T00:00:00Z", endsAt: null,
      version: 1, portfolio: { status: "completing", publishedAt: null },
      assignedTeam: [], actions: { canReviewPortfolio: true, canCreateIntroduction: true },
    });
    resolveBrokers.mockResolvedValue({ available: true, relationships: [] });
  });

  it("creates a fragment-only invitation without accepting identity or tenant fields", async () => {
    const response = await create(createRequest(), { params: Promise.resolve({ workspaceRef }) });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.invitationUrl).toMatch(/^http:\/\/local\/join\/customer#token=[A-Za-z0-9_-]{43}$/);
    expect(result.invitationUrl).not.toContain("?token=");
    expect(createInvitation).toHaveBeenCalledWith(actor.supabase, expect.objectContaining({
      workspaceRef,
      emailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect((await create(createRequest({ organizationId: "internal" }), { params: Promise.resolve({ workspaceRef }) })).status).toBe(400);
  });

  it("exchanges without consuming, then claims only with explicit consent and the HttpOnly cookie", async () => {
    const token = "a".repeat(43);
    const exchanged = await exchange(new Request(`${origin}/api/v1/customer/broker-invitations/exchange`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    }));
    expect(exchanged.status).toBe(200);
    expect(exchanged.headers.get("set-cookie")).toContain("nakshatra_customer_invitation=");

    const cookie = createCustomerInvitationExchangeCookie(token);
    const accepted = await claim(new Request(`${origin}/api/v1/customer/broker-invitations/claim`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json", Cookie: `${cookie.name}=${cookie.value}` },
      body: JSON.stringify({ consent: true }),
    }));
    expect(accepted.status).toBe(200);
    expect(claimInvitation).toHaveBeenCalledWith(actor.supabase, expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(accepted.headers.get("set-cookie")).toContain("nakshatra_customer_invitation=;");
    const noConsent = await claim(new Request(`${origin}/api/v1/customer/broker-invitations/claim`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}",
    }));
    expect(noConsent.status).toBe(400);
  });

  it("returns neutral exchange and claim failures", async () => {
    const malformed = await exchange(new Request(`${origin}/api/v1/customer/broker-invitations/exchange`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ token: "short" }),
    }));
    await expect(malformed.json()).resolves.toEqual({ ready: true });
    expect(malformed.headers.get("set-cookie")).toBeNull();
    const noCookie = await claim(new Request(`${origin}/api/v1/customer/broker-invitations/claim`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }),
    }));
    expect(noCookie.status).toBe(403);
  });

  it("reads only bounded broker and customer projections", async () => {
    const listed = await list(new Request(`${origin}/api/v1/brokerdesk/workspaces/${workspaceRef}/customers`), { params: Promise.resolve({ workspaceRef }) });
    expect(listed.status).toBe(200);
    expect(resolveCustomers).toHaveBeenCalledWith(actor.supabase, workspaceRef);
    const relationshipRef = `bcr_${"c".repeat(32)}`;
    const detailed = await detail(
      new Request(`${origin}/api/v1/brokerdesk/workspaces/${workspaceRef}/customers/${relationshipRef}`),
      { params: Promise.resolve({ workspaceRef, relationshipRef }) }
    );
    expect(detailed.status).toBe(200);
    expect(resolveCustomer).toHaveBeenCalledWith(actor.supabase, workspaceRef, relationshipRef);
    const customerBrokers = await brokers(new Request(`${origin}/api/v1/customer/brokers`));
    expect(customerBrokers.status).toBe(200);
    expect(resolveBrokers).toHaveBeenCalledWith(actor.supabase);
  });

  it("fails closed across origin, authentication, throttling, unavailable projections, and service failures", async () => {
    const crossOrigin = await exchange(new Request(`${origin}/api/v1/customer/broker-invitations/exchange`, {
      method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify({ token: "a".repeat(43) }),
    }));
    expect(crossOrigin.status).toBe(403);
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await create(createRequest(), { params: Promise.resolve({ workspaceRef }) })).status).toBe(401);
    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await list(new Request(`${origin}/customers`), { params: Promise.resolve({ workspaceRef }) })).status).toBe(429);
    resolveCustomers.mockResolvedValueOnce({ available: false });
    expect((await list(new Request(`${origin}/customers`), { params: Promise.resolve({ workspaceRef }) })).status).toBe(404);
    resolveCustomer.mockResolvedValueOnce({ available: false });
    expect((await detail(new Request(`${origin}/customer`), { params: Promise.resolve({ workspaceRef, relationshipRef: `bcr_${"c".repeat(32)}` }) })).status).toBe(404);
    createInvitation.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await create(createRequest(), { params: Promise.resolve({ workspaceRef }) })).status).toBe(503);
    resolveBrokers.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await brokers(new Request(`${origin}/brokers`))).status).toBe(503);
  });

  it("keeps detail authentication and dependency failures neutral", async () => {
    const relationshipRef = `bcr_${"c".repeat(32)}`;
    const request = () => new Request(`${origin}/customer`);
    const context = { params: Promise.resolve({ workspaceRef, relationshipRef }) };
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await detail(request(), context)).status).toBe(401);
    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await detail(request(), context)).status).toBe(429);
    resolveCustomer.mockRejectedValueOnce(new CustomerInvitationError("hidden", "BROKERDESK_CUSTOMER_UNAVAILABLE", 503));
    expect((await detail(request(), context)).status).toBe(503);
    resolveCustomer.mockRejectedValueOnce(new Error("database unavailable"));
    const unavailable = await detail(request(), context);
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({ available: false });
  });
});
