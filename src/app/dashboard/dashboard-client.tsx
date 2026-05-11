"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Portfolio } from "@/types/portfolio";
import { isAuthError } from "@/lib/auth-utils";
import {
  Eye,
  Link as LinkIcon,
  Clock,
  Edit3,
  Share2,
  LogOut,
  RefreshCw,
} from "lucide-react";

interface Props {
  portfolio: Portfolio | null;
  viewCount: number;
  userEmail: string;
}

export default function DashboardClient({
  portfolio,
  viewCount,
  userEmail,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const shareUrl = portfolio?.share_token
    ? `${window.location.origin}/p/${portfolio.share_token}`
    : null;

  const isExpired =
    portfolio?.expires_at && new Date(portfolio.expires_at) < new Date();

  const daysLeft = portfolio?.expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(portfolio.expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareWhatsApp() {
    if (!shareUrl) return;
    const text = encodeURIComponent(`Check out this biodata: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function renewLink() {
    if (!portfolio) return;
    if (!confirm("Renew link for 90 days?")) return;
    setRenewing(true);
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 90);

    const { error } = await supabase
      .from("portfolios")
      .update({
        expires_at: newExpiry.toISOString(),
        last_renewed_at: new Date().toISOString(),
      })
      .eq("id", portfolio.id);

    if (isAuthError(error)) {
      router.push("/login?error=session_expired");
      return;
    }

    router.refresh();
    setRenewing(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-bold">Nakshatra</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {!portfolio?.is_published ? (
            /* Not published yet */
            <div className="flex flex-col items-center gap-6 py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <Edit3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  Your biodata is waiting
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Fill in your details and publish to get a shareable link
                </p>
              </div>
              <Link
                href="/edit"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                {portfolio ? "Continue editing" : "Start your biodata"}
              </Link>
            </div>
          ) : (
            /* Published */
            <div className="flex flex-col gap-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Views</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{viewCount}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <LinkIcon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">
                      Status
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {isExpired ? (
                      <span className="text-destructive">Expired</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">
                      Expires
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {daysLeft !== null
                      ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Share link */}
              {shareUrl && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium mb-3">Your biodata link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-sm">
                      {shareUrl}
                    </code>
                    <button
                      onClick={copyLink}
                      className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={shareWhatsApp}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      <Share2 className="h-4 w-4" />
                      Share on WhatsApp
                    </button>
                    {isExpired && (
                      <button
                        onClick={renewLink}
                        disabled={renewing}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${renewing ? "animate-spin" : ""}`}
                        />
                        Renew (90 days)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Link
                  href="/edit"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit biodata
                </Link>
                <Link
                  href="/preview"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
