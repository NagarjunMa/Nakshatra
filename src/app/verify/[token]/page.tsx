import type { Metadata } from "next";
import { VerificationLinkClient } from "./verification-link-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Identity verification · Nakshatra",
  robots: { index: false, follow: false },
};

/** The opaque path token is only used by the client to call no-store APIs and never identifies a candidate in rendered content. */
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <VerificationLinkClient token={token} />;
}
