import "server-only";

/**
 * Supabase server client — for Server Components, Route Handlers and the
 * root middleware (which passes its own request/response cookies).
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/config";

export function getSupabaseServer() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured — add the env vars from .env.example.");
  }
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    },
  );
}
