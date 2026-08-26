import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { horoscopeFormatLabel } from "@/features/horoscope/server/horoscope.contract";
import { resolveApprovedHoroscope } from "@/features/portfolio/server/public-portfolio.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private horoscope",
  robots: { index: false, follow: false, nocache: true },
};

export default async function HoroscopePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const horoscope = await resolveApprovedHoroscope(supabase, token);
  if (!horoscope) return notFound();

  return (
    <main className="min-h-screen bg-[#0d1423] text-[#f8f3e7]">
      <header className="border-b border-white/10 bg-[#111b2c]/95 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href={`/p/${encodeURIComponent(token)}`} className="inline-flex items-center gap-2 text-sm text-[#d6dfdb] hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to portfolio
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#81a9a0]/25 bg-[#81a9a0]/10 px-3 py-1.5 text-xs font-semibold text-[#cde3de]">
            <ShieldCheck className="h-3.5 w-3.5" /> Approved access
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#bba269]">Private document</p>
            <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Original horoscope{horoscope.profileName ? ` · ${horoscope.profileName}` : ""}</h1>
            <p className="mt-2 text-sm text-[#aebbb8]">
              {[horoscopeFormatLabel(horoscope.fileExtension), horoscope.languageLabel, horoscope.pageCount ? `${horoscope.pageCount} ${horoscope.pageCount === 1 ? "page" : "pages"}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs text-[#aebbb8]"><LockKeyhole className="h-3.5 w-3.5" /> Access expires when approval is revoked.</p>
        </div>

        <section className="flex min-h-[60vh] items-start justify-center overflow-auto rounded-2xl border border-white/10 bg-[#e7e1d5] p-3 sm:p-6" aria-label="Horoscope image viewer">
          {/* The image is served from a grant-bounded owner/approved-viewer signed URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={horoscope.signedUrl} alt="Scanned original horoscope" className="h-auto max-w-full rounded-sm shadow-xl" referrerPolicy="no-referrer" />
        </section>
      </div>
    </main>
  );
}
