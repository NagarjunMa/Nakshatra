import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BiodataTemplate } from "@/components/templates";
import type { Metadata } from "next";
import type { PortfolioHoroscopeAttachment } from "@/types/portfolio";
import { horoscopeFormatLabel } from "@/features/horoscope/server/horoscope.contract";
import { InterestRequestModal } from "@/components/portfolio/InterestRequestModal";
import {
  isPortfolioOwner,
  recordPublicPortfolioView,
  resolvePublicPortfolioAvailability,
  resolvePortfolioView,
  resolvePublicPortfolio,
} from "@/features/portfolio/server/public-portfolio.service";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();

  const portfolio = await resolvePublicPortfolio(supabase, token);

  if (!portfolio?.data) {
    return { title: "Biodata Not Found" };
  }

  const data = portfolio.data;
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

  const { data: authData } = await supabase.auth.getUser();
  const verifiedEmail = authData.user?.email_confirmed_at
    ? authData.user.email?.trim().toLowerCase() || null
    : null;
  const portfolio = await resolvePortfolioView(supabase, token, Boolean(verifiedEmail));
  if (!portfolio) {
    const availability = await resolvePublicPortfolioAvailability(supabase, token);
    if (availability === "expired") return <ExpiredPortfolioLink />;
    notFound();
  }
  const viewingOwnPortfolio = await isPortfolioOwner(supabase, token, authData.user?.id);

  void recordPublicPortfolioView(supabase, token);
  const horoscopeAttachment: PortfolioHoroscopeAttachment | undefined = portfolio.horoscope
    ? {
        href: `/p/${encodeURIComponent(token)}/horoscope`,
        formatLabel: horoscopeFormatLabel(portfolio.horoscope.fileExtension),
        languageLabel: portfolio.horoscope.languageLabel || null,
        pageCount: portfolio.horoscope.pageCount || null,
      }
    : undefined;

  return (
    <BiodataTemplate
      templateId={portfolio.templateId}
      data={portfolio.data}
      themeColor={portfolio.themeColor || "#6366f1"}
      sunSign={portfolio.sunSign || null}
      accessMode={portfolio.accessMode}
      photos={portfolio.photos}
      horoscopeAttachment={horoscopeAttachment}
      interestAction={portfolio.accessMode === "public" ? <InterestRequestModal portfolioToken={token} profileName={portfolio.data.personal.name || "the profile owner"} authenticated={Boolean(verifiedEmail)} verifiedEmail={verifiedEmail} isOwner={viewingOwnPortfolio} /> : undefined}
    />
  );
}

function ExpiredPortfolioLink() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[color:var(--workspace-canvas)] px-5 py-16 text-[color:var(--workspace-ink)]">
      <section className="w-full max-w-xl rounded-2xl border border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface)] p-7 text-center shadow-sm sm:p-10" aria-labelledby="expired-portfolio-title">
        <p className="text-sm font-semibold text-[color:var(--workspace-teal)]">Nakshatra private beta</p>
        <h1 id="expired-portfolio-title" className="mt-3 text-3xl font-semibold">This portfolio link has expired</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[color:var(--workspace-ink-muted)]">
          Ask the person who shared it to renew their portfolio link. No portfolio information is available from an expired link.
        </p>
      </section>
    </main>
  );
}
