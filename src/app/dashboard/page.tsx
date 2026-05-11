import { getAuthenticatedUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let viewCount = 0;
  if (portfolio) {
    const { count } = await supabase
      .from("portfolio_views")
      .select("*", { count: "exact", head: true })
      .eq("portfolio_id", portfolio.id);
    viewCount = count ?? 0;
  }

  return (
    <DashboardClient
      portfolio={portfolio}
      viewCount={viewCount}
      userEmail={user.email ?? ""}
    />
  );
}
