import { afterEach, describe, expect, it, vi } from "vitest";
import { createDiditVerificationSession, DiditProviderError } from "@/features/identity-verification/server/didit.provider";

const input = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  providerSubjectRef: "22222222-2222-4222-8222-222222222222",
  legalName: "Asha Devi Rao",
  birthDate: "1994-02-20",
  callbackUrl: "https://nakshatra.test/verification/result",
};

describe("Didit provider gateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_WORKFLOW_ID;
  });

  it("sends required details server-to-server and returns only the hosted URL", async () => {
    process.env.DIDIT_API_KEY = "secret-api-key";
    process.env.DIDIT_WORKFLOW_ID = "33333333-3333-4333-8333-333333333333";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session_id: "44444444-4444-4444-8444-444444444444",
      url: "https://verify.didit.me/session/opaque-provider-token",
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDiditVerificationSession(input)).resolves.toEqual({
      sessionId: "44444444-4444-4444-8444-444444444444",
      url: "https://verify.didit.me/session/opaque-provider-token",
    });
    const request = fetchMock.mock.calls[0][1];
    expect(fetchMock.mock.calls[0][0]).toBe("https://verification.didit.me/v3/session/");
    expect(request.headers).toEqual(expect.objectContaining({ "x-api-key": "secret-api-key" }));
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      workflow_id: process.env.DIDIT_WORKFLOW_ID,
      vendor_data: `iv:${input.providerSubjectRef}:${input.attemptId}`,
      callback: input.callbackUrl,
      callback_method: "both",
      expected_details: expect.objectContaining({ first_name: "Asha", last_name: "Devi Rao", date_of_birth: input.birthDate, id_country: "IND", expected_document_types: ["P", "ID"] }),
    }));
  });

  it("fails closed for missing configuration, request failures, malformed results, and unexpected hosted URLs", async () => {
    await expect(createDiditVerificationSession(input)).rejects.toBeInstanceOf(DiditProviderError);

    process.env.DIDIT_API_KEY = "secret-api-key";
    process.env.DIDIT_WORKFLOW_ID = "33333333-3333-4333-8333-333333333333";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(createDiditVerificationSession(input)).rejects.toBeInstanceOf(DiditProviderError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 201 })));
    await expect(createDiditVerificationSession(input)).rejects.toBeInstanceOf(DiditProviderError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ session_id: "provider-session", url: "http://verify.didit.me/session" }), { status: 201 })));
    await expect(createDiditVerificationSession(input)).rejects.toBeInstanceOf(DiditProviderError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ session_id: "provider-session", url: "https://attacker.test/session" }), { status: 201 })));
    await expect(createDiditVerificationSession(input)).rejects.toBeInstanceOf(DiditProviderError);
  });
});
