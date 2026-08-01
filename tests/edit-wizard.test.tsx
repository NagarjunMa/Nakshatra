// @vitest-environment jsdom

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Portfolio, PortfolioData } from "../src/types/portfolio";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", { alt: "", ...props }),
}));

import EditWizard from "../src/app/edit/edit-wizard";

const complete: PortfolioData = {
  personal: { name: "Aditi Rao", dob: "1996-08-12", gender: "female", photo_url: "https://example.test/photo.webp" },
  vitals: { height: "5 ft 5" }, astrology: { rashi: "kanya" }, education: { degree: "MS" },
  career: { title: "Engineer" }, family: {}, lifestyle: {}, contact: { email: "family@example.com" },
  style: { template_name: "Royal Heritage", rashi_palette: "kanya-midnight", theme_color: "#17151c" },
};
const portfolio: Portfolio = {
  id: "p1", user_id: "u1", share_token: null, draft_data: complete, published_data: null,
  template_id: 3, theme_color: "#17151c", sun_sign: "kanya", is_published: false,
  published_at: null, expires_at: null, last_renewed_at: null, created_at: "2026-01-01", updated_at: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
});

describe("edit wizard", () => {
  it("renders and edits every form step", () => {
    const { container } = render(<EditWizard portfolio={portfolio} />);
    fireEvent.change(screen.getByPlaceholderText("Enter full name"), { target: { value: "Aditi R" } });
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "1997-01-01" } });
    fireEvent.change(screen.getByPlaceholderText("City, State"), { target: { value: "Boston" } });
    fireEvent.change(container.querySelector("main select")!, { target: { value: "male" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    const steps = ["Vitals", "Astrology", "Education", "Career", "Family", "Lifestyle", "Contact", "Style"];
    for (const label of steps) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
      for (const input of container.querySelectorAll<HTMLInputElement>('main input:not([type="file"])')) {
        const value = input.type === "date" ? "1990-01-01" : input.type === "time" ? "10:30" : input.type === "email" ? "new@example.com" : input.type === "tel" ? "+1 555 0100" : "Updated";
        fireEvent.change(input, { target: { value } });
      }
      for (const select of container.querySelectorAll<HTMLSelectElement>("main select")) {
        const option = select.options[Math.min(1, select.options.length - 1)];
        if (option) fireEvent.change(select, { target: { value: option.value } });
      }
      if (label === "Family") {
        fireEvent.click(screen.getByRole("button", { name: /add sibling/i }));
        fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Sibling" } });
        fireEvent.change(screen.getAllByPlaceholderText("Occupation").at(-1)!, { target: { value: "Designer" } });
        fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      }
    }
    expect(screen.queryByText("Portfolio template")).not.toBeInTheDocument();
    const palette = screen.queryAllByRole("button").find((button) => button.textContent?.includes("#"));
    if (palette) fireEvent.click(palette);
  });

  it("debounces saves and reports success, server failure, network failure, and expired sessions", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.mocked(fetch);
    const { unmount } = render(<EditWizard portfolio={portfolio} />);
    fireEvent.change(screen.getByPlaceholderText("Enter full name"), { target: { value: "Saved Name" } });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard", expect.objectContaining({ method: "PUT" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    fireEvent.change(screen.getByPlaceholderText("Enter full name"), { target: { value: "Failure" } });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText(/save failed.*retry/i)).toBeInTheDocument();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    fireEvent.change(screen.getByPlaceholderText("Enter full name"), { target: { value: "Offline" } });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    fireEvent.change(screen.getByPlaceholderText("Enter full name"), { target: { value: "Expired" } });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(router.push).toHaveBeenCalledWith("/login?error=session_expired");
    unmount();
  });

  it("prevents invalid publishing and publishes a valid portfolio", async () => {
    const { unmount } = render(<EditWizard portfolio={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Style" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(screen.getByRole("heading", { name: "Personal" })).toBeInTheDocument();
    expect(screen.getAllByText(/name is required/i).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText("Enter full name"), { target: { value: "Now valid" } });
    unmount();
    render(<EditWizard portfolio={portfolio} />);
    fireEvent.click(screen.getByRole("button", { name: "Style" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/portfolio/publish", expect.objectContaining({ method: "POST" })));
    expect(router.push).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a safe fallback when a publish failure is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not json", { status: 500 }));
    render(<EditWizard portfolio={portfolio} />);
    fireEvent.click(screen.getByRole("button", { name: "Style" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText(/publish failed: try again/i)).toBeInTheDocument();
  });

  it("handles photo upload, removal, and upload failure", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ photo_url: "https://example.test/new.webp", photo_thumb_url: "https://example.test/thumb.webp" }) } as Response);
    const { container } = render(<EditWizard portfolio={portfolio} />);
    fireEvent.click(screen.getByRole("button", { name: /change photo/i }));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByAltText("Profile")).toHaveAttribute("src", "https://example.test/new.webp"));
    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => expect(screen.queryByAltText("Profile")).not.toBeInTheDocument());
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    fireEvent.change(input, { target: { files: [new File(["photo"], "again.png", { type: "image/png" })] } });
    expect(await screen.findByText(/upload failed.*connection/i)).toBeInTheDocument();
  });
});
