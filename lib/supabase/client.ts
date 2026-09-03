"use client";

/**
 * Supabase browser client (singleton). Only created once Supabase env vars
 * are configured — the app shows a setup screen until then.
 */
import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/config";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured — add the env vars from .env.example.");
  }
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
