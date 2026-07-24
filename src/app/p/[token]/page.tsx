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
    .from("portfolios")
    .select("published_data, theme_color, sun_sign, share_token")
    .eq("share_token", token)
    .eq("is_published", true)
    .single();

  if (!portfolio?.published_data) {
    return { title: "Biodata Not Found" };
  }

  const data = portfolio.published_data as PortfolioData;
  const name = data.personal?.name || "Wedding Biodata";
  const rashi = data.astrology?.rashi || "";
  const rashiLabel = rashi
    ? ` | ${rashi.charAt(0).toUpperCase() + rashi.slice(1)}`
    : "";
  const description = `${name}'s Wedding Biodata${rashiLabel}`;
  const photoUrl = data.personal?.photo_thumb_url || data.personal?.photo_url;

  return {
    title: `${name} — Wedding Biodata`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${name} — Wedding Biodata`,
      description,
      type: "profile",
      ...(photoUrl && {
        images: [
          {
            url: photoUrl,
            width: 800,
            height: 800,
            alt: `${name}'s photo`,
          },
        ],
      }),
    },
  };
}

export default async function PublicBiodataPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select(
      "id, published_data, template_id, theme_color, sun_sign, is_published, expires_at"
    )
    .eq("share_token", token)
    .eq("is_published", true)
    .single();

  if (!portfolio) return notFound();

  if (portfolio.expires_at && new Date(portfolio.expires_at) < new Date()) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">This biodata has expired</h1>
        <p className="mt-2 text-muted-foreground">
          The owner can renew it from their dashboard.
        </p>
      </div>
    );
  }

  // Record view (rate-limited: max 1 per hour)
  supabase
    .rpc("record_view", { p_portfolio_id: portfolio.id })
    .then(() => {});

  const data = portfolio.published_data as PortfolioData;
  const themeColor = portfolio.theme_color || "#6366f1";
  const sunSign = portfolio.sun_sign;
  const { data: media } = await supabase
    .from("portfolio_media")
    .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text")
    .eq("portfolio_id", portfolio.id)
    .in("media_type", ["hero", "gallery"]);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (media ?? []) as PortfolioMedia[],
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
