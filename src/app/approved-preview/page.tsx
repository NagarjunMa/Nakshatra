import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BiodataTemplate } from "@/components/templates";
import { getAuthenticatedUser } from "@/lib/auth";
import { loadOwnerApprovedPreview } from "@/features/portfolio/server/owner-preview.service";

export const metadata: Metadata = {
  title: "Full Approved View Preview",
  robots: { index: false, follow: false },
};

export default async function ApprovedPreviewPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preview = await loadOwnerApprovedPreview(supabase, user.id);
  if (!preview) redirect("/dashboard?edit=1");
  const { portfolio, data, photos, horoscopeAttachment } = preview;

  return (
    <div className="flex flex-1 flex-col">
      <div data-preview-bar="" className="border-b border-border bg-muted px-4 py-2">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Full Approved View · Owner preview</span>
          <div className="flex gap-2">
            <Link href="/dashboard?edit=1" className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background">Edit portfolio</Link>
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
