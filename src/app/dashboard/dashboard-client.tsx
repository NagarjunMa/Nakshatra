"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RASHI_OPTIONS,
  type Portfolio,
  type PortfolioData,
  type PortfolioMedia,
  type PortfolioMediaVisibility,
  type RashiKey,
} from "@/types/portfolio";
import {
  getDefaultRashiPalette,
  getRashiPalette,
  getRashiPalettes,
  type RashiPalette,
} from "@/features/portfolio/rashi-theme";
import { RashiPalettePicker } from "@/components/portfolio/RashiPalettePicker";
import { ShaderBackground } from "@/components/landing/ShaderBackground";
import {
  Eye,
  Link as LinkIcon,
  Clock,
  Edit3,
  Share2,
  LogOut,
  RefreshCw,
  Save,
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
    normalizePortfolioData(portfolio?.draft_data)
  );
  const [savingDraft, setSavingDraft] = useState(false);
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

  async function renewLink() {
    if (!portfolio) return;
    if (!confirm("Renew link for 90 days?")) return;
    setRenewing(true);
    const response = await fetch("/api/portfolio/renew", { method: "POST" });
    if (response.status === 401) {
      setRenewing(false);
      router.push("/login?error=session_expired");
      return;
    }
    if (!response.ok) {
      setRenewing(false);
      return;
    }

    router.refresh();
    setRenewing(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function updateSection(
    key: keyof PortfolioData,
    sectionData: Record<string, unknown>
  ) {
    setDraftData((current) => ({ ...current, [key]: sectionData }));
  }

  async function saveDashboardDraft() {
    setSavingDraft(true);
    setDraftError(null);

    const response = await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: draftData }),
    });

    if (response.status === 401) {
      router.push("/login?error=session_expired");
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setDraftError(body?.error || "Unable to save your portfolio details.");
      setSavingDraft(false);
      return;
    }

    const saved = (await response.json()) as { portfolioId: string };
    setActivePortfolioId(saved.portfolioId);
    setSavingDraft(false);
    router.refresh();
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
      const uploaded: PortfolioMedia[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("portfolioId", activePortfolioId);
        const response = await fetch("/api/portfolio-media", {
          method: "POST",
          body: formData,
        });
        const body = (await response.json()) as {
          error?: string;
          media?: PortfolioMedia;
        };
        if (!response.ok || !body.media) {
          throw new Error(body.error || "Unable to upload this photo.");
        }
        uploaded.push(body.media);
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
    const response = await fetch("/api/portfolio-media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, ...changes }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      media?: PortfolioMedia;
    } | null;
    if (!response.ok || !body?.media) {
      setDraftError(body?.error || "Unable to update photo visibility.");
      return;
    }
    setPortfolioMedia((current) =>
      current.map((item) => {
        if (item.id === body.media?.id) return body.media;
        if (changes.media_type === "hero" && item.media_type === "hero") {
          return { ...item, media_type: "gallery" };
        }
        return item;
      })
    );
  }

  async function deletePhoto(mediaId: string) {
    const response = await fetch(`/api/portfolio-media?mediaId=${mediaId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setDraftError(body?.error || "Unable to remove photo.");
      return;
    }
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
                      : "—"}
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
              <DashboardPortfolioForm
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
                  Photo visibility and free-view restrictions are saved here.
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
  personal: { name: "", dob: "", gender: "male" },
  vitals: {},
  astrology: {},
  education: {},
  career: {},
  family: {},
  lifestyle: {},
  contact: {},
  style: { template_name: "Royal Heritage" },
  preferences: {},
  visibility: {
    family: "restricted",
    astrology_details: "restricted",
    gallery: "restricted",
    contact: "public",
  },
};

function normalizePortfolioData(data: Portfolio["draft_data"] | undefined): PortfolioData {
  return {
    ...EMPTY_DATA,
    ...(data || {}),
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

function DashboardPortfolioForm({
  data,
  onUpdate,
}: {
  data: PortfolioData;
  onUpdate: (key: keyof PortfolioData, sectionData: Record<string, unknown>) => void;
}) {
  const rashi = data.astrology?.rashi || "";
  const palettes = getRashiPalettes(rashi);
  const selectedPalette = getRashiPalette(data.style?.rashi_palette, rashi);

  /** Updates the rashi and initializes its default palette when the previous choice no longer applies. */
  function selectRashi(value: string) {
    const nextRashi = value as RashiKey | "";
    const nextDefault = getDefaultRashiPalette(nextRashi);
    const existingPalette = getRashiPalette(data.style?.rashi_palette, nextRashi);

    onUpdate("astrology", { ...(data.astrology || {}), rashi: value });

    if (nextDefault && !existingPalette) {
      onUpdate("style", {
        ...(data.style || {}),
        rashi_palette: nextDefault.id,
        theme_color: nextDefault.background,
      });
    }
  }

  /** Persists a selected palette as both a stable ID and the rendered portfolio background. */
  function selectPalette(palette: RashiPalette) {
    onUpdate("style", {
      ...(data.style || {}),
      rashi_palette: palette.id,
      theme_color: palette.background,
    });
  }

  /** Persists the selected public portfolio layout. */
  function selectTemplate(templateName: string) {
    onUpdate("style", { ...(data.style || {}), template_name: templateName });
  }

  return (
    <div className="space-y-7">
      <FormSection title="Identity and story">
        <TextInput
          label="Full name"
          value={data.personal.name}
          onChange={(value) =>
            onUpdate("personal", { ...data.personal, name: value })
          }
        />
        <TextInput
          label="Preferred name"
          value={data.personal.preferred_name || ""}
          onChange={(value) =>
            onUpdate("personal", { ...data.personal, preferred_name: value })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Date of birth"
            type="date"
            value={data.personal.dob}
            onChange={(value) =>
              onUpdate("personal", { ...data.personal, dob: value })
            }
          />
          <TextInput
            label="Time of birth"
            type="time"
            value={data.astrology?.time_of_birth || ""}
            onChange={(value) =>
              onUpdate("astrology", { ...(data.astrology || {}), time_of_birth: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Gender"
            value={data.personal.gender}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
            onChange={(value) =>
              onUpdate("personal", {
                ...data.personal,
                gender: value as "male" | "female",
              })
            }
          />
          <TextInput
            label="Height"
            value={data.vitals?.height || ""}
            onChange={(value) => onUpdate("vitals", { ...(data.vitals || {}), height: value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Place of birth"
            value={data.personal.place_of_birth || ""}
            onChange={(value) =>
              onUpdate("personal", { ...data.personal, place_of_birth: value })
            }
          />
          <TextInput
            label="Current location"
            value={data.personal.current_location || ""}
            onChange={(value) =>
              onUpdate("personal", { ...data.personal, current_location: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Marital status"
            value={data.personal.marital_status || ""}
            onChange={(value) =>
              onUpdate("personal", { ...data.personal, marital_status: value })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Immigration status"
            value={data.personal.immigration_status || ""}
            onChange={(value) =>
              onUpdate("personal", { ...data.personal, immigration_status: value })
            }
          />
          <TextInput
            label="Relocation preference"
            value={data.personal.relocation_preference || ""}
            onChange={(value) =>
              onUpdate("personal", { ...data.personal, relocation_preference: value })
            }
          />
        </div>
        <TextArea
          label="Profile summary"
          value={data.personal.profile_summary || ""}
          onChange={(value) =>
            onUpdate("personal", { ...data.personal, profile_summary: value })
          }
        />
      </FormSection>

      <FormSection title="Career and education">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Role"
            value={data.career?.title || ""}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), title: value })
            }
          />
          <TextInput
            label="Company"
            value={data.career?.company || ""}
            onChange={(value) =>
              onUpdate("career", { ...(data.career || {}), company: value })
            }
          />
        </div>
        <TextInput
          label="Company location"
          value={data.career?.location || ""}
          onChange={(value) =>
            onUpdate("career", { ...(data.career || {}), location: value })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Degree"
            value={data.education?.degree || ""}
            onChange={(value) =>
              onUpdate("education", { ...(data.education || {}), degree: value })
            }
          />
          <TextInput
            label="Institution"
            value={data.education?.institution || ""}
            onChange={(value) =>
              onUpdate("education", {
                ...(data.education || {}),
                institution: value,
              })
            }
          />
        </div>
        <TextInput
          label="Education location"
          value={data.education?.location || ""}
          onChange={(value) =>
            onUpdate("education", { ...(data.education || {}), location: value })
          }
        />
      </FormSection>

      <FormSection title="Astrology">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Rashi"
            value={data.astrology?.rashi || ""}
            options={[
              { value: "", label: "Select rashi" },
              ...RASHI_OPTIONS.map((rashi) => ({
                value: rashi.key,
                label: rashi.label,
              })),
            ]}
            onChange={selectRashi}
          />
          <TextInput
            label="Nakshatra"
            value={data.astrology?.nakshatra || ""}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                nakshatra: value,
              })
            }
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">Portfolio colors</p>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Choose a background from your rashi&apos;s curated palette. Text color is adjusted automatically for readability.
            </p>
          </div>
          <RashiPalettePicker
            palettes={palettes}
            selectedPaletteId={selectedPalette?.id}
            onSelect={selectPalette}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">Portfolio template</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {["Royal Heritage", "Celestial Union"].map((templateName) => {
              const selected = (data.style?.template_name || "Royal Heritage") === templateName;
              return (
                <button
                  key={templateName}
                  type="button"
                  onClick={() => selectTemplate(templateName)}
                  className={`rounded-lg border px-3 py-3 text-left text-xs font-semibold transition ${
                    selected
                      ? "border-[#f4d98f] bg-[#f4d98f]/15 text-[#f4d98f]"
                      : "border-white/15 text-white/70 hover:border-white/35"
                  }`}
                  aria-pressed={selected}
                >
                  {templateName}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Lagnam"
            value={data.astrology?.lagnam || ""}
            onChange={(value) =>
              onUpdate("astrology", { ...(data.astrology || {}), lagnam: value })
            }
          />
          <TextInput
            label="Manglik status"
            value={data.astrology?.manglik_status || ""}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                manglik_status: value,
              })
            }
          />
        </div>
        <TextInput
          label="Pada"
          value={data.astrology?.pada || ""}
          onChange={(value) =>
            onUpdate("astrology", { ...(data.astrology || {}), pada: value })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Gotra"
            value={data.vitals?.gotra || ""}
            onChange={(value) =>
              onUpdate("vitals", { ...(data.vitals || {}), gotra: value })
            }
          />
          <TextInput
            label="Maternal gotra"
            value={data.astrology?.maternal_gotra || ""}
            onChange={(value) =>
              onUpdate("astrology", {
                ...(data.astrology || {}),
                maternal_gotra: value,
              })
            }
          />
        </div>
      </FormSection>

      <FormSection title="Family">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Father"
            value={data.family?.father?.name || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                father: { ...(data.family?.father || {}), name: value },
              })
            }
          />
          <TextInput
            label="Father occupation"
            value={data.family?.father?.occupation || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                father: { ...(data.family?.father || {}), occupation: value },
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Mother"
            value={data.family?.mother?.name || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                mother: { ...(data.family?.mother || {}), name: value },
              })
            }
          />
          <TextInput
            label="Mother occupation"
            value={data.family?.mother?.occupation || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                mother: { ...(data.family?.mother || {}), occupation: value },
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Ancestral origin"
            value={data.family?.ancestral_origin || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                ancestral_origin: value,
              })
            }
          />
          <TextInput
            label="Current settlement"
            value={data.family?.current_settlement || ""}
            onChange={(value) =>
              onUpdate("family", {
                ...(data.family || {}),
                current_settlement: value,
              })
            }
          />
        </div>
        <TextArea
          label="Family note"
          value={data.family?.family_note || ""}
          onChange={(value) =>
            onUpdate("family", { ...(data.family || {}), family_note: value })
          }
        />
      </FormSection>

      <FormSection title="Lifestyle and preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Diet"
            value={data.lifestyle?.diet || ""}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), diet: value })
            }
          />
          <TextInput
            label="Languages"
            value={data.lifestyle?.languages || ""}
            onChange={(value) =>
              onUpdate("lifestyle", {
                ...(data.lifestyle || {}),
                languages: value,
              })
            }
          />
        </div>
        <TextInput
          label="Hobbies"
          value={data.lifestyle?.hobbies || ""}
          onChange={(value) =>
            onUpdate("lifestyle", { ...(data.lifestyle || {}), hobbies: value })
          }
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput
            label="Smoking"
            value={data.lifestyle?.smoking || ""}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), smoking: value })
            }
          />
          <TextInput
            label="Drinking"
            value={data.lifestyle?.drinking || ""}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), drinking: value })
            }
          />
          <TextInput
            label="Music"
            value={data.lifestyle?.music || ""}
            onChange={(value) =>
              onUpdate("lifestyle", { ...(data.lifestyle || {}), music: value })
            }
          />
        </div>
        <TextArea
          label="Values and marriage outlook"
          value={data.lifestyle?.values_statement || ""}
          onChange={(value) =>
            onUpdate("lifestyle", {
              ...(data.lifestyle || {}),
              values_statement: value,
            })
          }
        />
        <TextArea
          label="Partner preference summary"
          value={data.preferences?.narrative || ""}
          onChange={(value) =>
            onUpdate("preferences", {
              ...(data.preferences || {}),
              narrative: value,
            })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Preferred age"
            value={data.preferences?.age_range || ""}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                age_range: value,
              })
            }
          />
          <TextInput
            label="Preferred height"
            value={data.preferences?.height_range || ""}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                height_range: value,
              })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Preferred marital status"
            value={data.preferences?.marital_status || ""}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                marital_status: value,
              })
            }
          />
          <TextInput
            label="Preferred background"
            value={data.preferences?.background || ""}
            onChange={(value) =>
              onUpdate("preferences", {
                ...(data.preferences || {}),
                background: value,
              })
            }
          />
        </div>
        <TextInput
          label="Preferred location"
          value={data.preferences?.location_preference || ""}
          onChange={(value) =>
            onUpdate("preferences", {
              ...(data.preferences || {}),
              location_preference: value,
            })
          }
        />
      </FormSection>

      <FormSection title="Free-view restrictions">
        <RestrictionToggle
          label="Blur family details for free viewers"
          checked={(data.visibility?.family || "restricted") === "restricted"}
          onChange={(checked) =>
            onUpdate("visibility", {
              ...(data.visibility || {}),
              family: checked ? "restricted" : "public",
            })
          }
        />
        <RestrictionToggle
          label="Blur deep astrology fields"
          checked={
            (data.visibility?.astrology_details || "restricted") ===
            "restricted"
          }
          onChange={(checked) =>
            onUpdate("visibility", {
              ...(data.visibility || {}),
              astrology_details: checked ? "restricted" : "public",
            })
          }
        />
        <RestrictionToggle
          label="Blur private gallery after preview photos"
          checked={(data.visibility?.gallery || "restricted") === "restricted"}
          onChange={(checked) =>
            onUpdate("visibility", {
              ...(data.visibility || {}),
              gallery: checked ? "restricted" : "public",
            })
          }
        />
      </FormSection>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-white/10 pb-7 last:border-b-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/55">
        {title}
      </h3>
      {children}
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-normal text-white outline-none placeholder:text-white/35 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="resize-y rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-normal leading-6 text-white outline-none placeholder:text-white/35 focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-white/85">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-normal text-white outline-none focus:border-[#f4d98f]/60 focus:ring-2 focus:ring-[#f4d98f]/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RestrictionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium text-white/85">
      <span className="flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-white/50" />
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
