import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getApiUser } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/security/redirect";

export const metadata = {
  title: "Sign in · Nakshatra",
  description: "Sign in to continue building your digital wedding portfolio.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
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
      <AuthForm mode="login" />
    </Suspense>
  );
}
