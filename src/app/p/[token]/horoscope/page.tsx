import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioHoroscope } from "@/types/portfolio";
import { horoscopeFormatLabel } from "@/features/horoscope/server/horoscope.contract";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private horoscope",
  robots: { index: false, follow: false, nocache: true },
};

export default async function HoroscopePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: snapshot } = await supabase
    .from("public_portfolio_snapshots")
    .select("portfolio_id, data")
    .eq("share_token", token)
    .eq("is_active", true)
    .single();
  if (!snapshot) return notFound();

  const { data: horoscopeRow } = await supabase
    .from("portfolio_horoscopes")
    .select("id, portfolio_id, storage_path, mime_type, file_extension, byte_size, language_label, page_count, published_at, created_at, updated_at")
    .eq("portfolio_id", snapshot.portfolio_id)
    .not("published_at", "is", null)
    .single();
  if (!horoscopeRow) return notFound();
  const horoscope = horoscopeRow as PortfolioHoroscope;
  const isWord = horoscope.file_extension === "doc" || horoscope.file_extension === "docx";
  const signedOptions = isWord ? { download: `horoscope.${horoscope.file_extension}` } : undefined;
  const { data: signed, error: signedError } = await supabase.storage
    .from("horoscopes")
    .createSignedUrl(horoscope.storage_path, 5 * 60, signedOptions);
  if (signedError || !signed?.signedUrl) return notFound();

  const name = typeof snapshot.data === "object" && snapshot.data && "personal" in snapshot.data
    ? (snapshot.data as { personal?: { name?: string } }).personal?.name
    : undefined;

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
            <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Original horoscope{name ? ` · ${name}` : ""}</h1>
            <p className="mt-2 text-sm text-[#aebbb8]">
              {[horoscopeFormatLabel(horoscope.file_extension), horoscope.language_label, horoscope.page_count ? `${horoscope.page_count} ${horoscope.page_count === 1 ? "page" : "pages"}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs text-[#aebbb8]"><LockKeyhole className="h-3.5 w-3.5" /> Access expires when approval is revoked.</p>
        </div>

        {horoscope.mime_type === "application/pdf" ? (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#f3efe5] shadow-2xl" aria-label="Horoscope PDF viewer">
            <iframe src={signed.signedUrl} title="Original horoscope PDF" className="h-[78vh] min-h-[560px] w-full" referrerPolicy="no-referrer" />
          </section>
        ) : horoscope.mime_type === "image/webp" ? (
          <section className="flex min-h-[60vh] items-start justify-center overflow-auto rounded-2xl border border-white/10 bg-[#e7e1d5] p-3 sm:p-6" aria-label="Horoscope image viewer">
            {/* The image is served from a five-minute owner/approved-viewer signed URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signed.signedUrl} alt="Scanned original horoscope" className="h-auto max-w-full rounded-sm shadow-xl" referrerPolicy="no-referrer" />
          </section>
        ) : (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#111b2c] px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#bba269]/25 bg-[#bba269]/10 text-[#d6bd80]"><FileText className="h-8 w-8" /></span>
            <h2 className="mt-5 text-2xl font-semibold">Open the Word document</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#aebbb8]">Browsers cannot safely preview a private Word file. Open the neutral, approval-gated download in your document app.</p>
            <a href={signed.signedUrl} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#d6bd80] px-5 text-sm font-semibold text-[#111827] hover:bg-[#ecd59b]">
              <Download className="h-4 w-4" /> Open document
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
