import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getApiUser } from "@/lib/auth";

export const metadata = {
  title: "Create account · Nakshatra",
  description: "Start building your digital wedding portfolio.",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const auth = await getApiUser();
  if (auth.status === "authenticated") redirect("/dashboard");

  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
