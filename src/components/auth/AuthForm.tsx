"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";

type Mode = "login" | "signup";

type Copy = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  body: string;
  googleAction: string;
  primaryAction: string;
  altPrompt: string;
  altCta: string;
  altHref: string;
};

const COPY: Record<Mode, Copy> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to",
    titleAccent: "Nakshatra.",
    body: "Continue to your wedding portfolio with Google or a secure email link.",
    googleAction: "Sign in with Google",
    primaryAction: "Email me a sign-in link",
    altPrompt: "New to Nakshatra?",
    altCta: "Create an account",
    altHref: "/signup",
  },
  signup: {
    eyebrow: "Create account",
    title: "Start your",
    titleAccent: "wedding portfolio.",
    body: "Save your work, continue later, and publish when your portfolio is ready.",
    googleAction: "Sign up with Google",
    primaryAction: "Email me a sign-in link",
    altPrompt: "Already have an account?",
    altCta: "Sign in",
    altHref: "/login",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [pendingAction, setPendingAction] = useState<"google" | "email" | null>(
    null
  );
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const authFailed = searchParams.get("error") === "auth_failed";
  const copy = COPY[mode];

  async function handleGoogle() {
    setPendingAction("google");
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    });
    if (error) {
      setError(error.message);
      setPendingAction(null);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    await sendMagicLink();
  }

  async function sendMagicLink() {
    setPendingAction("email");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setPendingAction(null);
  }

  return (
    <div className="account-shell">
      <header className="account-header">
        <Link
          href="/"
          className="account-back"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>NAKSHATRA</span>
        </Link>
        <Link href="/" className="account-home">Back to home</Link>
      </header>

      <main className="account-main">
        <section className="account-panel">
          {sent ? (
            <SentState
              email={email}
              pending={pendingAction === "email"}
              error={error}
              onResend={() => void sendMagicLink()}
              onChangeEmail={() => {
                setSent(false);
                setError("");
              }}
            />
          ) : (
            <>
              <p className="account-eyebrow">{copy.eyebrow}</p>

              <h1
                className="account-title"
              >
                {copy.title}{" "}
                <span>
                  {copy.titleAccent}
                </span>
              </h1>
              <p
                className="account-copy"
              >
                {copy.body}
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={pendingAction !== null}
                className="auth-google-btn"
              >
                <GoogleIcon />
                <span>{pendingAction === "google" ? "Connecting..." : copy.googleAction}</span>
              </button>

              <div className="account-divider" aria-hidden>
                <span />
                <small>or</small>
                <span />
              </div>

              <form onSubmit={handleMagicLink} className="account-form">
                <label
                  htmlFor={`${mode}-email`}
                  className="account-label"
                >
                  Email address
                </label>
                <div className="auth-input-wrap">
                  <Mail
                    className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.5}
                  />
                  <input
                    id={`${mode}-email`}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pendingAction !== null}
                  className="auth-primary-btn"
                >
                  {pendingAction === "email" ? "Sending link..." : copy.primaryAction}
                  {pendingAction !== "email" && (
                    <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </button>
              </form>

              {(error || authFailed) && (
                <p
                  className="account-error"
                  role="alert"
                >
                  {error || "We could not complete the sign-in. Please try again."}
                </p>
              )}

              <p
                className="account-alt"
              >
                {copy.altPrompt}{" "}
                <Link
                  href={copy.altHref}
                  className="account-link"
                >
                  {copy.altCta}
                </Link>
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function SentState({
  email,
  pending,
  error,
  onResend,
  onChangeEmail,
}: {
  email: string;
  pending: boolean;
  error: string;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <div className="account-sent">
      <div className="account-mail-icon">
        <Mail aria-hidden="true" />
      </div>
      <h1>Check your inbox.</h1>
      <p>
        We sent a secure sign-in link to <strong>{email}</strong>. Open it on this
        device to continue to Nakshatra.
      </p>
      <p className="account-link-note">
        The link can be used once and may expire. If it does, request a new one below.
      </p>
      {error && <p className="account-error" role="alert">{error}</p>}
      <div className="account-sent-actions">
        <button type="button" className="auth-primary-btn" onClick={onResend} disabled={pending}>
          {pending ? "Sending another link..." : "Send another link"}
        </button>
        <button type="button" className="account-change-email" onClick={onChangeEmail}>
          Use a different email
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
