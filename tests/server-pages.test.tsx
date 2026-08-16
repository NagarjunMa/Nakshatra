// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioData } from "../src/types/portfolio";

const mocks = vi.hoisted(() => ({
  outcomes: {} as Record<string, { data?: unknown; count?: number | null }>,
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  photoUrls: vi.fn(async () => [{
    id: "photo",
    src: "https://signed.test/photo",
    alt: "Portrait",
    mediaType: "hero" as const,
    orientation: "portrait" as const,
  }]),
  rpc: vi.fn(),
  signedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed.test/hero" } })),
  imageResponse: vi.fn(),
  authUser: null as { id: string } | null,
}));

function databaseClient() {
  mocks.rpc.mockImplementation((name: string) =>
    Promise.resolve(mocks.outcomes[name] ?? { data: null, error: null })
  );
  return {
    from: vi.fn((table: string) => {
      const response = () => mocks.outcomes[table] ?? { data: null };
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "not", "is", "order", "limit"]) chain[method] = vi.fn(() => chain);
      chain.single = vi.fn(async () => response());
      chain.maybeSingle = vi.fn(async () => response());
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(response()).then(resolve);
      return chain;
    }),
    rpc: mocks.rpc,
    auth: { getUser: vi.fn(async () => ({ data: { user: mocks.authUser }, error: null })) },
    storage: { from: () => ({ createSignedUrl: mocks.signedUrl }) },
  };
}

vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "nakshatra.test", "x-forwarded-proto": "https" }) }));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "geist-sans" }),
  Geist_Mono: () => ({ variable: "geist-mono" }),
  Manrope: () => ({ variable: "portfolio-body" }),
  Playfair_Display: () => ({ variable: "portfolio-display" }),
  Tenor_Sans: () => ({ variable: "portfolio-section" }),
}));
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: React.ReactNode, options: unknown) {
      mocks.imageResponse(element, options);
    }
  },
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser: async () => ({ supabase: databaseClient(), user: { id: "user-1", email: "user@example.com" } }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => databaseClient() }));
vi.mock("@/features/media/server/photo-url.service", () => ({ createPortfolioPhotoUrls: mocks.photoUrls }));
vi.mock("@/components/templates", () => ({
  BiodataTemplate: (props: { data: PortfolioData; accessMode?: string }) => <div data-testid="template">{props.data.personal.name}:{props.accessMode}</div>,
}));
vi.mock("@/components/auth/AuthForm", () => ({ AuthForm: ({ mode }: { mode: string }) => <div>auth:{mode}</div> }));
vi.mock("@/app/dashboard/dashboard-client", () => ({ default: (props: { userEmail: string; shareUrl: string | null; viewCount: number }) => <div data-testid="dashboard-props">{JSON.stringify(props)}</div> }));

import DashboardPage from "../src/app/dashboard/page";
import EditPage from "../src/app/edit/page";
import PreviewPage from "../src/app/preview/page";
import ApprovedPreviewPage from "../src/app/approved-preview/page";
import PublicBiodataPage, { generateMetadata } from "../src/app/p/[token]/page";
import HoroscopePage from "../src/app/p/[token]/horoscope/page";
import OpenGraphImage from "../src/app/p/[token]/opengraph-image";
import LoginPage from "../src/app/login/page";
import SignupPage from "../src/app/signup/page";
import RootLayout from "../src/app/layout";
import DashboardLoading from "../src/app/dashboard/loading";
import EditLoading from "../src/app/edit/loading";
import PreviewLoading from "../src/app/preview/loading";

const data: PortfolioData = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female" },
  astrology: { rashi: "kanya" },
};
const portfolio = {
  id: "portfolio-1", user_id: "user-1", share_token: "token", draft_data: data,
  template_id: 3, theme_color: "#17151c", sun_sign: "kanya", is_published: true,
  expires_at: "2020-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.outcomes = {};
  mocks.authUser = null;
});

describe("authenticated server pages", () => {
  it("loads an empty dashboard", async () => {
    mocks.outcomes.portfolios = { data: null };
    render(await DashboardPage());
    expect(screen.getByTestId("dashboard-props")).toHaveTextContent('"shareUrl":null');
  });

  it("loads dashboard counts, media, share URL, and expiry", async () => {
    mocks.outcomes.portfolios = { data: portfolio };
    mocks.outcomes.portfolio_views = { count: 7 };
    mocks.outcomes.portfolio_media = { data: [{ id: "media-1" }] };
    render(await DashboardPage());
    const props = screen.getByTestId("dashboard-props").textContent ?? "";
    expect(props).toContain('"viewCount":7');
    expect(props).toContain("https://nakshatra.test/p/token");
    expect(props).toContain('"isExpired":true');
  });

  it("opens the canonical dashboard editor from the legacy edit URL", async () => {
    await expect(EditPage()).rejects.toThrow("REDIRECT:/dashboard?edit=1");
    mocks.outcomes.portfolios = { data: portfolio };
    render(await DashboardPage({ searchParams: Promise.resolve({ edit: "1" }) }));
    expect(screen.getByTestId("dashboard-props")).toHaveTextContent('"initialEditorOpen":true');
  });

  it("loads preview and returns to the canonical editor", async () => {
    mocks.outcomes.portfolios = { data: portfolio };
    mocks.outcomes.portfolio_media = { data: [] };
    render(await PreviewPage());
    expect(screen.getByText("Preview Mode (Draft)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to editing" })).toHaveAttribute("href", "/dashboard?edit=1");
    expect(screen.getByTestId("template")).toHaveTextContent("Aditi Rao:public");
    expect(mocks.photoUrls).toHaveBeenCalledWith(expect.objectContaining({ viewer: "public" }));
    mocks.outcomes.portfolios = { data: null };
    await expect(PreviewPage()).rejects.toThrow("REDIRECT:/dashboard?edit=1");
  });

  it("loads the owner-safe full approved request preview", async () => {
    mocks.outcomes.portfolios = { data: portfolio };
    mocks.outcomes.portfolio_media = { data: [] };
    mocks.outcomes.portfolio_horoscopes = { data: null };
    render(await ApprovedPreviewPage());
    expect(screen.getByText(/Full Approved View · Owner preview/)).toBeInTheDocument();
    expect(screen.getByTestId("template")).toHaveTextContent("Aditi Rao:approved");
    expect(mocks.photoUrls).toHaveBeenCalledWith(expect.objectContaining({ viewer: "approved" }));
  });
});

describe("public portfolio pages", () => {
  const publicPayload = {
    data,
    templateId: 3,
    themeColor: "#17151c",
    sunSign: "kanya",
    media: [],
  };

  it("builds missing and complete metadata", async () => {
    mocks.outcomes.resolve_public_portfolio = { data: null };
    await expect(generateMetadata({ params: Promise.resolve({ token: "missing" }) })).resolves.toEqual({ title: "Biodata Not Found" });
    mocks.outcomes.resolve_public_portfolio = { data: publicPayload };
    const metadata = await generateMetadata({ params: Promise.resolve({ token: "token" }) });
    expect(metadata.title).toBe("Aditi Rao — Wedding Biodata");
    expect(metadata.description).toContain("Kanya");
  });

  it("rejects inactive tokens and renders sanitized public snapshots", async () => {
    mocks.outcomes.resolve_public_portfolio = { data: null };
    await expect(PublicBiodataPage({ params: Promise.resolve({ token: "missing" }) })).rejects.toThrow("NOT_FOUND");
    mocks.outcomes.resolve_public_portfolio = { data: publicPayload };
    mocks.outcomes.record_public_portfolio_view = { data: true };
    render(await PublicBiodataPage({ params: Promise.resolve({ token: "token" }) }));
    expect(screen.getByTestId("template")).toHaveTextContent("Aditi Rao:public");
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("record_public_portfolio_view", { p_share_token: "token" }));
  });

  it("uses the approved projection only when row-level access returns an approved snapshot", async () => {
    mocks.authUser = { id: "viewer-1" };
    mocks.outcomes.resolve_public_portfolio = { data: publicPayload };
    mocks.outcomes.resolve_approved_portfolio = { data: { ...publicPayload, data: { ...data, personal: { ...data.personal, name: "Approved Aditi" } } } };
    render(await PublicBiodataPage({ params: Promise.resolve({ token: "token" }) }));
    expect(screen.getByTestId("template")).toHaveTextContent("Approved Aditi:approved");
    expect(mocks.rpc).toHaveBeenCalledWith("resolve_approved_portfolio", { p_share_token: "token" });
  });

  it("keeps the published link public for a signed-in owner without a viewer grant", async () => {
    mocks.authUser = { id: "user-1" };
    mocks.outcomes.resolve_public_portfolio = { data: publicPayload };
    mocks.outcomes.resolve_approved_portfolio = { data: null };

    render(await PublicBiodataPage({ params: Promise.resolve({ token: "token" }) }));

    expect(screen.getByTestId("template")).toHaveTextContent("Aditi Rao:public");
    expect(screen.queryByText(/Owner-only approved data/)).not.toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("resolve_approved_portfolio", { p_share_token: "token" });
  });

  it("keeps the separate horoscope viewer gated and uses a neutral Word download", async () => {
    mocks.outcomes.resolve_approved_horoscope = { data: null };
    await expect(HoroscopePage({ params: Promise.resolve({ token: "token" }) })).rejects.toThrow("NOT_FOUND");

    mocks.outcomes.resolve_approved_horoscope = { data: {
      accessPath: "owner/portfolio-1/private.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileExtension: "docx",
      languageLabel: "Kannada",
      pageCount: null,
      profileName: "Aditi Rao",
    } };
    render(await HoroscopePage({ params: Promise.resolve({ token: "token" }) }));
    expect(screen.getByRole("heading", { name: /original horoscope/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open document/i })).toHaveAttribute("href", "https://signed.test/hero");
    expect(mocks.signedUrl).toHaveBeenCalledWith("owner/portfolio-1/private.docx", 300, { download: "horoscope.docx" });
  });

  it("generates fallback and hero-backed Open Graph images", async () => {
    mocks.outcomes.resolve_public_portfolio = { data: null };
    await OpenGraphImage({ params: Promise.resolve({ token: "missing" }) });
    expect(mocks.imageResponse).toHaveBeenLastCalledWith(expect.anything(), { width: 1200, height: 630 });
    mocks.outcomes.resolve_public_portfolio = { data: { ...publicPayload, themeColor: "#ffffff", media: [{ key: "hero", accessPath: "hero.webp", mediaType: "hero", sortOrder: 0, presentation: "clear" }] } };
    await OpenGraphImage({ params: Promise.resolve({ token: "token" }) });
    expect(mocks.signedUrl).toHaveBeenCalledWith("hero.webp", 600);
  });
});

describe("static app surfaces", () => {
  it("renders auth pages, layout, and loading states", () => {
    const layout = RootLayout({ children: <main>child</main> });
    expect(layout.props.lang).toBe("en");
    const { rerender } = render(<LoginPage />);
    expect(screen.getByText("auth:login")).toBeInTheDocument();
    rerender(<SignupPage />);
    expect(screen.getByText("auth:signup")).toBeInTheDocument();
    rerender(<DashboardLoading />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    rerender(<EditLoading />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    rerender(<PreviewLoading />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
