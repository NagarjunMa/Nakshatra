import { describe, expect, it, vi } from "vitest";
import {
  createBrokerdeskWorkspace,
  getBrokerdeskBootstrap,
  getBrokerdeskOnboarding,
  saveBrokerdeskOnboarding,
} from "@/features/organizations/server/brokerdesk-onboarding.service";
import { brokerdeskProfileUpdateSchema } from "@/features/organizations/server/brokerdesk-onboarding.contract";

const WORKSPACE_REF = `wrk_${"a".repeat(32)}`;
const profile = {
  legalName: "Trusted Matches Private Limited",
  tradingName: "Trusted Matches",
  businessType: "private_limited" as const,
  registrationNumber: "REG-100",
  registrationCountry: "IN",
  primaryCity: "Bengaluru",
  primaryRegion: "Karnataka",
  primaryCountry: "IN",
};
const onboarding = {
  available: true as const,
  workspaceRef: WORKSPACE_REF,
  workspaceName: profile.legalName,
  workspaceStatus: "onboarding" as const,
  onboardingStatus: "draft" as const,
  nextStage: "representative" as const,
  version: 1,
  profile: {
    ...profile,
    representativeFullName: null,
    representativePosition: null,
    representativeWorkEmail: null,
    representativeWorkPhone: null,
    authorityContext: null,
    serviceRegions: [],
    operatingSinceYear: null,
    website: null,
    authorityDeclared: false,
    termsAccepted: false,
  },
  verificationChecks: [
    { type: "business_contact", status: "required", expiresAt: null, attentionReason: null },
    { type: "business_registration", status: "required", expiresAt: null, attentionReason: null },
    { type: "representative_identity", status: "required", expiresAt: null, attentionReason: null },
  ],
};

function client(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

describe("BrokerDesk onboarding service", () => {
  it("validates the private bootstrap projection", async () => {
    const supabase = client({
      data: {
        workspaces: [{
          workspaceRef: WORKSPACE_REF,
          workspaceName: profile.legalName,
          workspaceStatus: "onboarding",
          onboardingStatus: "draft",
          nextStage: "representative",
          rolePreset: "owner",
        }],
        nextAction: "resume_onboarding",
      },
      error: null,
    });
    await expect(getBrokerdeskBootstrap(supabase as never)).resolves.toMatchObject({
      nextAction: "resume_onboarding",
    });
  });

  it("fails closed when bootstrap persistence or its projection is unavailable", async () => {
    const databaseFailure = client({ data: null, error: { code: "XX000", message: "private" } });
    await expect(getBrokerdeskBootstrap(databaseFailure as never)).rejects.toMatchObject({
      code: "BROKERDESK_BOOTSTRAP_UNAVAILABLE",
      status: 503,
    });
    const contractFailure = client({ data: { workspaces: [], nextAction: "internal_action" }, error: null });
    await expect(getBrokerdeskBootstrap(contractFailure as never)).rejects.toMatchObject({ status: 503 });
  });

  it("creates through the atomic RPC and returns only the safe projection", async () => {
    const supabase = client({ data: onboarding, error: null });
    await expect(createBrokerdeskWorkspace(supabase as never, profile, "signup:broker:0001")).resolves.toEqual(onboarding);
    expect(supabase.rpc).toHaveBeenCalledWith("create_brokerdesk_workspace", {
      p_profile: profile,
      p_idempotency_key: "signup:broker:0001",
    });
  });

  it("maps invalid workspace commands without exposing database messages", async () => {
    const supabase = client({ data: null, error: { code: "22023", message: "secret constraint" } });
    await expect(createBrokerdeskWorkspace(supabase as never, profile, "signup:broker:0001"))
      .rejects.toMatchObject({ code: "BROKERDESK_ONBOARDING_INVALID", status: 400 });
    await expect(createBrokerdeskWorkspace(supabase as never, {
      ...profile,
      primaryCountry: "INVALID",
    } as never, "signup:broker:0002")).rejects.toBeDefined();
  });

  it("does not query persistence for malformed workspace references", async () => {
    const supabase = client({ data: onboarding, error: null });
    await expect(getBrokerdeskOnboarding(supabase as never, "an-internal-uuid")).resolves.toEqual({ available: false });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("preserves both available and uniformly unavailable onboarding projections", async () => {
    const available = client({ data: onboarding, error: null });
    await expect(getBrokerdeskOnboarding(available as never, WORKSPACE_REF)).resolves.toEqual(onboarding);
    const unavailable = client({ data: { available: false }, error: null });
    await expect(getBrokerdeskOnboarding(unavailable as never, WORKSPACE_REF)).resolves.toEqual({ available: false });
  });

  it("fails closed when onboarding persistence returns an invalid projection", async () => {
    const supabase = client({ data: { available: true, organizationId: "internal" }, error: null });
    await expect(getBrokerdeskOnboarding(supabase as never, WORKSPACE_REF)).rejects.toMatchObject({
      code: "BROKERDESK_ONBOARDING_UNAVAILABLE",
      status: 503,
    });
  });

  it("maps optimistic concurrency failures to a safe conflict", async () => {
    const supabase = client({ data: null, error: { code: "40001", message: "private details" } });
    await expect(saveBrokerdeskOnboarding(
      supabase as never,
      WORKSPACE_REF,
      { representativeFullName: "Anita Rao" },
      1,
      false,
      "save:brokerdesk:0001"
    )).rejects.toMatchObject({ code: "BROKERDESK_ONBOARDING_CONFLICT", status: 409 });
  });

  it("saves a validated update and maps inaccessible workspaces", async () => {
    const successful = client({ data: { ...onboarding, version: 2 }, error: null });
    await expect(saveBrokerdeskOnboarding(
      successful as never, WORKSPACE_REF, { website: "https://trusted.example" }, 1, false, "save:brokerdesk:0002"
    )).resolves.toMatchObject({ version: 2 });
    expect(successful.rpc).toHaveBeenCalledWith("save_brokerdesk_onboarding_profile", expect.objectContaining({
      p_workspace_ref: WORKSPACE_REF,
      p_expected_version: 1,
    }));

    await expect(saveBrokerdeskOnboarding(
      successful as never, "internal-id", {}, 1, false, "save:brokerdesk:0003"
    )).rejects.toMatchObject({ code: "BROKERDESK_WORKSPACE_UNAVAILABLE", status: 404 });

    const inaccessible = client({ data: null, error: { code: "42501", message: "private" } });
    await expect(saveBrokerdeskOnboarding(
      inaccessible as never, WORKSPACE_REF, {}, 1, false, "save:brokerdesk:0004"
    )).rejects.toMatchObject({ code: "BROKERDESK_WORKSPACE_UNAVAILABLE", status: 404 });
  });

  it("rejects undeclared authority fields at the application boundary", () => {
    expect(brokerdeskProfileUpdateSchema.safeParse({
      representativeFullName: "Anita Rao",
      rolePreset: "owner",
      verificationStatus: "verified",
      organizationId: "internal",
    }).success).toBe(false);
    expect(brokerdeskProfileUpdateSchema.safeParse({ website: "http://insecure.example" }).success).toBe(false);
    expect(brokerdeskProfileUpdateSchema.safeParse({ website: "https://trusted.example" }).success).toBe(true);
  });
});
