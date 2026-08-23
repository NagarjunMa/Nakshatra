import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.generated";

/** Matches one application route without accidentally matching sibling names such as `/dashboard-old`. */
function isPathWithin(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const protectedPaths = ["/dashboard", "/account", "/edit", "/preview"];
  const authPaths = ["/login", "/signup"];
  const isProtected = protectedPaths.some((path) => isPathWithin(request.nextUrl.pathname, path));
  const isAuthPage = authPaths.some((path) => isPathWithin(request.nextUrl.pathname, path));

  const { data: authData } = await supabase.auth.getClaims();
  let isAuthenticated = Boolean(authData?.claims?.sub);
  if (isAuthenticated && (isProtected || isAuthPage)) {
    const { data, error } = await supabase.rpc("is_current_session_active");
    isAuthenticated = !error && data === true;
  }

  // Protected routes redirect unless both the JWT and its backing session are valid.
  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
