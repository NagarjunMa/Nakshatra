import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BiodataTemplate } from "@/components/templates";
import type { Metadata } from "next";
import type { PortfolioData } from "@/types/portfolio";
import type { PortfolioHoroscope, PortfolioHoroscopeAttachment, PortfolioMedia } from "@/types/portfolio";
import { createPortfolioPhotoUrls } from "@/features/media/server/photo-url.service";
import { horoscopeFormatLabel } from "@/features/horoscope/server/horoscope.contract";
import { InterestRequestModal } from "@/components/portfolio/InterestRequestModal";

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
        alt: `${name}'s wedding portfolio`,
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

  const publicData = portfolio.data as PortfolioData;
  const { data: authData } = await supabase.auth.getUser();
  const viewerId = authData.user?.id;
  const { data: ownedPortfolio } = viewerId
    ? await supabase
        .from("portfolios")
        .select("id")
        .eq("id", portfolio.portfolio_id)
        .eq("user_id", viewerId)
        .maybeSingle()
    : { data: null };
  const { data: grant } = viewerId && !ownedPortfolio
    ? await supabase
        .from("reveal_grants")
        .select("id")
        .eq("portfolio_id", portfolio.portfolio_id)
        .eq("viewer_user_id", viewerId)
        .eq("access_level", "full")
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const { data: approvedSnapshot } = grant
    ? await supabase
        .from("approved_portfolio_snapshots")
        .select("data, template_id, theme_color, sun_sign")
        .eq("portfolio_id", portfolio.portfolio_id)
        .maybeSingle()
    : { data: null };
  const approvedAccess = Boolean(approvedSnapshot?.data);
  const data = (approvedSnapshot?.data || publicData) as PortfolioData;
  const themeColor = approvedSnapshot?.theme_color || portfolio.theme_color || "#6366f1";
  const sunSign = approvedSnapshot?.sun_sign || portfolio.sun_sign;
  const { data: media } = await supabase
    .from("portfolio_media")
    .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text, metadata")
    .eq("portfolio_id", portfolio.portfolio_id)
    .in("visibility", ["public", "blurred", "interest_required", "approved_only"])
    .in("media_type", ["hero", "gallery"]);
  const photos = await createPortfolioPhotoUrls({
    supabase,
    media: (media ?? []) as PortfolioMedia[],
    viewer: approvedAccess ? "approved" : "public",
    privacyMode: data.privacy_mode,
  });
  const { data: horoscopeRow } = approvedAccess
    ? await supabase
        .from("portfolio_horoscopes")
        .select("id, portfolio_id, storage_path, mime_type, file_extension, byte_size, language_label, page_count, published_at, created_at, updated_at")
        .eq("portfolio_id", portfolio.portfolio_id)
        .not("published_at", "is", null)
        .maybeSingle()
    : { data: null };
  const horoscope = horoscopeRow as PortfolioHoroscope | null;
  const horoscopeAttachment: PortfolioHoroscopeAttachment | undefined = horoscope
    ? {
        href: `/p/${encodeURIComponent(token)}/horoscope`,
        formatLabel: horoscopeFormatLabel(horoscope.file_extension),
        languageLabel: horoscope.language_label,
        pageCount: horoscope.page_count,
      }
    : undefined;

  return (
    <BiodataTemplate
      templateId={approvedSnapshot?.template_id || portfolio.template_id}
      data={data}
      themeColor={themeColor}
      sunSign={sunSign}
      accessMode={approvedAccess ? "approved" : "public"}
      photos={photos}
      horoscopeAttachment={horoscopeAttachment}
      interestAction={!approvedAccess ? <InterestRequestModal portfolioToken={token} profileName={data.personal.name || "the profile owner"} /> : undefined}
    />
  );
}
