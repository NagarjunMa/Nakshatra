"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Sparkles } from "lucide-react";
import { ShaderBackground } from "@/components/landing/ShaderBackground";

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
    body: "Continue building your wedding biodata. Sign in with Google, or get a magic link in your inbox.",
    googleAction: "Sign in with Google",
    primaryAction: "Email me a sign-in link",
    altPrompt: "New to Nakshatra?",
    altCta: "Create an account",
    altHref: "/signup",
  },
  signup: {
    eyebrow: "Begin",
    title: "Create your",
    titleAccent: "biodata.",
    body: "Ten minutes to fill. Forever yours to update. Your rashi becomes the design.",
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
    <div className="auth-shell min-h-screen relative isolate overflow-hidden">
      <ShaderBackground />
      <div aria-hidden className="auth-atmosphere" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 transition-colors hover:text-white"
          style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[11px] tracking-[0.24em] uppercase">Nakshatra</span>
        </Link>
        <span
          className="text-[10px] tracking-[0.28em] uppercase text-white/45"
          style={{ fontFamily: "var(--font-ranade)" }}
        >
          Wedding biodata · India
        </span>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-5 pb-12 sm:px-6 sm:pb-20">
        <section className="auth-glass-panel w-full max-w-[430px] p-6 sm:p-8">
          {sent ? (
            <SentState email={email} />
          ) : (
            <>
              <div className="mb-8 flex items-center gap-3">
                <div className="auth-icon-orbit">
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <p
                    className="text-[10px] tracking-[0.28em] uppercase text-[color:var(--landing-accent)]"
                    style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
                  >
                    {copy.eyebrow}
                  </p>
                  <p
                    className="mt-1 text-[12px] text-white/50"
                    style={{ fontFamily: "var(--font-ranade)" }}
                  >
                    Your biodata, on one link.
                  </p>
                </div>
              </div>

              <h1
                className="text-[34px] sm:text-[40px] leading-[1.05] text-white mb-3"
                style={{
                  fontFamily: "var(--font-harmond)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                {copy.title}{" "}
                <span className="italic text-[color:var(--landing-accent)]">
                  {copy.titleAccent}
                </span>
              </h1>
              <p
                className="text-[14px] sm:text-[15px] text-white/65 leading-[1.65] mb-8"
                style={{ fontFamily: "var(--font-ranade)" }}
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

              <div className="flex items-center gap-4 my-6" aria-hidden>
                <div className="flex-1 h-px bg-white/10" />
                <span
                  className="text-[10px] tracking-[0.28em] uppercase text-white/40"
                  style={{ fontFamily: "var(--font-ranade)" }}
                >
                  or email
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                <label
                  htmlFor={`${mode}-email`}
                  className="text-[10px] tracking-[0.28em] uppercase text-white/55"
                  style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
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
                  className="mt-4 text-[13px] text-red-200/90"
                  role="alert"
                  style={{ fontFamily: "var(--font-ranade)" }}
                >
                  {error || "We could not complete the sign-in. Please try again."}
                </p>
              )}

              <p
                className="mt-8 text-[13px] text-white/55 text-center"
                style={{ fontFamily: "var(--font-ranade)" }}
              >
                {copy.altPrompt}{" "}
                <Link
                  href={copy.altHref}
                  className="text-[color:var(--landing-accent)] hover:text-white transition-colors font-medium"
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

function SentState({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="auth-icon-orbit mx-auto mb-6">
        <Mail
          className="w-5 h-5"
          strokeWidth={1.5}
        />
      </div>
      <h1
        className="text-[32px] text-white leading-[1.1] mb-3"
        style={{
          fontFamily: "var(--font-hkgrotesk)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        Check your inbox.
      </h1>
      <p
        className="text-[15px] text-white/65 leading-[1.6]"
        style={{ fontFamily: "var(--font-ranade)" }}
      >
        We sent a magic link to{" "}
        <span className="text-white font-medium">{email}</span>. Open it on this
        device to continue.
      </p>
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
