import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.generated";

/** Matches one application route without matching sibling names such as `/dashboard-old`. */
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

  // Proxy performs only the optimistic token-presence check. Authoritative
  // live-session validation occurs in server pages, APIs, RLS, and Storage.
  const protectedPaths = ["/dashboard", "/preview", "/approved-preview", "/account", "/edit"];
  const isProtected = protectedPaths.some((path) => isPathWithin(request.nextUrl.pathname, path));
  const { data: authData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(authData?.claims?.sub);

  // Protected routes redirect when no usable token is present. The destination
  // performs the authoritative backing-session check before reading private data.
  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
