import type { Metadata } from "next";
import { getAccountDeletionStatus } from "@/features/account/server/account.service";
import { getAuthenticatedUser } from "@/lib/auth";
import AccountClient from "./account-client";

export const metadata: Metadata = {
  title: "Account and Privacy",
};

/** Loads only the signed-in user's deletion status before rendering account controls. */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const deletion = await getAccountDeletionStatus(supabase);
  const query = await searchParams;

  return (
    <AccountClient
      userEmail={user.email ?? ""}
      initialDeletion={deletion}
      reauthComplete={query.reauth === "complete"}
    />
  );
}

