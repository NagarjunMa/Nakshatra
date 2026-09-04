import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BiodataTemplate } from "@/components/templates";
import type { Metadata } from "next";
import Link from "next/link";
import { loadOwnerPublicPreview } from "@/features/portfolio/server/owner-preview.service";

export const metadata: Metadata = {
  title: "Preview Biodata",
};

export default async function PreviewPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preview = await loadOwnerPublicPreview(supabase, user.id);
  if (!preview) redirect("/dashboard?edit=1");
  const { portfolio, data, photos } = preview;
  const themeColor = portfolio.theme_color || "#6366f1";
  const sunSign = portfolio.sun_sign;

  return (
    <div className="flex flex-1 flex-col">
      {/* Preview banner */}
      <div data-preview-bar="" className="border-b border-[color:var(--workspace-border)] bg-[color:var(--workspace-surface-soft)] px-4 py-3 text-[color:var(--workspace-ink)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold">Public preview · Draft</span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              href="/dashboard?edit=1"
              className="workspace-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-[color:var(--workspace-border)] bg-white px-4 text-sm font-semibold transition-colors hover:bg-[color:var(--workspace-canvas)]"
            >
              Back to editing
            </Link>
            <Link
              href="/dashboard"
              className="workspace-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-[color:var(--workspace-border)] bg-white px-4 text-sm font-semibold transition-colors hover:bg-[color:var(--workspace-canvas)]"
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
