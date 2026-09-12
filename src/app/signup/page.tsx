import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getApiUser } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/security/redirect";

export const metadata = {
  title: "Pilot access · Nakshatra",
  description: "Create a Nakshatra portfolio with your private-beta invitation.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<{ redirect?: string | string[] }>;
} = {}) {
  const auth = await getApiUser();
  const requested = (await searchParams).redirect;
  const destination = sanitizeInternalRedirect(typeof requested === "string" ? requested : undefined);
  if (auth.status === "authenticated") redirect(destination);

  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
