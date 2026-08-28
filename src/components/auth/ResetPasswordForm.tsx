"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { updateRecoveredPassword } from "@/features/auth/client/auth.api";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    const { ok, body } = await updateRecoveredPassword(password);
    if (!ok || !body?.updated) {
      setError(body?.error || "This recovery link has expired. Request a new one.");
      setPending(false);
      return;
    }
    router.replace("/dashboard?password=updated");
    router.refresh();
  }

  return (
    <div className="account-shell">
      <header className="account-header">
        <Link href="/login" className="account-back">
          <ArrowLeft aria-hidden="true" />
          <span>NAKSHATRA</span>
        </Link>
        <Link href="/login" className="account-home">Back to sign in</Link>
      </header>
      <main className="account-main">
        <section className="account-panel">
          <p className="account-eyebrow">Account security</p>
          <h1 className="account-title">Choose a new password.</h1>
          <p className="account-copy">Use at least 8 characters. Do not reuse a password from another account.</p>
          <form className="account-form" onSubmit={submit}>
            <PasswordField
              id="new-password"
              label="New password"
              value={password}
              show={showPassword}
              onChange={setPassword}
              onToggle={() => setShowPassword((shown) => !shown)}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirmation}
              show={showPassword}
              onChange={setConfirmation}
              onToggle={() => setShowPassword((shown) => !shown)}
            />
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="auth-primary-btn" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save new password"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="account-field" htmlFor={id}>
      <span>{label}</span>
      <div className="auth-input-wrap">
        <KeyRound aria-hidden="true" />
        <input
          id={id}
          className="auth-input"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="account-password-toggle"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}
