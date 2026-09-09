import { NextResponse } from "next/server";
import {
  completeAccountDeletionReauth,
} from "@/features/account/server/account.service";
import { completeBrokerdeskReauth } from "@/features/organization-access/server/brokerdesk-reauth.service";
import {
  brokerdeskReauthCookieNames,
  clearBrokerdeskReauthTransactionCookie,
  createBrokerdeskProof,
  createBrokerdeskProofCookie,
  hashBrokerdeskProof,
  readBrokerdeskReauthTransactionCookie,
} from "@/features/organization-access/server/brokerdesk-reauth-cookie";
import {
  clearReauthTransactionCookie,
  createDeletionProof,
  createDeletionProofCookie,
  hashDeletionProof,
  readReauthTransactionCookie,
  readRequestCookie,
  deletionReauthCookieNames,
} from "@/features/account/server/reauth-cookie";
import { createClient } from "@/lib/supabase/server";
import { createCanonicalAppUrl, isBrokerdeskAuthRedirect, sanitizeInternalRedirect } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";
import { ensureOwnerPortfolio } from "@/features/auth/server/portfolio-bootstrap";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const reauth = searchParams.get("reauth");
  const next = sanitizeInternalRedirect(searchParams.get("next"));
  const deletionTransaction = reauth === "account_deletion"
    ? readReauthTransactionCookie(readRequestCookie(request, deletionReauthCookieNames.transaction))
    : null;
  const brokerdeskTransaction = reauth === "brokerdesk_action"
    ? readBrokerdeskReauthTransactionCookie(readRequestCookie(request, brokerdeskReauthCookieNames.transaction))
    : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (reauth === "account_deletion" && !deletionTransaction) {
        const response = NextResponse.redirect(createCanonicalAppUrl("/account?reauth=failed", request.url));
        response.headers.set("Cache-Control", "private, no-store");
        response.cookies.set(clearReauthTransactionCookie());
        return response;
      }

      if (reauth === "brokerdesk_action" && !brokerdeskTransaction) {
        const response = NextResponse.redirect(createCanonicalAppUrl("/brokerdesk?reauth=failed", request.url));
        response.headers.set("Cache-Control", "private, no-store");
        response.cookies.set(clearBrokerdeskReauthTransactionCookie());
        return response;
      }

      if (deletionTransaction) {
        const response = NextResponse.redirect(createCanonicalAppUrl("/account?reauth=failed", request.url));
        response.headers.set("Cache-Control", "private, no-store");
        response.cookies.set(clearReauthTransactionCookie());
        if (!user) return response;

        try {
          const proof = createDeletionProof();
          const outcome = await completeAccountDeletionReauth(
            supabase,
            deletionTransaction.challengeId,
            hashDeletionProof(proof)
          );
          if (outcome !== "verified") return response;
          response.headers.set("Location", createCanonicalAppUrl("/account?reauth=complete", request.url));
          response.cookies.set(createDeletionProofCookie(deletionTransaction.challengeId, proof));
          return response;
        } catch (error) {
          logServerError("account.deletion_reauth.callback_failed", requestId, error);
          return response;
        }
      }

      if (brokerdeskTransaction) {
        const failedPath = brokerdeskTransaction.purpose === "verification_manage"
          ? "/brokerdesk/onboarding?reauth=failed"
          : `/brokerdesk/w/${brokerdeskTransaction.workspaceRef}/settings/team?reauth=failed`;
        const completePath = brokerdeskTransaction.purpose === "verification_manage"
          ? "/brokerdesk/onboarding?reauth=complete"
          : `/brokerdesk/w/${brokerdeskTransaction.workspaceRef}/settings/team?reauth=complete`;
        const response = NextResponse.redirect(createCanonicalAppUrl(failedPath, request.url));
        response.headers.set("Cache-Control", "private, no-store");
        response.cookies.set(clearBrokerdeskReauthTransactionCookie());
        if (!user) return response;

        try {
          const proof = createBrokerdeskProof();
          const outcome = await completeBrokerdeskReauth(
            supabase,
            brokerdeskTransaction.challengeId,
            hashBrokerdeskProof(proof)
          );
          if (outcome !== "verified") return response;
          response.headers.set("Location", createCanonicalAppUrl(completePath, request.url));
          response.cookies.set(createBrokerdeskProofCookie({
            challengeId: brokerdeskTransaction.challengeId,
            workspaceRef: brokerdeskTransaction.workspaceRef,
            purpose: brokerdeskTransaction.purpose,
            proof,
          }));
          return response;
        } catch (error) {
          logServerError("brokerdesk.reauth.callback_failed", requestId, error);
          return response;
        }
      }

      if (user && !isBrokerdeskAuthRedirect(next)) {
        try {
          await ensureOwnerPortfolio(supabase, user.id);
        } catch (err) {
          logServerError("auth.portfolio.bootstrap_failed", requestId, err);
        }
      }

      const response = NextResponse.redirect(createCanonicalAppUrl(next, request.url));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  logServerError("auth.callback.failed", requestId);
  const response = NextResponse.redirect(createCanonicalAppUrl("/login?error=auth_failed", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
