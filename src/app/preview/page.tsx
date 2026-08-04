import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BiodataTemplate } from "@/components/templates";
import type { Metadata } from "next";
import type { PortfolioData } from "@/types/portfolio";
import type { PortfolioMedia } from "@/types/portfolio";
import Link from "next/link";
import { createPortfolioPhotoUrls } from "@/features/media/server/photo-url.service";
import { createPublicPortfolioSnapshot } from "@/features/portfolio/server/public-snapshot.service";
import { ensurePortfolioPhotoPreviews } from "@/features/media/server/media.service";

export const metadata: Metadata = {
  title: "Preview Biodata",
};

export default async function PreviewPage() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!portfolio) redirect("/dashboard?edit=1");

  const data = createPublicPortfolioSnapshot(portfolio.draft_data as PortfolioData);
  const themeColor = portfolio.theme_color || "#6366f1";
  const sunSign = portfolio.sun_sign;
  await ensurePortfolioPhotoPreviews({
    supabase,
    portfolioId: portfolio.id,
  });
  const { data: media } = await supabase
    .from("portfolio_media")
    .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text, metadata")
    .eq("portfolio_id", portfolio.id)
    .in("media_type", ["hero", "gallery"]);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (media ?? []) as PortfolioMedia[],
    viewer: "public",
    privacyMode: data.privacy_mode,
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Preview banner */}
      <div data-preview-bar="" className="border-b border-border bg-muted px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-medium">Preview Mode (Draft)</span>
          <div className="flex gap-2">
            <Link
              href="/dashboard?edit=1"
              className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background"
            >
              Back to editing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <BiodataTemplate
          templateId={portfolio.template_id}
          data={data}
          themeColor={themeColor}
          sunSign={sunSign}
          accessMode="public"
          photos={photos}
        />
      </div>
    </div>
  );
}
