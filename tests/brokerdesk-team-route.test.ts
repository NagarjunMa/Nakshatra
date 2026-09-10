import { beforeEach, describe, expect, it, vi } from "vitest";

const getApiUser = vi.hoisted(() => vi.fn());
const enforceRateLimit = vi.hoisted(() => vi.fn());
const resolveBrokerDeskTeam = vi.hoisted(() => vi.fn());
const logServerError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ getApiUser }));
vi.mock("@/features/security/server/rate-limit.service", () => ({ enforceRateLimit }));
vi.mock("@/features/organization-access/server/organization-access.service", async () => {
  class OrganizationAccessError extends Error {
    constructor(message: string, readonly code: string, readonly status: number) {
      super(message);
    }
  }
  return { OrganizationAccessError, resolveBrokerDeskTeam };
});
vi.mock("@/lib/security/logging", () => ({ getRequestId: () => "request-id", logServerError }));

import { GET } from "../src/app/api/v1/brokerdesk/workspaces/[workspaceRef]/team/route";
import { OrganizationAccessError } from "@/features/organization-access/server/organization-access.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const actor = { status: "authenticated" as const, user: { id: "actor", sessionId: "session" }, supabase: {} };
const request = new Request(`http://local/api/v1/brokerdesk/workspaces/${workspaceRef}/team`);
const context = { params: Promise.resolve({ workspaceRef }) };

describe("BrokerDesk team route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUser.mockResolvedValue(actor);
    enforceRateLimit.mockResolvedValue(null);
    resolveBrokerDeskTeam.mockResolvedValue({ available: true, workspaceRef, members: [] });
  });

  it("returns a no-store authorized projection", async () => {
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ available: true, workspaceRef, members: [] });
    expect(resolveBrokerDeskTeam).toHaveBeenCalledWith(actor.supabase, workspaceRef);
    expect(enforceRateLimit).toHaveBeenCalledWith(actor.supabase, request, "brokerdesk_team_read");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("preserves uniform unavailable results", async () => {
    resolveBrokerDeskTeam.mockResolvedValueOnce({ available: false });
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ available: false });
  });

  it("fails closed for missing sessions, exhausted quota, and service errors", async () => {
    getApiUser.mockResolvedValueOnce({ status: "missing_session" });
    expect((await GET(request, context)).status).toBe(401);

    enforceRateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    expect((await GET(request, context)).status).toBe(429);

    resolveBrokerDeskTeam.mockRejectedValueOnce(
      new OrganizationAccessError("Team access is temporarily unavailable.", "BROKERDESK_TEAM_UNAVAILABLE", 503)
    );
    const failed = await GET(request, context);
    expect(failed.status).toBe(503);
    await expect(failed.json()).resolves.toMatchObject({ code: "BROKERDESK_TEAM_UNAVAILABLE" });
  });
});
