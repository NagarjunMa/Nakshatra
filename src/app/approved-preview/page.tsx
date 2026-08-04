import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BiodataTemplate } from "@/components/templates";
import { getAuthenticatedUser } from "@/lib/auth";
import { createApprovedPortfolioSnapshot } from "@/features/portfolio/server/approved-snapshot.service";
import { createPortfolioPhotoUrls } from "@/features/media/server/photo-url.service";
import { horoscopeFormatLabel } from "@/features/horoscope/server/horoscope.contract";
import type {
  PortfolioData,
  PortfolioHoroscope,
  PortfolioHoroscopeAttachment,
  PortfolioMedia,
} from "@/types/portfolio";

export const metadata: Metadata = {
  title: "Full Approved Request Preview",
  robots: { index: false, follow: false },
};

export default async function ApprovedPreviewPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id, draft_data, template_id, theme_color, sun_sign")
    .eq("user_id", user.id)
    .single();
  if (!portfolio) redirect("/dashboard?edit=1");

  const data = createApprovedPortfolioSnapshot(portfolio.draft_data as PortfolioData);
  const { data: media } = await supabase
    .from("portfolio_media")
    .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text, metadata")
    .eq("portfolio_id", portfolio.id)
    .in("media_type", ["hero", "gallery"])
    .in("visibility", ["public", "blurred", "interest_required", "approved_only"]);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (media ?? []) as PortfolioMedia[],
    viewer: "approved",
    privacyMode: data.privacy_mode,
  });

  const { data: horoscopeRow } = await supabase
    .from("portfolio_horoscopes")
    .select("id, portfolio_id, storage_path, mime_type, file_extension, byte_size, language_label, page_count, published_at, created_at, updated_at")
    .eq("portfolio_id", portfolio.id)
    .maybeSingle();
  const horoscope = horoscopeRow as PortfolioHoroscope | null;
  const horoscopeAttachment: PortfolioHoroscopeAttachment | undefined = horoscope
    ? {
        href: "/api/portfolio-horoscope/view",
        formatLabel: horoscopeFormatLabel(horoscope.file_extension),
        languageLabel: horoscope.language_label,
        pageCount: horoscope.page_count,
      }
    : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div data-preview-bar="" className="border-b border-border bg-muted px-4 py-2">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Full Approved Request view · Owner preview</span>
          <div className="flex gap-2">
            <Link href="/dashboard?edit=1" className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background">Edit biodata</Link>
            <Link href="/dashboard" className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background">Dashboard</Link>
          </div>
        </div>
      </div>
      <div className="flex-1">
        <BiodataTemplate
          templateId={portfolio.template_id}
          data={data}
          themeColor={portfolio.theme_color || "#6366f1"}
          sunSign={portfolio.sun_sign}
          accessMode="approved"
          photos={photos}
          horoscopeAttachment={horoscopeAttachment}
        />
      </div>
    </div>
  );
}
