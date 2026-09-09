import { describe, expect, it, vi } from "vitest";
import {
  BrokerdeskReauthError,
  completeBrokerdeskReauth,
  startBrokerdeskReauth,
} from "@/features/organization-access/server/brokerdesk-reauth.service";

const workspaceRef = `wrk_${"a".repeat(32)}`;
const sessionId = "11111111-1111-4111-8111-111111111111";

function rpcClient(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

describe("BrokerDesk privileged reauthentication service", () => {
  it("starts only an allowlisted workspace action", async () => {
    const data = {
      status: "started",
      challengeId: "22222222-2222-4222-8222-222222222222",
      workspaceRef,
      purpose: "team_invite",
      expiresAt: "2026-09-09T18:10:00.000Z",
    };
    const client = rpcClient({ data, error: null });

    await expect(startBrokerdeskReauth(client as never, workspaceRef, "team_invite", sessionId))
      .resolves.toEqual(data);
    expect(client.rpc).toHaveBeenCalledWith("start_brokerdesk_action_reauth", {
      p_initiating_session_id: sessionId,
      p_purpose: "team_invite",
      p_workspace_ref: workspaceRef,
    });
  });

  it("rejects malformed and unauthorized workspace references uniformly", async () => {
    const malformed = rpcClient({ data: null, error: null });
    await expect(startBrokerdeskReauth(malformed as never, "internal-uuid", "team_invite", sessionId))
      .rejects.toMatchObject({ code: "BROKERDESK_WORKSPACE_UNAVAILABLE", status: 404 });
    expect(malformed.rpc).not.toHaveBeenCalled();

    const denied = rpcClient({ data: null, error: { code: "42501" } });
    await expect(startBrokerdeskReauth(denied as never, workspaceRef, "team_invite", sessionId))
      .rejects.toBeInstanceOf(BrokerdeskReauthError);
    await expect(startBrokerdeskReauth(denied as never, workspaceRef, "team_invite", sessionId))
      .rejects.toMatchObject({ code: "BROKERDESK_WORKSPACE_UNAVAILABLE", status: 404 });
  });

  it.each(["verified", "expired", "not_fresh", "not_authorized", "invalid"] as const)(
    "validates the %s completion outcome",
    async (outcome) => {
      const client = rpcClient({ data: outcome, error: null });
      await expect(completeBrokerdeskReauth(
        client as never,
        "22222222-2222-4222-8222-222222222222",
        "a".repeat(64)
      )).resolves.toBe(outcome);
    }
  );

  it("fails closed when persistence returns an undeclared completion shape", async () => {
    const client = rpcClient({ data: "consumed", error: null });
    await expect(completeBrokerdeskReauth(
      client as never,
      "22222222-2222-4222-8222-222222222222",
      "a".repeat(64)
    )).rejects.toMatchObject({ code: "BROKERDESK_REAUTH_CALLBACK_FAILED", status: 503 });
  });
});
