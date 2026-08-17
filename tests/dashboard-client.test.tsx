// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Portfolio, PortfolioData, PortfolioMedia } from "../src/types/portfolio";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
  createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://signed.test/${path}` } })),
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
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mocks.signOut },
    storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
  }),
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
    shareUrl="https://nakshatra.test/p/token" isExpired daysLeft={0} media={[media]} {...overrides} />);
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
  mocks.upload.mockResolvedValue({ ok: true, data: { media: { ...media, id: "media-2" } } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("dashboard client", () => {
  it("opens the canonical editor when requested by an editing route", () => {
    renderDashboard({ initialEditorOpen: true });
    expect(screen.getByRole("heading", { name: "Portfolio details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Portfolio essentials" })).toBeInTheDocument();
    expect(screen.queryByText("Rashi palette")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Music")).not.toBeInTheDocument();
  });

  it("opens a new private draft, edits it, saves it, and publishes it", async () => {
    renderDashboard({ portfolio: null, shareUrl: null, media: [] });
    expect(screen.getByText(/one clear introduction/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start with the basics/i }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Name" } });
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
    await waitFor(() => expect(mocks.publish).toHaveBeenCalled());
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("operates published-link controls and signs out", async () => {
    renderDashboard();
    expect(screen.getByRole("link", { name: /full approved view/i })).toHaveAttribute("href", "/approved-preview");
    await waitFor(() => expect(mocks.createSignedUrl).toHaveBeenCalledWith("one-thumb.webp", 3600));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
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
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledWith("/");
  });

  it("lets an owner approve a signed-in interest from the dashboard", async () => {
    const decisionFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, status: "approved" }), { status: 200 })
    );
    vi.stubGlobal("fetch", decisionFetch);
    renderDashboard({
      interests: [{
        id: "interest-1",
        viewer_name: "Rohan Mehta",
        viewer_phone: "+1 555 010 2200",
        viewer_email: "rohan@example.com",
        viewer_family_context: "Our family is based in Toronto and Bengaluru.",
        message: "We would be glad to introduce our families.",
        status: "new",
        requester_user_id: "viewer-1",
        metadata: { profile_for: "self", location: "Toronto, Canada" },
        created_at: "2026-08-09T12:00:00.000Z",
      }],
    });

    fireEvent.click(screen.getByText("Rohan Mehta"));
    fireEvent.click(screen.getByRole("button", { name: "Approve Full View" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Renew 30 days" }));
    await waitFor(() => expect(mocks.manageAccess).toHaveBeenCalledWith(accessGrantId, "renew"));
    expect(await screen.findByText("Active until Feb 1, 2099")).toBeInTheDocument();

    mocks.manageAccess.mockResolvedValueOnce({ ok: true, status: "revoked" });
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(mocks.manageAccess).toHaveBeenCalledWith(accessGrantId, "revoke"));
    expect(await screen.findByText("Access revoked")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Access history"));
    expect(screen.getByText("Full View granted to Rohan Mehta")).toBeInTheDocument();
  });

  it("updates, deletes, and uploads owner photos", async () => {
    const { container } = renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /edit portfolio/i }));
    expect(screen.getByText("1/8")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Profile photo" })).toHaveClass("w-36", "sm:w-40");
    expect((await screen.findByAltText("Portrait")).parentElement).toHaveClass("h-36", "sm:h-40");
    expect(screen.getByRole("button", { name: /add photos/i })).toHaveClass("h-36", "w-36", "sm:h-40", "sm:w-40");
    fireEvent.change(screen.getByLabelText("Photo visibility"), { target: { value: "hidden" } });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("media-1", { visibility: "hidden" }));
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
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/login?error=session_expired"));
    fireEvent.click(screen.getByRole("button", { name: /update published/i }));
    expect(await screen.findByText(/complete required fields/i)).toBeInTheDocument();
  });

});
