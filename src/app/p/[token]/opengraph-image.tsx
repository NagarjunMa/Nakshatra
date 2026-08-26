import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { PublicPortfolioRepository } from "@/features/portfolio/server/public-portfolio.repository";
import { resolvePublicPortfolio } from "@/features/portfolio/server/public-portfolio.service";

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
  const snapshot = await resolvePublicPortfolio(supabase, token);
  const data = snapshot?.data;
  const foreground = isLightColor(snapshot?.themeColor) ? "#17151c" : "#fffdf8";
  let heroUrl: string | undefined;

  if (snapshot) {
    const hero = snapshot.media.find((item) => item.mediaType === "hero" && item.presentation === "clear");
    if (hero) {
      const { data: signedUrl } = await new PublicPortfolioRepository(supabase)
        .createPhotoUrl(hero.accessPath, 60 * 10);
      heroUrl = signedUrl?.signedUrl;
    }
  }

  const name = data?.personal?.name || "Wedding Biodata";
  const rashi = data?.astrology?.rashi || snapshot?.sunSign || "";
  const background = snapshot?.themeColor || "#17151c";

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
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders OG markup and cannot use next/image.
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
