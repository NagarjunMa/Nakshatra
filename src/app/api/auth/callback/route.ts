import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
              console.error("Portfolio creation failed:", insertError);
            }
          }
        } catch (err) {
          console.error("Portfolio check/create error:", err);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
