"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type Portfolio,
  type PortfolioData,
  type PortfolioMedia,
  type PortfolioMediaVisibility,
} from "@/types/portfolio";
import type { PortfolioApiFailure } from "@/features/portfolio/client/portfolio-dashboard.api";
import { BlueprintForm } from "@/components/portfolio/BlueprintForm";
import { ShaderBackground } from "@/components/landing/ShaderBackground";
import {
  Eye,
  Link as LinkIcon,
  Clock,
  Edit3,
  Share2,
  LogOut,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  X,
  LockKeyhole,
  PanelRightOpen,
  ImagePlus,
  Images,
  Trash2,
  Crown,
  Upload,
} from "lucide-react";

interface Props {
  portfolio: Portfolio | null;
  viewCount: number;
  userEmail: string;
  shareUrl: string | null;
  isExpired: boolean;
  daysLeft: number | null;
  media: PortfolioMedia[];
}

export default function DashboardClient({
  portfolio,
  viewCount,
  userEmail,
  shareUrl,
  isExpired,
  daysLeft,
  media,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draftData, setDraftData] = useState<PortfolioData>(() =>
    normalizePortfolioData(portfolio?.draft_data, portfolio?.privacy_mode)
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rotatingLink, setRotatingLink] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [portfolioMedia, setPortfolioMedia] = useState(media);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activePortfolioId, setActivePortfolioId] = useState(portfolio?.id ?? null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadMediaUrls() {
      const signedUrls = await Promise.all(
        portfolioMedia.map(async (item) => {
          const path = item.thumbnail_path || item.storage_path;
          const { data } = await supabase.storage
            .from("photos")
            .createSignedUrl(path, 60 * 60);
          return [item.id, data?.signedUrl] as const;
        })
      );

      if (!cancelled) {
        setMediaUrls(
          Object.fromEntries(
            signedUrls.filter((entry): entry is [string, string] => Boolean(entry[1]))
          )
        );
      }
    }

    void loadMediaUrls();
    return () => {
      cancelled = true;
    };
  }, [portfolioMedia, supabase]);

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

  /**
   * Maps a feature API failure to a session redirect or an actionable dashboard message.
   * Input: a normalized client API failure. Output: true when navigation has replaced the current dashboard flow.
   */
  function handlePortfolioApiFailure(failure: PortfolioApiFailure): boolean {
    if (failure.error.code === "AUTH_SESSION_MISSING" || failure.error.code === "AUTH_SESSION_INVALID") {
      router.push("/login?error=session_expired");
      return true;
    }

    setDraftError(failure.error.message);
    return false;
  }

  async function renewLink() {
    if (!portfolio) return;
    if (!confirm("Renew link for 90 days?")) return;
    setRenewing(true);
    setDraftError(null);
    try {
      const { renewPortfolioLinkRequest } = await import(
        "@/features/portfolio/client/portfolio-dashboard.api"
      );
      const result = await renewPortfolioLinkRequest();
      if (!result.ok) {
        handlePortfolioApiFailure(result);
        return;
      }
      router.refresh();
    } finally {
      setRenewing(false);
    }
  }

  /** Generates a new portfolio or explicitly updates the existing public snapshot from the private draft. */
  async function publishPortfolio() {
    setPublishing(true);
    setDraftError(null);
    try {
      const { publishPortfolioRequest } = await import(
        "@/features/portfolio/client/portfolio-dashboard.api"
      );
      const result = await publishPortfolioRequest(draftData);
      if (!result.ok) return void handlePortfolioApiFailure(result);
      setFormOpen(false);
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  /** Replaces the active public URL after the owner confirms that the previous link should stop working. */
  async function rotateLink() {
    if (!confirm("Rotate this link? The existing portfolio URL will stop working immediately.")) return;
    setRotatingLink(true);
    setDraftError(null);
    try {
      const { rotatePortfolioLinkRequest } = await import(
        "@/features/portfolio/client/portfolio-dashboard.api"
      );
      const result = await rotatePortfolioLinkRequest();
      if (!result.ok) return void handlePortfolioApiFailure(result);
      router.refresh();
    } finally {
      setRotatingLink(false);
    }
  }

  /** Removes public access without deleting the owner draft, media, or dashboard configuration. */
  async function unpublishPortfolio() {
    if (!confirm("Unpublish this portfolio? Anyone using the current link will no longer be able to view it.")) return;
    setUnpublishing(true);
    setDraftError(null);
    try {
      const { unpublishPortfolioRequest } = await import(
        "@/features/portfolio/client/portfolio-dashboard.api"
      );
      const result = await unpublishPortfolioRequest();
      if (!result.ok) return void handlePortfolioApiFailure(result);
      router.refresh();
    } finally {
      setUnpublishing(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function updateSection<K extends keyof PortfolioData>(
    key: K,
    value: PortfolioData[K]
  ) {
    setDraftData((current) => ({ ...current, [key]: value }));
  }

  async function saveDashboardDraft() {
    setSavingDraft(true);
    setDraftError(null);
    try {
      const { saveDashboardDraftRequest } = await import(
        "@/features/portfolio/client/portfolio-dashboard.api"
      );
      const result = await saveDashboardDraftRequest(draftData);
      if (!result.ok) return void handlePortfolioApiFailure(result);
      setActivePortfolioId(result.data.portfolioId);
      router.refresh();
    } finally {
      setSavingDraft(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    if (!activePortfolioId) {
      setDraftError("Save your profile details before uploading photos.");
      return;
    }

    const availableSlots = Math.max(0, 6 - portfolioMedia.length);
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    if (!selectedFiles.length) {
      setDraftError("Your gallery already has the maximum of six photos.");
      return;
    }

    setUploadingMedia(true);
    setDraftError(null);
    try {
      const { uploadPortfolioPhotoRequest } = await import(
        "@/features/portfolio/client/portfolio-dashboard.api"
      );
      const uploaded: PortfolioMedia[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("portfolioId", activePortfolioId);
        const result = await uploadPortfolioPhotoRequest(formData);
        if (!result.ok) return void handlePortfolioApiFailure(result);
        uploaded.push(result.data.media);
      }
      setPortfolioMedia((current) => [...current, ...uploaded]);
      router.refresh();
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setUploadingMedia(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function updatePhoto(
    mediaId: string,
    changes: Partial<Pick<PortfolioMedia, "visibility" | "media_type" | "alt_text">>
  ) {
    const { updatePortfolioPhotoRequest } = await import(
      "@/features/portfolio/client/portfolio-dashboard.api"
    );
    const result = await updatePortfolioPhotoRequest(mediaId, changes);
    if (!result.ok) return void handlePortfolioApiFailure(result);
    setPortfolioMedia((current) =>
      current.map((item) => {
        if (item.id === result.data.media.id) return result.data.media;
        if (changes.media_type === "hero" && item.media_type === "hero") {
          return { ...item, media_type: "gallery" };
        }
        return item;
      })
    );
  }

  async function deletePhoto(mediaId: string) {
    const { deletePortfolioPhotoRequest } = await import(
      "@/features/portfolio/client/portfolio-dashboard.api"
    );
    const result = await deletePortfolioPhotoRequest(mediaId);
    if (!result.ok) return void handlePortfolioApiFailure(result);
    setPortfolioMedia((current) => current.filter((item) => item.id !== mediaId));
  }

  return (
    <div className="dashboard-shell flex flex-1 flex-col">
      <ShaderBackground />
      <header className="relative z-10 border-b border-white/10 bg-[#090a13]/55 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-bold tracking-[0.12em] text-white">NAKSHATRA</h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/60 sm:inline">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          {!portfolio?.is_published ? (
            <div className="dashboard-glass flex flex-col items-center gap-6 px-6 py-16 text-center sm:px-12">
              <div className="rounded-lg border border-[#e9c46a]/30 bg-[#e9c46a]/10 p-4">
                <Edit3 className="h-8 w-8 text-[#f4d98f]" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f4d98f]">
                  Your private workspace
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Your biodata is waiting
                </h2>
                <p className="mx-auto mt-2 max-w-md text-white/65">
                  Add the details and photos that will shape your portfolio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f4d98f] px-5 text-sm font-semibold text-[#15141b] transition-colors hover:bg-[#fff0b7]"
              >
                <PanelRightOpen className="h-4 w-4" />
                {portfolio ? "Continue editing" : "Start your biodata"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="dashboard-glass p-4">
                  <div className="flex items-center gap-2 text-white/55">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Views</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">{viewCount}</p>
                </div>
                <div className="dashboard-glass p-4">
                  <div className="flex items-center gap-2 text-white/55">
                    <LinkIcon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">
                      Status
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {isExpired ? (
                      <span className="text-red-300">Expired</span>
                    ) : (
                      <span className="text-emerald-300">Active</span>
                    )}
                  </p>
                </div>
                <div className="dashboard-glass p-4">
                  <div className="flex items-center gap-2 text-white/55">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">
                      Expires
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {daysLeft !== null
                      ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                      : "â€”"}
                  </p>
                </div>
              </div>

              {shareUrl && (
                <div className="dashboard-glass p-4">
                  <p className="mb-3 text-sm font-medium text-white">Your biodata link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg bg-black/25 px-3 py-2 text-sm text-white/75">
                      {shareUrl}
                    </code>
                    <button
                      onClick={copyLink}
                      className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
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
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${renewing ? "animate-spin" : ""}`}
                        />
                        Renew (90 days)
                      </button>
                    )}
                    <button
                      onClick={rotateLink}
                      disabled={rotatingLink}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      <RotateCcw className={`h-4 w-4 ${rotatingLink ? "animate-spin" : ""}`} />
                      Rotate link
                    </button>
                    <button
                      onClick={unpublishPortfolio}
                      disabled={unpublishing}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-300/25 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                    >
                      <LockKeyhole className="h-4 w-4" />
                      {unpublishing ? "Unpublishing..." : "Unpublish"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit biodata
                </button>
                <Link
                  href="/preview"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-lg border border-[#f4d98f]/30 bg-[#f4d98f] px-5 text-sm font-semibold text-[#17151c] shadow-lg transition-transform hover:scale-[1.02]"
      >
        <PanelRightOpen className="h-4 w-4" />
        Portfolio details
      </button>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-[#05050a]/70 backdrop-blur-sm">
          <div className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/10 bg-[#151622]/95 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Portfolio details</h2>
                <p className="text-sm text-white/55">
                  Your profile stays private until you publish it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white transition-colors hover:bg-white/10"
                aria-label="Close portfolio details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <PhotoManager
                media={portfolioMedia}
                urls={mediaUrls}
                uploading={uploadingMedia}
                inputRef={photoInputRef}
                onUpload={uploadPhotos}
                onUpdate={updatePhoto}
                onDelete={deletePhoto}
              />
              <BlueprintForm
                data={draftData}
                onUpdate={updateSection}
              />
            </div>

            <div className="border-t border-white/10 bg-[#11121c] px-5 py-4">
              {draftError && (
                <p className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                  Save failed: {draftError}
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/50">
                  Draft edits stay private until you update the published portfolio.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveDashboardDraft}
                    disabled={savingDraft}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f4d98f] px-4 text-sm font-semibold text-[#17151c] transition-colors hover:bg-[#fff0b7] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingDraft ? "Saving..." : "Save draft"}
                  </button>
                  <button
                    type="button"
                    onClick={publishPortfolio}
                    disabled={publishing}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#f4d98f]/30 bg-[#f4d98f]/10 px-4 text-sm font-semibold text-[#f4d98f] transition-colors hover:bg-[#f4d98f]/20 disabled:opacity-50"
                  >
                    <Send className={`h-4 w-4 ${publishing ? "animate-pulse" : ""}`} />
                    {publishing
                      ? "Generating..."
                      : portfolio?.is_published
                        ? "Update published"
                        : "Generate portfolio"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_DATA: PortfolioData = {
  privacy_mode: "progressive",
  personal: { name: "", dob: "", gender: "male" },
  vitals: {},
  astrology: {},
  education: {},
  career: {},
  family: {},
  lifestyle: {},
  contact: {},
  style: { template_name: "Celestial Union" },
  preferences: {},
  access: {
    journey: "public",
    personal: "approved",
    career: "public",
    family: "approved",
    lifestyle: "public",
    preferences: "broker",
    future_plans: "approved",
    astrology: "approved",
    contact: "approved",
  },
  visibility: {
    family: "restricted",
    astrology_details: "restricted",
    gallery: "restricted",
    contact: "public",
  },
};

function normalizePortfolioData(
  data: Portfolio["draft_data"] | undefined,
  privacyMode?: Portfolio["privacy_mode"]
): PortfolioData {
  return {
    ...EMPTY_DATA,
    ...(data || {}),
    privacy_mode: data?.privacy_mode || privacyMode || "progressive",
    personal: { ...EMPTY_DATA.personal, ...(data?.personal || {}) },
    vitals: { ...(data?.vitals || {}) },
    astrology: { ...(data?.astrology || {}) },
    education: { ...(data?.education || {}) },
    career: { ...(data?.career || {}) },
    family: { ...(data?.family || {}) },
    lifestyle: { ...(data?.lifestyle || {}) },
    contact: { ...(data?.contact || {}) },
    style: { ...EMPTY_DATA.style, ...(data?.style || {}) },
    preferences: { ...(data?.preferences || {}) },
    access: { ...EMPTY_DATA.access, ...(data?.access || {}) },
    visibility: { ...EMPTY_DATA.visibility, ...(data?.visibility || {}) },
  };
}

function PhotoManager({
  media,
  urls,
  uploading,
  inputRef,
  onUpload,
  onUpdate,
  onDelete,
}: {
  media: PortfolioMedia[];
  urls: Record<string, string>;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (files: FileList | null) => void;
  onUpdate: (
    id: string,
    changes: Partial<Pick<PortfolioMedia, "visibility" | "media_type" | "alt_text">>
  ) => void;
  onDelete: (id: string) => void;
}) {
  const visibilityLabels: { value: PortfolioMediaVisibility; label: string }[] = [
    { value: "interest_required", label: "Blur for free viewers" },
    { value: "public", label: "Visible to all" },
    { value: "approved_only", label: "Approved interest only" },
    { value: "hidden", label: "Only me" },
  ];

  return (
    <section className="mb-7 border-b border-white/10 pb-7">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Images className="h-4 w-4 text-[#f4d98f]" />
            Profile photos
          </h3>
          <p className="mt-1 text-xs leading-5 text-white/55">
            Add up to six photos. Your originals remain in the private photos bucket.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-[#f4d98f]">{media.length}/6</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => onUpload(event.target.files)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-lg border border-white/10 bg-black/15">
            <div className="relative aspect-[4/5] bg-white/5">
              {urls[item.id] ? (
                // Signed URLs are created client-side for the portfolio owner only.
                // eslint-disable-next-line @next/next/no-img-element -- Signed Supabase URLs cannot use Next's static optimizer.
                <img src={urls[item.id]} alt={item.alt_text || "Profile photo"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/35">Loading...</div>
              )}
              {item.media_type === "hero" && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-[#f4d98f] px-2 py-1 text-[10px] font-semibold text-[#17151c]">
                  <Crown className="h-3 w-3" /> Hero
                </span>
              )}
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/65 text-white transition-colors hover:bg-red-500"
                aria-label="Delete photo"
                title="Delete photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2 p-2">
              <select
                value={item.visibility}
                onChange={(event) =>
                  onUpdate(item.id, { visibility: event.target.value as PortfolioMediaVisibility })
                }
                className="h-8 w-full rounded-md border border-white/10 bg-white/[0.06] px-2 text-[11px] text-white outline-none"
                aria-label="Photo visibility"
              >
                {visibilityLabels.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#1a1b27]">
                    {option.label}
                  </option>
                ))}
              </select>
              {item.media_type !== "hero" && (
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { media_type: "hero" })}
                  className="w-full rounded-md border border-white/10 px-2 py-1.5 text-[11px] font-medium text-white/75 transition-colors hover:bg-white/10"
                >
                  Make hero photo
                </button>
              )}
            </div>
          </article>
        ))}
        {media.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#f4d98f]/35 bg-[#f4d98f]/5 px-3 text-center text-xs font-medium text-[#f4d98f] transition-colors hover:bg-[#f4d98f]/10 disabled:opacity-50"
          >
            {uploading ? <Upload className="h-5 w-5 animate-pulse" /> : <ImagePlus className="h-5 w-5" />}
            {uploading ? "Uploading" : "Add photos"}
          </button>
        )}
      </div>
    </section>
  );
}
