// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  export: vi.fn(),
  sessions: vi.fn(),
  deletion: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/features/account/client/account.api", () => ({
  downloadAccountExportRequest: mocks.export,
  revokeOtherSessionsRequest: mocks.sessions,
  requestAccountDeletionRequest: mocks.deletion,
  cancelAccountDeletionRequest: mocks.cancel,
}));

import AccountClient from "../src/app/account/account-client";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.export.mockResolvedValue({ ok: true, data: new Blob(["{}"], { type: "application/json" }) });
  mocks.sessions.mockResolvedValue({ ok: true, data: { ok: true } });
  mocks.deletion.mockResolvedValue({
    ok: true,
    data: { status: "pending", scheduledFor: "2026-08-18T00:00:00Z" },
  });
  mocks.cancel.mockResolvedValue({ ok: true, data: { ok: true } });
  URL.createObjectURL = vi.fn(() => "blob:account-export");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("account privacy screen", () => {
  it("downloads the account export and revokes other sessions", async () => {
    render(<AccountClient userEmail="owner@example.test" initialDeletion={null} />);
    expect(screen.getByRole("heading", { name: "Privacy and sessions" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(mocks.export).toHaveBeenCalled());
    expect(screen.getByText("Your account export has been downloaded.")).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:account-export");

    fireEvent.click(screen.getByRole("button", { name: "Sign out others" }));
    await waitFor(() => expect(mocks.sessions).toHaveBeenCalled());
    expect(screen.getByText("Other devices have been signed out.")).toBeInTheDocument();
  });

  it("requires typed confirmation before scheduling deletion", async () => {
    render(<AccountClient userEmail="owner@example.test" initialDeletion={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    const schedule = screen.getByRole("button", { name: "Schedule deletion" });
    expect(schedule).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: "DELETE" } });
    fireEvent.click(schedule);

    await waitFor(() => expect(mocks.deletion).toHaveBeenCalled());
    expect(screen.getByText(/Account deletion is scheduled/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("closes confirmation without deleting and explains ownership transfer blocks", async () => {
    mocks.deletion.mockResolvedValueOnce({
      ok: true,
      data: { status: "ownership_transfer_required", organizationCount: 2 },
    });
    render(<AccountClient userEmail="owner@example.test" initialDeletion={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Close deletion confirmation" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Schedule deletion" }));
    expect(await screen.findByText(/Transfer ownership of 2 organizations/)).toBeInTheDocument();
  });

  it("shows a pending request and lets the user cancel it", async () => {
    render(<AccountClient
      userEmail="owner@example.test"
      initialDeletion={{
        status: "pending",
        scheduledFor: "2026-08-18T00:00:00Z",
        requestedAt: "2026-08-17T00:00:00Z",
      }}
    />);
    expect(screen.getByText(/Public and approved portfolio access is already disabled/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalled());
    expect(screen.getByText(/Account deletion has been canceled/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });

  it("renders processing as a non-actionable account lock", () => {
    render(<AccountClient
      userEmail="owner@example.test"
      initialDeletion={{
        status: "processing",
        scheduledFor: "2026-08-18T00:00:00Z",
        requestedAt: "2026-08-17T00:00:00Z",
      }}
    />);
    expect(screen.getByText(/Deletion is being processed/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel deletion" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete account" })).not.toBeInTheDocument();
  });

  it("surfaces safe API errors for every action", async () => {
    const failure = { ok: false, code: "UNAVAILABLE", message: "Please try again.", status: 503 };
    mocks.export.mockResolvedValueOnce(failure);
    mocks.sessions.mockResolvedValueOnce(failure);
    mocks.cancel.mockResolvedValueOnce(failure);
    const first = render(<AccountClient userEmail="owner@example.test" initialDeletion={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(await screen.findByText("Please try again.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out others" }));
    await waitFor(() => expect(mocks.sessions).toHaveBeenCalled());

    first.unmount();
    render(<AccountClient
      userEmail="owner@example.test"
      initialDeletion={{
        status: "failed",
        scheduledFor: "2026-08-18T00:00:00Z",
        requestedAt: "2026-08-17T00:00:00Z",
      }}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalled());
    expect(screen.getByText("Please try again.")).toBeInTheDocument();
  });
});
