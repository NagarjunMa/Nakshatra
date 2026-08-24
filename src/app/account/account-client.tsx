"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, KeyRound, LoaderCircle, ShieldCheck, Trash2, X } from "lucide-react";
import type { AccountDeletionStatus } from "@/features/account/server/account.contract";
import {
  cancelAccountDeletionRequest,
  downloadAccountExportRequest,
  requestAccountDeletionRequest,
  revokeOtherSessionsRequest,
} from "@/features/account/client/account.api";

interface Props {
  userEmail: string;
  initialDeletion: AccountDeletionStatus;
}

type Action = "export" | "sessions" | "delete" | "cancel" | null;

/** Presents browser-safe account controls while all privileged work remains in authenticated APIs. */
export default function AccountClient({ userEmail, initialDeletion }: Props) {
  const [deletion, setDeletion] = useState(initialDeletion);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function beginAction(next: Exclude<Action, null>) {
    setAction(next);
    setMessage(null);
    setError(null);
  }

  /** Requests the export and lets the browser save the returned private JSON file locally. */
  async function downloadExport() {
    beginAction("export");
    const result = await downloadAccountExportRequest();
    if (!result.ok) {
      setError(result.message);
      setAction(null);
      return;
    }
    const url = URL.createObjectURL(result.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nakshatra-account-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Your account export has been downloaded.");
    setAction(null);
  }

  /** Invalidates all Supabase sessions except the current browser session. */
  async function revokeOtherSessions() {
    beginAction("sessions");
    const result = await revokeOtherSessionsRequest();
    if (!result.ok) setError(result.message);
    else setMessage("Other devices have been signed out.");
    setAction(null);
  }

  /** Revokes shared access now while preserving private recovery-window access. */
  async function requestDeletion() {
    if (confirmation !== "DELETE") return;
    beginAction("delete");
    const result = await requestAccountDeletionRequest();
    if (!result.ok) {
      setError(result.message);
      setAction(null);
      return;
    }
    if (result.data.status === "ownership_transfer_required") {
      const count = result.data.organizationCount ?? 1;
      setError(`Transfer ownership of ${count} ${count === 1 ? "organization" : "organizations"} before deleting this account.`);
      setAction(null);
      return;
    }
    setDeletion({
      status: "pending",
      scheduledFor: result.data.scheduledFor ?? new Date().toISOString(),
      requestedAt: new Date().toISOString(),
    });
    setConfirmationOpen(false);
    setConfirmation("");
    setMessage("Account deletion is scheduled. You can continue using your account until processing begins, or cancel during the recovery window.");
    setAction(null);
  }

  /** Cancels a pending request; previously unpublished portfolios remain private. */
  async function cancelDeletion() {
    beginAction("cancel");
    const result = await cancelAccountDeletionRequest();
    if (!result.ok) setError(result.message);
    else {
      setDeletion(null);
      setMessage("Account deletion has been canceled. Your portfolio remains unpublished.");
    }
    setAction(null);
  }

  const deletionPending = deletion?.status === "pending" || deletion?.status === "failed";
  const deletionProcessing = deletion?.status === "processing";

  return (
    <div className="account-privacy-shell">
      <header className="dashboard-header px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link href="/dashboard" className="account-back-link">
            <ArrowLeft aria-hidden="true" />
            Dashboard
          </Link>
          <strong className="text-sm">NAKSHATRA</strong>
        </div>
      </header>

      <main className="account-privacy-main">
        <div className="account-privacy-heading">
          <p className="site-eyebrow">Account controls</p>
          <h1>Privacy and sessions</h1>
          <p>{userEmail}</p>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {message ? <p className="account-notice is-success">{message}</p> : null}
          {error ? <p className="account-notice is-error">{error}</p> : null}
        </div>

        <section className="account-control-row" aria-labelledby="export-heading">
          <div>
            <h2 id="export-heading">Download your data</h2>
            <p>Export your profile, portfolio, media inventory, memberships, and your own activity as JSON.</p>
          </div>
          <button className="dashboard-secondary-action" onClick={downloadExport} disabled={action !== null}>
            {action === "export" ? <LoaderCircle className="animate-spin" /> : <Download />}
            Download
          </button>
        </section>

        <section className="account-control-row" aria-labelledby="sessions-heading">
          <div>
            <h2 id="sessions-heading">Other signed-in devices</h2>
            <p>End every other active session. This browser stays signed in.</p>
          </div>
          <button className="dashboard-secondary-action" onClick={revokeOtherSessions} disabled={action !== null}>
            {action === "sessions" ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
            Sign out others
          </button>
        </section>

        <section className="account-control-row account-danger-zone" aria-labelledby="delete-heading">
          <div>
            <h2 id="delete-heading">Delete account</h2>
            {deletionPending ? (
              <p>
                Deletion is scheduled for {new Date(deletion.scheduledFor).toLocaleString()}.
                Public and approved portfolio access is already disabled.
              </p>
            ) : (
              <p>Public access is revoked immediately. Permanent deletion begins after a 24-hour recovery window.</p>
            )}
          </div>
          {deletionPending ? (
            <button className="dashboard-secondary-action" onClick={cancelDeletion} disabled={action !== null}>
              {action === "cancel" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
              Cancel deletion
            </button>
          ) : deletionProcessing ? (
            <p className="account-notice is-error">Deletion is being processed and can no longer be canceled.</p>
          ) : (
            <button className="dashboard-danger-action" onClick={() => setConfirmationOpen(true)} disabled={action !== null}>
              <Trash2 />
              Delete account
            </button>
          )}
        </section>
      </main>

      {confirmationOpen ? (
        <div className="account-confirm-backdrop" role="presentation">
          <section className="account-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-heading">
            <button className="account-confirm-close" aria-label="Close deletion confirmation" onClick={() => setConfirmationOpen(false)}>
              <X />
            </button>
            <p className="site-eyebrow">Permanent action</p>
            <h2 id="confirm-delete-heading">Schedule account deletion?</h2>
            <p>Your links and approved access stop working now. After 24 hours, your account and stored files are permanently removed.</p>
            <label htmlFor="delete-confirmation">Type <strong>DELETE</strong> to continue</label>
            <input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
            <button className="dashboard-danger-action" onClick={requestDeletion} disabled={confirmation !== "DELETE" || action !== null}>
              {action === "delete" ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              Schedule deletion
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
