import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCanonicalAppUrl, sanitizeInternalRedirect } from "@/lib/security/redirect";
import { getRequestId, logServerError } from "@/lib/security/logging";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeInternalRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          const { data: existing } = await supabase
            .from("portfolios")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (!existing) {
            const { error: insertError } = await supabase
              .from("portfolios")
              .insert({
                user_id: user.id,
                draft_data: {
                  personal: {
                    name: "",
                    dob: "",
                    gender: "male",
                  },
                },
              });

            if (insertError) {
              logServerError("auth.portfolio.bootstrap_failed", requestId, insertError);
            }
          }
        } catch (err) {
          logServerError("auth.portfolio.bootstrap_failed", requestId, err);
        }
      }

      return NextResponse.redirect(createCanonicalAppUrl(next, request.url));
    }
  }

  logServerError("auth.callback.failed", requestId);
  return NextResponse.redirect(createCanonicalAppUrl("/login?error=auth_failed", request.url));
}
