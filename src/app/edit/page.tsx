import { getAuthenticatedUser } from "@/lib/auth";
import type { Metadata } from "next";
import EditWizard from "./edit-wizard";

export const metadata: Metadata = {
  title: "Edit Biodata",
};

export default async function EditPage() {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return <EditWizard portfolio={portfolio} userId={user.id} />;
}
