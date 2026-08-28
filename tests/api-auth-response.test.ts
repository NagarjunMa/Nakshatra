import { describe, expect, it } from "vitest";
import { apiAuthFailureResponse } from "../src/lib/api/auth-response";

describe("apiAuthFailureResponse", () => {
  it.each([
    ["missing session", { status: "missing_session" } as const, 401, "AUTH_SESSION_MISSING"],
    ["invalid session", { status: "invalid_session" } as const, 401, "AUTH_SESSION_INVALID"],
    ["revoked session", { status: "revoked_session" } as const, 401, "AUTH_SESSION_REVOKED"],
    ["unavailable service", { status: "service_unavailable" } as const, 503, "AUTH_SERVICE_UNAVAILABLE"],
  ])("returns a frontend-safe response for a %s", async (_label, auth, status, code) => {
    const response = apiAuthFailureResponse(auth);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code, error: expect.any(String) });
  });
});
