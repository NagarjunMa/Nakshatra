// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createWorkspace = vi.hoisted(() => vi.fn());
const saveOnboarding = vi.hoisted(() => vi.fn());
vi.mock("../src/features/organizations/client/brokerdesk-onboarding.api", () => ({
  createWorkspace,
  saveOnboarding,
}));

import { BrokerdeskOnboardingClient } from "../src/app/brokerdesk/onboarding/brokerdesk-onboarding-client";
import { workspaceRefSchema } from "../src/features/security/public-reference";

const WORKSPACE_REF = workspaceRefSchema.parse(`wrk_${"a".repeat(32)}`);
const baseOnboarding = {
  available: true as const,
  workspaceRef: WORKSPACE_REF,
  workspaceName: "Trusted Matches",
  workspaceStatus: "onboarding" as const,
  onboardingStatus: "draft" as const,
  nextStage: "representative" as const,
  version: 1,
  profile: {
    legalName: "Trusted Matches",
    tradingName: null,
    businessType: "partnership" as const,
    registrationNumber: null,
    registrationCountry: null,
    primaryCity: "Pune",
    primaryRegion: "Maharashtra",
    primaryCountry: "IN",
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
    { type: "business_contact" as const, status: "required" as const, expiresAt: null, attentionReason: null },
    { type: "business_registration" as const, status: "under_review" as const, expiresAt: null, attentionReason: null },
    { type: "representative_identity" as const, status: "needs_attention" as const, expiresAt: null, attentionReason: "Please retry identity verification." },
  ],
};

describe("BrokerDesk onboarding interface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it("starts with plain-language business setup and private-state guidance", () => {
    render(<BrokerdeskOnboardingClient initialOnboarding={null} />);
    expect(screen.getByRole("heading", { name: "Tell us about your business" })).toBeInTheDocument();
    expect(screen.getByText("Customers cannot find this workspace yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customer dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("creates the private workspace before collecting representative details", async () => {
    createWorkspace.mockResolvedValue(baseOnboarding);
    const user = userEvent.setup();
    render(<BrokerdeskOnboardingClient initialOnboarding={null} />);
    await user.type(screen.getByLabelText(/Legal business name/), "Trusted Matches");
    await user.selectOptions(screen.getByLabelText(/Business type/), "partnership");
    await user.type(screen.getByLabelText(/Primary city/), "Pune");
    await user.clear(screen.getByLabelText(/Country code/));
    await user.type(screen.getByLabelText(/Country code/), "IN");
    await user.click(screen.getByRole("button", { name: /continue to your details/i }));
    expect(createWorkspace).toHaveBeenCalledWith(expect.objectContaining({
      legalName: "Trusted Matches",
      businessType: "partnership",
      primaryCity: "Pune",
      primaryCountry: "IN",
    }), expect.stringMatching(/^create:/));
    expect(await screen.findByRole("heading", { name: "Who is responsible for this workspace?" })).toBeInTheDocument();
  });

  it("shows exact verification labels and keeps document upload fail closed", () => {
    render(<BrokerdeskOnboardingClient initialOnboarding={{
      ...baseOnboarding,
      onboardingStatus: "ready_for_verification",
      nextStage: "verification",
      version: 2,
    }} />);
    expect(screen.getByText("Representative identity")).toBeInTheDocument();
    expect(screen.getByText("Business registration")).toBeInTheDocument();
    expect(screen.getByText("Business contact")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("Document upload is not open yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
  });
});
