import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";

/**
 * Root middleware.
 *
 * 1) Keeps the Supabase auth session fresh (cookie refresh pattern from the
 *    official Supabase + Next.js guide).
 * 2) Protects /dashboard — unauthenticated visitors bounce to /login.
 *
 * NOTE ON FREE-TIER ORDER LIMITS: orders are unlimited for every store.
 * The 20-product cap is enforced where products are created — inside the
 * enforce_product_limit trigger (SECURITY DEFINER, unforgeable). Edge
 * middleware cannot count rows without a database round-trip, so enforcing
 * there would be cosmetic security theater. The trigger is the real
 * enforcement point and cannot be bypassed by any client.
 */
export async function middleware(request: NextRequest) {
  // Supabase not configured yet → data pages render a "Setup required" screen.
  if (!isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Refresh the session (cheap; keeps the access token valid).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect the vendor dashboard.
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users don't need the auth pages.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run everywhere except static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
