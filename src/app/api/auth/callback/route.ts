import { NextResponse } from "next/server";
import {
  completeAccountDeletionReauth,
} from "@/features/account/server/account.service";
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
import { createCanonicalAppUrl, sanitizeInternalRedirect } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";
import { ensureOwnerPortfolio } from "@/features/auth/server/portfolio-bootstrap";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeInternalRedirect(searchParams.get("next"));
  const transaction = readReauthTransactionCookie(
    readRequestCookie(request, deletionReauthCookieNames.transaction)
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (transaction) {
        const response = NextResponse.redirect(createCanonicalAppUrl("/account?reauth=failed", request.url));
        response.headers.set("Cache-Control", "private, no-store");
        response.cookies.set(clearReauthTransactionCookie());
        if (!user) return response;

        try {
          const proof = createDeletionProof();
          const outcome = await completeAccountDeletionReauth(
            supabase,
            transaction.challengeId,
            hashDeletionProof(proof)
          );
          if (outcome !== "verified") return response;
          response.headers.set("Location", createCanonicalAppUrl("/account?reauth=complete", request.url));
          response.cookies.set(createDeletionProofCookie(transaction.challengeId, proof));
          return response;
        } catch (error) {
          logServerError("account.deletion_reauth.callback_failed", requestId, error);
          return response;
        }
      }

      if (user && user.user_metadata?.account_type !== "portfolio_viewer") {
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
