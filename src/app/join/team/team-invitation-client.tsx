"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";
import styles from "./team-invitation.module.css";

type Accepted = { available: true; workspaceRef: string; workspaceName: string; rolePreset: string; memberRef: string };
type Stage = "working" | "sign_in" | "accepted" | "unavailable";
const storageKey = "nakshatra.team-invitation.pending";

async function post(url: string, body: object) {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function TeamInvitationClient() {
  const [stage, setStage] = useState<Stage>("working");
  const [accepted, setAccepted] = useState<Accepted | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const fragmentToken = fragment.get("token");
        const token = fragmentToken || sessionStorage.getItem(storageKey);
        if (fragmentToken) sessionStorage.setItem(storageKey, fragmentToken);
        if (window.location.hash) history.replaceState(null, "", `${location.pathname}${location.search}`);
        if (token) {
          const exchanged = await post("/api/v1/brokerdesk/team-invitations/exchange", { token });
          if (!exchanged.ok) throw new Error("exchange_failed");
          sessionStorage.removeItem(storageKey);
        }
        const response = await post("/api/v1/brokerdesk/team-invitations/accept", {});
        if (!active) return;
        if (response.status === 401) {
          setStage("sign_in");
          return;
        }
        const result = await response.json().catch(() => null) as Accepted | null;
        if (response.ok && result?.available) {
          setAccepted(result);
          setStage("accepted");
        } else {
          setStage("unavailable");
        }
      } catch {
        if (active) setStage("unavailable");
      }
    }
    void run();
    return () => { active = false; };
  }, []);

  return <div className={styles.shell}>
    <header><Link href="/" className={styles.wordmark}>NAKSHATRA</Link><span>BrokerDesk invitation</span></header>
    <main>
      <section className={styles.card} aria-live="polite">
        <div className={styles.icon}>{stage === "accepted" ? <ShieldCheck /> : <Building2 />}</div>
        {stage === "working" && <><p className={styles.eyebrow}>Private invitation</p><h1>Checking your invitation…</h1><p>Please wait while we safely confirm this invitation.</p></>}
        {stage === "sign_in" && <><p className={styles.eyebrow}>Your account protects access</p><h1>Sign in to continue</h1><p>Use the Nakshatra account with the email address that received this invitation.</p><Link className={styles.button} href="/login?next=/join/team">Sign in securely</Link></>}
        {stage === "accepted" && accepted && <><p className={styles.eyebrow}>Invitation accepted</p><h1>Welcome to {accepted.workspaceName}</h1><p>Your team role is <strong>{accepted.rolePreset}</strong>. Customer access remains private until an owner or admin assigns it.</p><Link className={styles.button} href="/brokerdesk">Open BrokerDesk</Link></>}
        {stage === "unavailable" && <><p className={styles.eyebrow}>Invitation unavailable</p><h1>Ask the sender for a new invitation</h1><p>This link may have expired, already been used, or belong to a different account. We do not reveal which condition applies.</p><Link className={styles.button} href="/brokerdesk">Go to BrokerDesk</Link></>}
        <small><LockKeyhole /> Invitation links never reveal customer or business details.</small>
      </section>
    </main>
  </div>;
}
