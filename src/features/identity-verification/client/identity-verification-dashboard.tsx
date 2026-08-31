"use client";

import { useState } from "react";
import {
  createIdentityVerificationInvitationRequest,
  startSelfIdentityVerificationRequest,
} from "./identity-verification.api";

type PendingAction = "self" | "invitation" | null;

/** Provides explicit self-consent and delegated-invitation actions without exposing candidate details. */
export function IdentityVerificationDashboard({ candidateId }: { candidateId: string }) {
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerUrl, setProviderUrl] = useState<string | null>(null);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  async function startSelfVerification() {
    setPending("self");
    setError(null);
    const result = await startSelfIdentityVerificationRequest(candidateId);
    if (!result.ok) {
      setError(result.message);
      if (result.managementUrl) setManagementUrl(result.managementUrl);
    } else {
      setProviderUrl(result.data.url);
      setManagementUrl(result.data.managementUrl);
    }
    setPending(null);
  }

  async function createInvitation() {
    setPending("invitation");
    setError(null);
    const result = await createIdentityVerificationInvitationRequest(candidateId);
    if (!result.ok) setError(result.message);
    else setInvitationUrl(result.data.invitationUrl);
    setPending(null);
  }

  return (
    <section className="dashboard-glass p-5" aria-labelledby="identity-verification-heading">
      <div className="dashboard-section-heading">
        <div>
          <h2 id="identity-verification-heading">Identity verification</h2>
          <p>Verification is required before this profile can be publicly published.</p>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Didit uses the candidate&apos;s legal name, date of birth, India document country, and approved document types for its hosted check. Nakshatra stores consent and verification state, not identity evidence.
      </p>
      <label className="mt-4 flex gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I understand and consent to this identity-verification processing.</span>
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="dashboard-primary-action" disabled={!consent || pending !== null} onClick={() => void startSelfVerification()}>
          {pending === "self" ? "Starting verification…" : "Verify myself"}
        </button>
        <button type="button" className="dashboard-secondary-action" disabled={pending !== null} onClick={() => void createInvitation()}>
          {pending === "invitation" ? "Creating invitation…" : "Create candidate invitation"}
        </button>
      </div>
      <div className="mt-4" aria-live="polite" aria-atomic="true">
        {error ? <p className="dashboard-action-error" role="alert">{error}</p> : null}
        {invitationUrl ? <p className="dashboard-action-note">Share this private invitation only with the candidate: <a href={invitationUrl}>{invitationUrl}</a></p> : null}
        {managementUrl ? <p className="dashboard-action-note">Save your private <a href={managementUrl}>verification-management link</a>.</p> : null}
        {providerUrl ? <a className="dashboard-primary-action mt-3" href={providerUrl}>Continue to Didit verification</a> : null}
      </div>
    </section>
  );
}
