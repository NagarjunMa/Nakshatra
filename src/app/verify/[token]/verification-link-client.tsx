"use client";

import { useEffect, useState } from "react";
import {
  getIdentityVerificationLinkRequest,
  retryIdentityVerificationRequest,
  startInvitationIdentityVerificationRequest,
  withdrawIdentityVerificationConsentRequest,
  type IdentityVerificationLink,
} from "@/features/identity-verification/client/identity-verification.api";

type Action = "start" | "retry" | "withdraw" | null;

/** Displays only generic consent or management state for an opaque bearer link. */
export function VerificationLinkClient({ token }: { token: string }) {
  const [link, setLink] = useState<IdentityVerificationLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [consent, setConsent] = useState(false);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [providerUrl, setProviderUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getIdentityVerificationLinkRequest(token).then((result) => {
      if (!active) return;
      if (!result.ok) setError(result.message);
      else setLink(result.data.link);
    });
    return () => { active = false; };
  }, [token]);

  function prepareDiditRedirect(url: string, nextManagementUrl: string) {
    setManagementUrl(nextManagementUrl);
    setProviderUrl(url);
    setAction(null);
  }

  async function start() {
    setAction("start");
    setError(null);
    const result = await startInvitationIdentityVerificationRequest(token);
    if (!result.ok) {
      setError(result.message);
      if (result.managementUrl) setManagementUrl(result.managementUrl);
      setAction(null);
      return;
    }
    prepareDiditRedirect(result.data.url, result.data.managementUrl);
  }

  async function retry() {
    setAction("retry");
    setError(null);
    const result = await retryIdentityVerificationRequest(token);
    if (!result.ok) {
      setError(result.message);
      setAction(null);
      return;
    }
    prepareDiditRedirect(result.data.url, result.data.managementUrl);
  }

  async function withdraw() {
    setAction("withdraw");
    setError(null);
    const result = await withdrawIdentityVerificationConsentRequest(token);
    if (!result.ok) setError(result.message);
    else setLink({ kind: "management", status: "revoked", canRetry: false, canWithdraw: false });
    setAction(null);
  }

  if (error && !link) return <main className="mx-auto max-w-xl px-6 py-20"><h1>Verification link unavailable</h1><p>{error}</p></main>;
  if (!link) return <main className="mx-auto max-w-xl px-6 py-20"><p>Loading secure verification…</p></main>;

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="site-eyebrow">Nakshatra identity verification</p>
      <h1>{link.kind === "invitation" ? "Confirm your identity" : "Verification management"}</h1>
      <div aria-live="polite" aria-atomic="true">
        {error ? <p className="account-notice is-error">{error}</p> : null}
        {managementUrl ? <p className="account-notice is-success">Save your private management link: <a href={managementUrl}>verification management</a>.</p> : null}
        {providerUrl ? <a className="dashboard-primary-action mt-4" href={providerUrl}>Continue to Didit verification</a> : null}
      </div>

      {link.kind === "invitation" ? (
        <section>
          <p>Didit will run the hosted identity check. Nakshatra will use your legal name, date of birth, India document country, and approved document types only to verify identity before public portfolio publication.</p>
          <p>Nakshatra keeps your consent record and verification state. It does not store document images, document numbers, or other identity evidence. You can withdraw consent through the private management link provided after you continue.</p>
          <label className="mt-6 flex gap-3">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I understand and consent to this identity-verification processing.</span>
          </label>
          <button className="dashboard-primary-action mt-6" disabled={!consent || action !== null} onClick={start}>
            {action === "start" ? "Starting secure verification…" : "Continue to Didit"}
          </button>
        </section>
      ) : (
        <section>
          <p>Status: <strong>{link.status.replaceAll("_", " ")}</strong></p>
          <p>This page is not verification proof. Nakshatra confirms outcomes through its protected provider process.</p>
          {link.canRetry ? <button className="dashboard-primary-action mt-4" disabled={action !== null} onClick={retry}>{action === "retry" ? "Restarting…" : "Retry verification"}</button> : null}
          {link.canWithdraw ? <button className="dashboard-danger-action mt-4" disabled={action !== null} onClick={withdraw}>{action === "withdraw" ? "Withdrawing…" : "Withdraw consent"}</button> : null}
        </section>
      )}
    </main>
  );
}
