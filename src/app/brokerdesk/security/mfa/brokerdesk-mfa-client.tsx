"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { completeBrokerdeskMfa } from "@/features/organization-access/client/brokerdesk-mfa.api";
import { createClient } from "@/lib/supabase/client";
import styles from "./mfa.module.css";

type Setup = { factorId: string; qrCode: string; secret: string };
type Stage = "loading" | "ready" | "verify" | "setup" | "complete";

function safeQrCode(value: string) {
  return value.startsWith("data:image/svg+xml") ? value : "";
}

export function BrokerdeskMfaClient() {
  const [stage, setStage] = useState<Stage>("loading");
  const [factorId, setFactorId] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function inspect() {
      const supabase = createClient();
      const [assurance, factors] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (!active) return;
      if (assurance.error || factors.error) {
        setError("We could not load the security check. Please try again.");
        setStage("ready");
        return;
      }
      if (assurance.data.currentLevel === "aal2") {
        setStage("complete");
        return;
      }
      const verified = factors.data.totp.find((factor) => factor.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setStage("verify");
      } else {
        setStage("ready");
      }
    }
    void inspect();
    return () => { active = false; };
  }, []);

  async function finish() {
    setPending(true);
    setError("");
    try {
      const result = await completeBrokerdeskMfa();
      window.location.assign(result.next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not complete the security check.");
      setPending(false);
    }
  }

  async function beginSetup() {
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      for (const factor of factors.data.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (removed.error) throw removed.error;
        }
      }
      const enrolled = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Nakshatra BrokerDesk",
      });
      if (enrolled.error) throw enrolled.error;
      const qrCode = safeQrCode(enrolled.data.totp.qr_code);
      if (!qrCode) throw new Error("Authenticator setup could not be displayed.");
      setSetup({ factorId: enrolled.data.id, qrCode, secret: enrolled.data.totp.secret });
      setFactorId(enrolled.data.id);
      setStage("setup");
    } catch {
      setError("We could not start authenticator setup. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setStage("complete");
      await finish();
    } catch {
      setError("That code could not be verified. Check the code and try again.");
      setPending(false);
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/brokerdesk" className={styles.wordmark}>NAKSHATRA</Link>
        <span>BrokerDesk security</span>
      </header>
      <main className={styles.main}>
        <section className={styles.card} aria-live="polite" aria-busy={pending || stage === "loading"}>
          <div className={styles.icon}><ShieldCheck aria-hidden="true" /></div>
          <p className={styles.eyebrow}>One more security check</p>
          <h1>Protect your customers and team</h1>
          <p className={styles.lead}>Use an authenticator app before making sensitive BrokerDesk changes. This helps protect your workspace even if someone learns your password.</p>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {stage === "loading" && <p className={styles.status}>Checking your security settings…</p>}
          {stage === "ready" && (
            <div className={styles.actionPanel}>
              <KeyRound aria-hidden="true" />
              <div><strong>Set up an authenticator</strong><span>Use Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app.</span></div>
              <button type="button" onClick={beginSetup} disabled={pending}>{pending ? "Starting…" : "Set up securely"}</button>
            </div>
          )}
          {stage === "setup" && setup && (
            <div className={styles.setup}>
              <h2>Scan this code</h2>
              <p>Open your authenticator app, add an account, then scan this QR code.</p>
              <Image src={setup.qrCode} alt="Authenticator setup QR code" width={220} height={220} unoptimized />
              <details><summary>Cannot scan it?</summary><p>Enter this setup key in your app:</p><code>{setup.secret}</code></details>
              <CodeForm code={code} setCode={setCode} pending={pending} onSubmit={verify} label="Confirm setup" />
            </div>
          )}
          {stage === "verify" && (
            <div className={styles.setup}>
              <LockKeyhole aria-hidden="true" />
              <h2>Enter your authenticator code</h2>
              <p>Open your authenticator app and enter the current 6-digit code.</p>
              <CodeForm code={code} setCode={setCode} pending={pending} onSubmit={verify} label="Verify and continue" />
            </div>
          )}
          {stage === "complete" && (
            <div className={styles.actionPanel}>
              <ShieldCheck aria-hidden="true" />
              <div><strong>Security check complete</strong><span>Your authenticator is confirmed for this session.</span></div>
              <button type="button" onClick={finish} disabled={pending}>{pending ? "Continuing…" : "Continue"}</button>
            </div>
          )}
          <p className={styles.privacy}><LockKeyhole aria-hidden="true" /> Your setup key stays in this browser and is never shown to brokers, customers, or employees.</p>
        </section>
      </main>
    </div>
  );
}

function CodeForm({ code, setCode, pending, onSubmit, label }: {
  code: string;
  setCode: (value: string) => void;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  label: string;
}) {
  return <form className={styles.codeForm} onSubmit={onSubmit}>
    <label htmlFor="authenticator-code">6-digit code</label>
    <input
      id="authenticator-code"
      value={code}
      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      autoFocus
      required
    />
    <button type="submit" disabled={pending}>{pending ? "Checking…" : label}</button>
  </form>;
}
