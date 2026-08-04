import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Biodata",
};

export default async function EditPage() {
  redirect("/dashboard?edit=1");
}
