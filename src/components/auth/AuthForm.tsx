"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Mail, Sparkles } from "lucide-react";

type Mode = "login" | "signup";

type Copy = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  body: string;
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
    primaryAction: "Send magic link",
    altPrompt: "New to Nakshatra?",
    altCta: "Create an account",
    altHref: "/signup",
  },
  signup: {
    eyebrow: "Begin",
    title: "Create your",
    titleAccent: "biodata.",
    body: "Ten minutes to fill. Forever yours to update. Your rashi becomes the design.",
    primaryAction: "Send magic link",
    altPrompt: "Already have an account?",
    altCta: "Sign in",
    altHref: "/login",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const copy = COPY[mode];

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
    setLoading(false);
  }

  return (
    <div className="auth-shell min-h-screen flex">
      <aside className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] overflow-hidden">
        <Image
          src="/pictures/login-image.jpg"
          alt="Nakshatra — wedding biodata"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0b14]/65 via-[#1a1530]/55 to-[#0a0b14]/85" />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(ellipse at top left, var(--landing-accent) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          <Link href="/" className="inline-flex items-center gap-2 w-fit">
            <span
              className="text-[18px] tracking-[0.22em] text-white"
              style={{ fontFamily: "var(--font-hkgrotesk)", fontWeight: 800 }}
            >
              NAKSHATRA
            </span>
          </Link>

          <div className="max-w-md">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--landing-accent) 35%, transparent)",
                background: "var(--landing-accent-soft)",
              }}
            >
              <Sparkles
                className="w-3 h-3 text-[color:var(--landing-accent)]"
                strokeWidth={1.5}
              />
              <span
                className="text-[10px] tracking-[0.28em] uppercase text-[color:var(--landing-accent)]"
                style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
              >
                Wedding biodata · India
              </span>
            </div>

            <h2
              className="text-[40px] xl:text-[52px] leading-[1.05] text-white mb-5"
              style={{
                fontFamily: "var(--font-hkgrotesk)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              A biodata{" "}
              <span className="italic text-[color:var(--landing-accent)]">
                designed by your stars.
              </span>
            </h2>
            <p
              className="text-[15px] xl:text-[16px] leading-[1.6] text-white/75 max-w-sm"
              style={{ fontFamily: "var(--font-ranade)" }}
            >
              Your rashi chooses the palette. Your nakshatra fills the
              background. Editorial design, on one link your family can open
              forever.
            </p>
          </div>

          <p
            className="text-[10px] tracking-[0.28em] uppercase text-white/40"
            style={{ fontFamily: "var(--font-ranade)" }}
          >
            © 2026 Nakshatra
          </p>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 relative">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top right, color-mix(in srgb, var(--landing-accent) 16%, transparent) 0%, transparent 55%)",
          }}
        />

        <div className="relative w-full max-w-sm">
          <Link
            href="/"
            className="lg:hidden inline-block mb-10 text-[16px] tracking-[0.22em] text-white"
            style={{ fontFamily: "var(--font-hkgrotesk)", fontWeight: 800 }}
          >
            NAKSHATRA
          </Link>

          {sent ? (
            <SentState email={email} />
          ) : (
            <>
              <p
                className="text-[11px] tracking-[0.32em] uppercase text-[color:var(--landing-accent)] mb-4"
                style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
              >
                {copy.eyebrow}
              </p>
              <h1
                className="text-[36px] sm:text-[40px] leading-[1.05] text-white mb-3"
                style={{
                  fontFamily: "var(--font-hkgrotesk)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {copy.title}{" "}
                <span className="italic text-[color:var(--landing-accent)]">
                  {copy.titleAccent}
                </span>
              </h1>
              <p
                className="text-[14px] sm:text-[15px] text-white/65 leading-[1.6] mb-9"
                style={{ fontFamily: "var(--font-ranade)" }}
              >
                {copy.body}
              </p>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="auth-google-btn group"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span
                  className="text-[10px] tracking-[0.32em] uppercase text-white/40"
                  style={{ fontFamily: "var(--font-ranade)" }}
                >
                  or
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                <label
                  className="text-[10px] tracking-[0.32em] uppercase text-white/55"
                  style={{ fontFamily: "var(--font-ranade)", fontWeight: 600 }}
                >
                  Email
                </label>
                <div className="auth-input-wrap">
                  <Mail
                    className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.5}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-primary-btn"
                >
                  {loading ? "Sending..." : copy.primaryAction}
                  {!loading && (
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  )}
                </button>
              </form>

              {error && (
                <p
                  className="mt-4 text-[13px] text-red-300/90 text-center"
                  style={{ fontFamily: "var(--font-ranade)" }}
                >
                  {error}
                </p>
              )}

              <p
                className="mt-8 text-[13px] text-white/55 text-center"
                style={{ fontFamily: "var(--font-ranade)" }}
              >
                {copy.altPrompt}{" "}
                <Link
                  href={copy.altHref}
                  className="text-[color:var(--landing-accent)] hover:underline font-medium"
                >
                  {copy.altCta}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SentState({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--landing-accent) 25%, transparent), transparent 70%)",
          border:
            "1px solid color-mix(in srgb, var(--landing-accent) 45%, transparent)",
        }}
      >
        <Mail
          className="w-6 h-6 text-[color:var(--landing-accent)]"
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
        We sent a sign-in link to{" "}
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
