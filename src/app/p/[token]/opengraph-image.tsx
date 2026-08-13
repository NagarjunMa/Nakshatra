import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioData, PortfolioMedia } from "@/types/portfolio";

export const alt = "Nakshatra wedding portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generates a social preview from the same sanitized snapshot and public hero media as the public page.
 * Input: a share-token route parameter. Output: an Open Graph image without querying owner portfolio data.
 */
export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: snapshot } = await supabase
    .from("public_portfolio_snapshots")
    .select("portfolio_id, data, theme_color, sun_sign")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();

  const data = snapshot?.data as PortfolioData | undefined;
  const foreground = isLightColor(snapshot?.theme_color) ? "#17151c" : "#fffdf8";
  let heroUrl: string | undefined;

  if (snapshot) {
    const { data: media } = await supabase
      .from("portfolio_media")
      .select("id, portfolio_id, storage_path, thumbnail_path, media_type, visibility, sort_order, alt_text")
      .eq("portfolio_id", snapshot.portfolio_id)
      .eq("media_type", "hero")
      .eq("visibility", "public")
      .maybeSingle();
    const hero = media as PortfolioMedia | null;
    if (hero) {
      const { data: signedUrl } = await supabase.storage
        .from("photos")
        .createSignedUrl(hero.storage_path, 60 * 10);
      heroUrl = signedUrl?.signedUrl;
    }
  }

  const name = data?.personal?.name || "Wedding Biodata";
  const rashi = data?.astrology?.rashi || snapshot?.sun_sign || "";
  const background = snapshot?.theme_color || "#17151c";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background,
          color: foreground,
          display: "flex",
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        {heroUrl ? (
          // Image comes from the portfolio's explicitly public hero media only.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={heroUrl}
            style={{ height: "100%", objectFit: "cover", opacity: 0.5, width: "52%" }}
          />
        ) : null}
        <div
          style={{
            background: heroUrl ? "rgba(0, 0, 0, 0.28)" : "transparent",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "64px",
            ...(heroUrl ? { inset: 0, position: "absolute" as const } : { position: "relative" as const }),
            width: "100%",
          }}
        >
          <div style={{ color: foreground, display: "flex", fontSize: 22, letterSpacing: 5, textTransform: "uppercase" }}>
            Nakshatra
          </div>
          <div style={{ color: foreground, display: "flex", fontFamily: "serif", fontSize: 78, marginTop: 18 }}>
            {name}
          </div>
          {rashi ? (
            <div style={{ color: foreground, display: "flex", fontSize: 28, marginTop: 18, opacity: 0.86 }}>
              {rashi}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size
  );
}

/** Determines whether a hex background requires dark preview typography. Input: optional hex colour. Output: lightness decision. */
function isLightColor(color?: string | null) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return false;
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 155;
}
