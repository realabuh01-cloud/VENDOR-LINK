/**
 * VendorLink — platform-wide configuration.
 *
 * ⚠️ PRODUCT LIMIT — single source of truth for the app.
 * The same number is enforced database-side in:
 *   • supabase/migrations/0001_init.sql (product trigger)
 * Update BOTH places if you change it.
 *
 * NOTE ON MONETIZATION: VendorLink is currently 100% FREE for all stores
 * (growth phase). The `is_premium` / `subscriptions` tables and the webhook
 * handling for them are retained in the schema but unused, so monetization
 * can be switched back on later without a migration.
 */
export const PRODUCT_LIMIT = 20; // Max products per store (all stores)
export const MAX_ORDERS = Infinity; // Orders are unlimited for every store

export const APP_NAME = "VendorLink";
export const APP_TAGLINE = "Your online store, live in minutes.";
/** Build tag — shown on /login and /signup so you can instantly verify
 *  the deployed bundle is the latest one. */
export const APP_VERSION = "1.1.0";

/**
 * True when the Supabase env vars are present. The app requires Supabase —
 * pages that need data show a friendly "Setup required" screen until the
 * credentials from .env.example are provided.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Supabase project URL (public — safe anywhere). */
export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}
