import type { Metadata } from "next";
import { getAccountDeletionStatus } from "@/features/account/server/account.service";
import { getAuthenticatedUser } from "@/lib/auth";
import AccountClient from "./account-client";

export const metadata: Metadata = {
  title: "Account and Privacy",
};

/** Loads only the signed-in user's deletion status before rendering account controls. */
export default async function AccountPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const deletion = await getAccountDeletionStatus(supabase);

  return (
    <AccountClient
      userEmail={user.email ?? ""}
      initialDeletion={deletion}
    />
  );
}
