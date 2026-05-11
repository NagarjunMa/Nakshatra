import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTemplate } from "@/components/templates";
import type { Metadata } from "next";
import type { PortfolioData } from "@/types/portfolio";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preview Biodata",
};

export default async function PreviewPage() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!portfolio) redirect("/edit");

  const data = portfolio.draft_data as PortfolioData;
  const themeColor = portfolio.theme_color || "#6366f1";
  const sunSign = portfolio.sun_sign;
  const Template = getTemplate(portfolio.template_id);

  return (
    <div className="flex flex-1 flex-col">
      {/* Preview banner */}
      <div data-preview-bar="" className="border-b border-border bg-muted px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-medium">Preview Mode (Draft)</span>
          <div className="flex gap-2">
            <Link
              href="/edit"
              className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background"
            >
              Back to editing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-border px-3 py-1 text-sm transition-colors hover:bg-background"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Template render */}
      <div className="flex-1">
        <Template data={data} themeColor={themeColor} sunSign={sunSign} />
      </div>
    </div>
  );
}
