// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Portfolio, PortfolioData, PortfolioMedia } from "../src/types/portfolio";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  clearLocalSession: vi.fn(),
  save: vi.fn(),
  publish: vi.fn(),
  renew: vi.fn(),
  rotate: vi.fn(),
  unpublish: vi.fn(),
  manageAccess: vi.fn(),
  upload: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/features/account/client/account.api", () => ({
  clearLocalAccountSession: mocks.clearLocalSession,
}));
vi.mock("@/features/portfolio/client/portfolio-dashboard.api", () => ({
  saveDashboardDraftRequest: mocks.save,
  publishPortfolioRequest: mocks.publish,
  renewPortfolioLinkRequest: mocks.renew,
  rotatePortfolioLinkRequest: mocks.rotate,
  unpublishPortfolioRequest: mocks.unpublish,
  uploadPortfolioPhotoRequest: mocks.upload,
  updatePortfolioPhotoRequest: mocks.update,
  deletePortfolioPhotoRequest: mocks.remove,
}));
vi.mock("@/features/access/client/access-dashboard.api", () => ({
  manageAccessGrantRequest: mocks.manageAccess,
}));

import DashboardClient from "../src/app/dashboard/dashboard-client";

const data: PortfolioData = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
  vitals: {}, astrology: { rashi: "kanya" }, education: {}, career: {}, family: {}, lifestyle: {}, contact: {},
  style: { template_name: "Royal Heritage" },
};

const portfolio: Portfolio = {
  id: "portfolio-1", user_id: "user-1", share_token: "token", draft_data: data,
  published_data: data, template_id: 3, theme_color: "#17151c", sun_sign: "kanya",
  is_published: true, published_at: "2026-01-01", expires_at: "2026-12-31",
  last_renewed_at: null, created_at: "2026-01-01", updated_at: "2026-01-01",
};

const media: PortfolioMedia = {
  id: "media-1", portfolio_id: "portfolio-1", storage_path: "one.webp",
  thumbnail_path: "one-thumb.webp", media_type: "gallery", visibility: "public",
  sort_order: 0, alt_text: "Portrait",
};
const accessGrantId = "11111111-1111-4111-8111-111111111111";

function renderDashboard(overrides: Partial<React.ComponentProps<typeof DashboardClient>> = {}) {
  return render(<DashboardClient portfolio={portfolio} viewCount={12} userEmail="aditi@example.com"
    canCreatePortfolio
    shareUrl="https://nakshatra.test/p/token" isExpired daysLeft={0} media={[media]}
    mediaUrls={{ "media-1": "https://signed.test/one-thumb.webp" }} {...overrides} />);
}

function goToFoundation() {
  fireEvent.click(screen.getByRole("button", { name: "Next: Foundation" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", vi.fn(() => true));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  vi.spyOn(window, "open").mockImplementation(() => null);
  mocks.save.mockResolvedValue({ ok: true, data: { portfolioId: "portfolio-1" } });
  mocks.publish.mockResolvedValue({ ok: true, data: {} });
  mocks.renew.mockResolvedValue({ ok: true, data: {} });
  mocks.rotate.mockResolvedValue({ ok: true, data: {} });
  mocks.unpublish.mockResolvedValue({ ok: true, data: {} });
  mocks.manageAccess.mockResolvedValue({ ok: true, status: "renewed", expiresAt: "2099-02-01T12:00:00.000Z" });
  mocks.remove.mockResolvedValue({ ok: true, data: {} });
  mocks.update.mockImplementation(async (_id, changes) => ({ ok: true, data: { media: { ...media, ...changes } } }));
  mocks.upload.mockResolvedValue({
    ok: true,
    data: { media: { ...media, id: "media-2" }, previewUrl: "https://signed.test/media-2.webp" },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("dashboard client", () => {
  it("shows identity-verification actions only after a saved candidate is linked", () => {
    renderDashboard({ portfolio: { ...portfolio, candidate_id: "candidate-1" } });
    expect(screen.getByRole("heading", { name: "Identity verification" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify myself" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create candidate invitation" })).toBeInTheDocument();
  });

  it("opens the canonical editor when requested by an editing route", () => {
    renderDashboard({ initialEditorOpen: true });
    expect(screen.getByRole("heading", { name: "Portfolio details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy and sharing" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Portfolio completion steps" })).toHaveAttribute("aria-valuenow", "1");
    goToFoundation();
    expect(screen.getByRole("heading", { name: "Portfolio essentials" })).toBeInTheDocument();
    expect(screen.queryByText("Rashi palette")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Music")).not.toBeInTheDocument();
  });

  it("opens a new private draft, edits it, saves it, and publishes it", async () => {
    renderDashboard({ portfolio: null, shareUrl: null, media: [] });
    expect(screen.getByText(/one clear introduction/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start with the basics/i }));
    goToFoundation();
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "New" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Name" } });
    fireEvent.change(
      screen.getByLabelText("Short introduction"),
      { target: { value: "A story" } }
    );
    fireEvent.change(screen.getByLabelText("Date of birth"), {
      target: { value: "1990-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Gender"), {
      target: { value: "female" },
    });
    fireEvent.change(screen.getByLabelText("Height"), {
      target: { value: `5'5"` },
    });
    fireEvent.change(screen.getByLabelText("Marital status"), {
      target: { value: "Never Married" },
    });
    expect(screen.queryByText("Portfolio template")).not.toBeInTheDocument();
    const palette = screen.queryAllByRole("button").find((button) => button.textContent?.includes("#"));
    if (palette) fireEvent.click(palette);
    fireEvent.click(screen.getByRole("button", { name: /add photos/i }));
    fireEvent.click(screen.getByRole("button", { name: /close portfolio details/i }));
    fireEvent.click(screen.getByRole("button", { name: /portfolio details/i }));
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /review and publish/i }));
    expect(await screen.findByRole("dialog", { name: /check both views before publishing/i })).toBeInTheDocument();
    expect(screen.getByTitle("First View portfolio preview")).toHaveAttribute("src", "/preview");
    expect(screen.getByTitle("Full View portfolio preview")).toHaveAttribute("src", "/approved-preview");
    expect(mocks.publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Publish portfolio" }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalled());
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("operates published-link controls and signs out", async () => {
    renderDashboard();
    expect(screen.getByRole("link", { name: /full portfolio preview/i })).toHaveAttribute("href", "/approved-preview");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /share on whatsapp/i }));
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank");
    fireEvent.click(screen.getByRole("button", { name: /renew/i }));
    await waitFor(() => expect(mocks.renew).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /rotate link/i }));
    await waitFor(() => expect(mocks.rotate).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /unpublish/i }));
    await waitFor(() => expect(mocks.unpublish).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(mocks.clearLocalSession).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledWith("/");
  });

  it("lets an owner approve a signed-in interest from the dashboard", async () => {
    const decisionFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, status: "approved" }), { status: 200 })
    );
    vi.stubGlobal("fetch", decisionFetch);
    const disclosureData: PortfolioData = {
      ...data,
      education: { degree: "MS", institution: "Northeastern" },
      career: { title: "Engineer", company: "Nakshatra" },
      family: { father: { name: "Rao", occupation: "Engineer" } },
      lifestyle: { languages: "English, Telugu" },
      preferences: { narrative: "A kind partnership." },
      contact: { contacts: [{ name: "Rao", email: "family@example.com" }] },
    };
    renderDashboard({
      portfolio: { ...portfolio, draft_data: disclosureData, published_data: disclosureData },
      interests: [{
        id: "interest-1",
        viewer_name: "Rohan Mehta",
        viewer_phone: "+1 555 010 2200",
        viewer_email: "rohan@example.com",
        viewer_family_context: "Our family is based in Toronto and Bengaluru.",
        message: "We would be glad to introduce our families.",
        status: "new",
        requester_user_id: "viewer-1",
        metadata: { profile_for: "self", country: "Canada", state: "Ontario", city: "Toronto" },
        created_at: "2026-08-09T12:00:00.000Z",
      }],
    });

    fireEvent.click(screen.getByText("Rohan Mehta"));
    expect(screen.getByText(/Toronto, Ontario, Canada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review Full View access" }));

    const approval = screen.getByRole("dialog", { name: /Grant Full View to Rohan Mehta/i });
    expect(within(approval).getByText(/Access expires seven days after approval/i)).toBeInTheDocument();
    expect(within(approval).getByText(/Personal profile, location, and story details/i)).toBeInTheDocument();
    expect(within(approval).getByText("Exact date of birth")).toBeInTheDocument();
    expect(within(approval).getByText(/Education, employer, career/i)).toBeInTheDocument();
    expect(within(approval).getByText(/Family members, origins/i)).toBeInTheDocument();
    expect(within(approval).getByText(/Lifestyle, languages/i)).toBeInTheDocument();
    expect(within(approval).getByText(/Partner preferences/i)).toBeInTheDocument();
    expect(within(approval).getByText("Protected contact details")).toBeInTheDocument();
    expect(decisionFetch).not.toHaveBeenCalled();
    fireEvent.click(within(approval).getByRole("button", { name: "Confirm Full View for 7 days" }));

    await waitFor(() => expect(decisionFetch).toHaveBeenCalledWith(
      "/api/interest/interest-1",
      expect.objectContaining({ method: "PATCH" })
    ));
    expect(await screen.findByText("0 waiting")).toBeInTheDocument();
  });

  it("lets the owner renew and revoke Full View access", async () => {
    renderDashboard({
      accessSummary: {
        grants: [{
          id: accessGrantId,
          interestRequestId: "22222222-2222-4222-8222-222222222222",
          viewerName: "Rohan Mehta",
          status: "active",
          expiresAt: "2099-01-01T12:00:00.000Z",
          renewedAt: null,
          revokedAt: null,
          lastAccessedAt: null,
        }],
        events: [{
          id: 1,
          eventType: "grant_created",
          viewerName: "Rohan Mehta",
          createdAt: "2026-08-16T00:00:00.000Z",
          metadata: {},
        }],
      },
    });

    expect(screen.getByText("Active until Jan 1, 2099")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Renew 7 days" }));
    await waitFor(() => expect(mocks.manageAccess).toHaveBeenCalledWith(accessGrantId, "renew"));
    expect(await screen.findByText("Active until Feb 1, 2099")).toBeInTheDocument();

    mocks.manageAccess.mockResolvedValueOnce({ ok: true, status: "revoked" });
    fireEvent.click(screen.getByRole("button", { name: "End access" }));
    await waitFor(() => expect(mocks.manageAccess).toHaveBeenCalledWith(accessGrantId, "revoke"));
    expect(await screen.findByText("Access ended")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Access history"));
    expect(screen.getByText("Full portfolio access granted to Rohan Mehta")).toBeInTheDocument();
  });

  it("updates, deletes, and uploads owner photos", async () => {
    const { container } = renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit portfolio/i }));
    goToFoundation();
    expect(screen.getByText("1/8")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Profile photo" })).toHaveClass("w-36", "sm:w-40");
    const portrait = await screen.findByAltText("Portrait");
    expect(portrait).toHaveAttribute("src", "https://signed.test/one-thumb.webp");
    expect(portrait.parentElement).toHaveClass("h-36", "sm:h-40");
    expect(screen.getByRole("button", { name: /add photos/i })).toHaveClass("h-36", "w-36", "sm:h-40", "sm:w-40");
    const visibility = screen.getByLabelText("Photo visibility");
    expect(within(visibility).getByRole("option", { name: "Blurred until approval" })).toBeInTheDocument();
    expect(within(visibility).getByRole("option", { name: "Visible to all" })).toBeInTheDocument();
    expect(within(visibility).queryByRole("option", { name: "Approved interest only" })).not.toBeInTheDocument();
    expect(within(visibility).queryByRole("option", { name: "Only me" })).not.toBeInTheDocument();
    fireEvent.change(visibility, { target: { value: "interest_required" } });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("media-1", { visibility: "interest_required" }));
    fireEvent.click(screen.getByRole("button", { name: /make primary photo/i }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("media-1", { media_type: "hero" }));
    fireEvent.click(screen.getByRole("button", { name: /delete photo/i }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("media-1"));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["photo"], "portrait.png", { type: "image/png" })] } });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
  });

  it("redirects expired sessions and shows ordinary API failures", async () => {
    mocks.save.mockResolvedValueOnce({ ok: false, error: { code: "AUTH_SESSION_MISSING", message: "Sign in" } });
    mocks.publish.mockResolvedValueOnce({ ok: false, error: { code: "PUBLISH_FAILED", message: "Complete required fields" } });
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit portfolio/i }));
    goToFoundation();
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login?error=session_expired"));
    fireEvent.click(screen.getByRole("button", { name: /review changes/i }));
    expect(await screen.findByRole("dialog", { name: /check both views before publishing/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /publish reviewed changes/i }));
    expect(await screen.findByText(/complete required fields/i)).toBeInTheDocument();
  });

  it("cancels publication review without changing the public portfolio", async () => {
    renderDashboard({ initialEditorOpen: true });
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    expect(await screen.findByRole("dialog", { name: /check both views before publishing/i })).toBeInTheDocument();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.publish).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /check both views before publishing/i })).not.toBeInTheDocument();
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("keeps interests, access history, and stats visible while unpublished", () => {
    renderDashboard({
      portfolio: { ...portfolio, is_published: false, share_token: null },
      shareUrl: null,
      viewCount: 8,
      interests: [{
        id: "interest-unpublished",
        viewer_name: "Maya Shah",
        viewer_phone: null,
        viewer_email: "maya@example.com",
        viewer_family_context: null,
        message: null,
        status: "new",
        requester_user_id: "viewer-2",
        metadata: null,
        created_at: "2026-08-10T12:00:00.000Z",
      }],
      accessSummary: {
        grants: [],
        events: [{
          id: 7,
          eventType: "portfolio_unpublished",
          viewerName: null,
          createdAt: "2026-08-11T12:00:00.000Z",
          metadata: {},
        }],
      },
    });

    expect(screen.getByRole("heading", { name: "Interests to review" })).toBeInTheDocument();
    expect(screen.getByText("Maya Shah")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Access history"));
    expect(screen.getByText("Portfolio unpublished")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Public sharing is off")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Share on WhatsApp/i })).not.toBeInTheDocument();
  });

  it("updates field disclosure labels when Short introduction is selected", () => {
    renderDashboard({ initialEditorOpen: true });
    fireEvent.click(screen.getByRole("button", { name: /Short introduction/i }));
    goToFoundation();
    expect(screen.getAllByText("Shown in: Short and Full").length).toBeGreaterThan(0);
    expect(screen.getByText("Shown in: Age in Short · Exact date in Full")).toBeInTheDocument();
    expect(screen.getAllByText("Shown in: Full only").length).toBeGreaterThan(0);
  });

  it("preserves unsaved answers, offers retry, and warns before closing", async () => {
    mocks.save.mockResolvedValueOnce({
      ok: false,
      error: { code: "DASHBOARD_SAVE_FAILED", message: "We could not save your portfolio right now." },
    });
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit portfolio/i }));
    goToFoundation();
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Changed" } });
    const beforeUnload = new Event("beforeunload", { cancelable: true });
    fireEvent(window, beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
    vi.mocked(confirm).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: /close portfolio details/i }));
    expect(screen.getByRole("heading", { name: "Portfolio details" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your answers are still on this screen.");
    fireEvent.click(screen.getByRole("button", { name: "Try saving again" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
  });

  it("requires an explicit choice for legacy photo privacy without expanding access", () => {
    renderDashboard({ media: [{ ...media, visibility: "hidden" }] });
    fireEvent.click(screen.getByRole("button", { name: /edit portfolio/i }));
    goToFoundation();
    expect(screen.getByLabelText("Photo visibility")).toHaveValue("");
    expect(screen.getByText(/existing privacy remains unchanged/i)).toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("uses a distinct redirect reason for an explicitly revoked session", async () => {
    mocks.save.mockResolvedValueOnce({
      ok: false,
      error: { code: "AUTH_SESSION_REVOKED", message: "This session was signed out", status: 401 },
    });
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit portfolio/i }));
    goToFoundation();
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login?error=session_revoked"));
  });

  it("shows the private-beta boundary without creator controls for non-invited accounts", () => {
    renderDashboard({
      portfolio: null,
      canCreatePortfolio: false,
      shareUrl: null,
      media: [],
      viewCount: 0,
    });

    expect(screen.getByText("Private beta testing")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Portfolio creation is currently invite-only." })).toBeInTheDocument();
    expect(screen.getByText(/open portfolio links shared with you/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start with the basics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /portfolio details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /interests to review/i })).not.toBeInTheDocument();
  });

});
