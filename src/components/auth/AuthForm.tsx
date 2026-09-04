"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import {
  continueToAuthProvider,
  startAuthentication,
  verifyAuthenticationCode,
} from "@/features/auth/client/auth.api";
import {
  isAcceptablePassword,
  PASSWORD_HELP,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/features/auth/password-policy";

type Mode = "login" | "signup";
type Screen = "credentials" | "verify" | "recovery" | "recovery_sent";
type PendingAction = "google" | "credentials" | "verify" | "resend" | "recovery" | null;

const COPY = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to your portfolio",
    body: "Use your email and password, or continue with Google.",
    primaryAction: "Sign in",
    altPrompt: "New to Nakshatra?",
    altCta: "Create an account",
    altHref: "/signup",
  },
  signup: {
    eyebrow: "Create account",
    title: "Start your marriage portfolio",
    body: "Create your account now. You can build privately and publish only when you are ready.",
    primaryAction: "Create account",
    altPrompt: "Already have an account?",
    altCta: "Sign in",
    altHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const [screen, setScreen] = useState<Screen>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const copy = COPY[mode];
  const authError = searchParams.get("error");
  const authErrorMessage = authError === "session_revoked"
    ? "This session has been signed out. Sign in again to continue."
    : authError === "session_expired"
      ? "Your session has ended. Sign in again to continue."
      : authError === "auth_failed"
        ? "We could not complete the sign-in. Please try again."
        : "";

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function continueToApp(destination = redirectPath) {
    router.replace(destination);
    router.refresh();
  }

  async function handleGoogle() {
    setPendingAction("google");
    setError("");
    const { ok, body } = await startAuthentication({ method: "google", redirect: redirectPath });
    if (!ok || !body?.url) {
      setError(body?.error || "We could not connect to Google. Please try again.");
      setPendingAction(null);
      return;
    }
    continueToAuthProvider(body.url);
  }

  async function handleCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && !isAcceptablePassword(password)) {
      setError(PASSWORD_HELP);
      return;
    }

    setPendingAction("credentials");
    const result = mode === "signup"
      ? await startAuthentication({ method: "password_signup", email, password, redirect: redirectPath })
      : await startAuthentication({ method: "password_signin", email, password, redirect: redirectPath });

    if (!result.ok) {
      setError(result.body?.error || "We could not continue. Please try again.");
      setPendingAction(null);
      return;
    }
    if (result.body?.authenticated) {
      continueToApp(result.body.redirect);
      return;
    }
    if (mode === "signup" && result.body?.verificationRequired) {
      setEmail(result.body.email || email.trim().toLowerCase());
      setPassword("");
      setOtp("");
      setResendSeconds(60);
      setScreen("verify");
    }
    setPendingAction(null);
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("verify");
    setError("");
    const { ok, body } = await verifyAuthenticationCode({
      purpose: "owner_signup",
      email,
      token: otp,
      redirect: redirectPath,
    });
    if (!ok || !body?.verified) {
      setError(body?.error || "We could not verify the code.");
      setPendingAction(null);
      return;
    }
    continueToApp(body.redirect);
  }

  async function resendSignupCode() {
    if (resendSeconds > 0) return;
    setPendingAction("resend");
    setError("");
    const { ok, body } = await startAuthentication({ method: "resend_signup", email, redirect: redirectPath });
    if (!ok || !body?.sent) {
      setError(body?.error || "We could not send another code.");
    } else {
      setResendSeconds(60);
    }
    setPendingAction(null);
  }

  async function handleRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("recovery");
    setError("");
    const { ok, body } = await startAuthentication({ method: "password_recovery", email });
    if (!ok || !body?.sent) {
      setError(body?.error || "We could not send the recovery email.");
    } else {
      setScreen("recovery_sent");
    }
    setPendingAction(null);
  }

  function returnToCredentials() {
    setError("");
    setOtp("");
    setScreen("credentials");
  }

  return (
    <div className="account-shell">
      <header className="account-header">
        <Link href="/" className="account-back" aria-label="Nakshatra home">
          <ArrowLeft aria-hidden="true" />
          <span>NAKSHATRA</span>
        </Link>
        <Link href="/" className="account-home">Back to home</Link>
      </header>

      <main className="account-main">
        <section className="account-panel" aria-labelledby="account-title" aria-busy={pendingAction !== null}>
          {screen === "credentials" && (
            <>
              <p className="account-eyebrow">{copy.eyebrow}</p>
              <h1 id="account-title" className="account-title">{copy.title}</h1>
              <p className="account-copy">{copy.body}</p>

              <form onSubmit={handleCredentials} className="account-form">
                <AuthField id={`${mode}-email`} label="Email address" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <div className="account-field">
                  <label htmlFor={`${mode}-password`}>Password</label>
                  <div className="auth-input-wrap">
                    <KeyRound aria-hidden="true" />
                    <input
                      id={`${mode}-password`}
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
                      maxLength={PASSWORD_MAX_LENGTH}
                      required
                      aria-describedby={mode === "signup" ? "signup-password-help" : undefined}
                      placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                    />
                    <button type="button" className="account-password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {mode === "signup" && <p id="signup-password-help" className="account-field-help">{PASSWORD_HELP}</p>}
                {mode === "login" && (
                  <button type="button" className="account-forgot" onClick={() => { setError(""); setScreen("recovery"); }}>
                    Forgot password?
                  </button>
                )}
                <button type="submit" className="auth-primary-btn" disabled={pendingAction !== null}>
                  {pendingAction === "credentials" ? "Please wait..." : copy.primaryAction}
                  {pendingAction !== "credentials" && <ArrowRight aria-hidden="true" />}
                </button>
              </form>

              <div className="account-divider" aria-hidden="true"><span /><small>or</small><span /></div>
              <button type="button" onClick={handleGoogle} disabled={pendingAction !== null} className="auth-google-btn">
                <GoogleIcon />
                <span>{pendingAction === "google" ? "Connecting..." : "Continue with Google"}</span>
              </button>

              {(error || authErrorMessage) && <p className="account-error" role="alert">{error || authErrorMessage}</p>}
              <p className="account-alt">{copy.altPrompt} <Link href={copy.altHref} className="account-link">{copy.altCta}</Link></p>
              {mode === "signup" && (
                <p className="account-legal">
                  By creating an account, you agree to our <Link href="/terms">Terms</Link> and acknowledge our <Link href="/privacy">Privacy Policy</Link>.
                </p>
              )}
            </>
          )}

          {screen === "verify" && (
            <form onSubmit={handleVerify} className="account-sent" aria-labelledby="account-title">
              <div className="account-mail-icon"><ShieldCheck aria-hidden="true" /></div>
              <p className="account-eyebrow">Verify your email</p>
              <h1 id="account-title">Enter the six-digit code</h1>
              <p>We sent it to <strong>{email}</strong>. Keep this page open while you check your email.</p>
              <label className="account-otp-field" htmlFor="signup-code">
                <span>Verification code</span>
                <input id="signup-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus />
              </label>
              <p className="account-verification-note">No code? The email may already be registered. You can sign in or reset its password instead.</p>
              {error && <p className="account-error" role="alert">{error}</p>}
              <div className="account-sent-actions">
                <button type="submit" className="auth-primary-btn" disabled={pendingAction !== null || otp.length !== 6}>{pendingAction === "verify" ? "Verifying..." : "Verify and continue"}</button>
                <button type="button" className="account-change-email" onClick={() => void resendSignupCode()} disabled={pendingAction !== null || resendSeconds > 0}>
                  {resendSeconds > 0 ? `Send another code in ${resendSeconds}s` : pendingAction === "resend" ? "Sending..." : "Send another code"}
                </button>
                <button type="button" className="account-change-email" onClick={returnToCredentials}>Change email</button>
              </div>
            </form>
          )}

          {screen === "recovery" && (
            <form onSubmit={handleRecovery} className="account-sent" aria-labelledby="account-title">
              <div className="account-mail-icon"><Mail aria-hidden="true" /></div>
              <p className="account-eyebrow">Password help</p>
              <h1 id="account-title">Reset your password</h1>
              <p>Enter your account email. We will send a secure recovery link if an account exists.</p>
              <AuthField id="recovery-email" label="Email address" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              {error && <p className="account-error" role="alert">{error}</p>}
              <div className="account-sent-actions">
                <button type="submit" className="auth-primary-btn" disabled={pendingAction !== null}>{pendingAction === "recovery" ? "Sending..." : "Send recovery email"}</button>
                <button type="button" className="account-change-email" onClick={returnToCredentials}>Back to sign in</button>
              </div>
            </form>
          )}

          {screen === "recovery_sent" && (
            <div className="account-sent" role="status">
              <div className="account-mail-icon"><Mail aria-hidden="true" /></div>
              <h1 id="account-title">Check your email</h1>
              <p>If an account exists for <strong>{email}</strong>, a password recovery link is on its way.</p>
              <button type="button" className="account-change-email" onClick={returnToCredentials}>Back to sign in</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AuthField({ id, label, type, autoComplete, value, onChange, placeholder }: { id: string; label: string; type: "text" | "email"; autoComplete: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="account-field" htmlFor={id}>
      <span>{label}</span>
      <div className="auth-input-wrap">
        <Mail aria-hidden="true" />
        <input id={id} className="auth-input" type={type} autoComplete={autoComplete} autoCapitalize="none" spellCheck={false} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={180} required />
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="account-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
