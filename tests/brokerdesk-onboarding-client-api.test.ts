import { afterEach, describe, expect, it, vi } from "vitest";
import { createWorkspace, saveOnboarding, startRepresentativeVerification } from "@/features/organizations/client/brokerdesk-onboarding.api";

describe("BrokerDesk onboarding client API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses same-origin JSON commands and opaque workspace paths", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(
      JSON.stringify({ available: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )));
    vi.stubGlobal("fetch", fetchMock);
    await createWorkspace({
      legalName: "Trusted Matches",
      businessType: "partnership",
      primaryCity: "Pune",
      primaryCountry: "IN",
    }, "create:brokerdesk:1");
    await saveOnboarding(`wrk_${"a".repeat(32)}`, { representativeFullName: "Anita Rao" }, 1, false, "save:brokerdesk:001");
    await startRepresentativeVerification(`wrk_${"a".repeat(32)}`, "1985-05-12");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/brokerdesk/workspaces", expect.objectContaining({
      method: "POST", credentials: "same-origin",
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/brokerdesk/workspaces/wrk_${"a".repeat(32)}/business-profile`,
      expect.objectContaining({ method: "PUT", credentials: "same-origin" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `/api/v1/brokerdesk/workspaces/wrk_${"a".repeat(32)}/representative-verification`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ birthDate: "1985-05-12", consent: true }),
      })
    );
  });

  it("shows only the safe server message on a rejected command", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Workspace unavailable." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })));
    await expect(saveOnboarding(`wrk_${"a".repeat(32)}`, {}, 1, false, "save:brokerdesk:001"))
      .rejects.toThrow("Workspace unavailable.");
  });
});
