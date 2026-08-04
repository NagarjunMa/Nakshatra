import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BiodataTemplate } from "@/components/templates";
import type { Metadata } from "next";
import type { PortfolioData } from "@/types/portfolio";
import type { PortfolioMedia } from "@/types/portfolio";
import { createPortfolioPhotoUrls } from "@/features/media/server/photo-url.service";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();

  const { data: portfolio } = await supabase
    .from("public_portfolio_snapshots")
    .select("data, theme_color, sun_sign, share_token")
    .eq("share_token", token)
    .eq("is_active", true)
    .single();

  if (!portfolio?.data) {
    return { title: "Biodata Not Found" };
  }

  const data = portfolio.data as PortfolioData;
  const name = data.personal?.name || "Wedding Biodata";
  const rashi = data.astrology?.rashi || "";
  const rashiLabel = rashi
    ? ` | ${rashi.charAt(0).toUpperCase() + rashi.slice(1)}`
    : "";
  const description = `${name}'s Wedding Biodata${rashiLabel}`;

  return {
    title: `${name} — Wedding Biodata`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${name} — Wedding Biodata`,
      description,
      type: "profile",
      images: [{
        url: `/p/${token}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${name}'s wedding biodata`,
      }],
    },
  };
}

export default async function PublicBiodataPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: portfolio } = await supabase
    .from("public_portfolio_snapshots")
    .select(
      "portfolio_id, data, template_id, theme_color, sun_sign"
    )
    .eq("share_token", token)
    .eq("is_active", true)
    .single();

  if (!portfolio?.data) return notFound();

  // Record view (rate-limited: max 1 per hour)
  supabase
    .rpc("record_view", { p_portfolio_id: portfolio.portfolio_id })
    .then(() => {});

  const data = portfolio.data as PortfolioData;
  const themeColor = portfolio.theme_color || "#6366f1";
  const sunSign = portfolio.sun_sign;
  const { data: media } = await supabase
    .from("portfolio_media")
    .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text, metadata")
    .eq("portfolio_id", portfolio.portfolio_id)
    .in("visibility", ["public", "blurred", "interest_required"])
    .in("media_type", ["hero", "gallery"]);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (media ?? []) as PortfolioMedia[],
    viewer: "public",
  });

  return (
    <BiodataTemplate
      templateId={portfolio.template_id}
      data={data}
      themeColor={themeColor}
      sunSign={sunSign}
      accessMode="restricted"
      photos={photos}
    />
  );
}
