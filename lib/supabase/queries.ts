import "server-only";

/**
 * Server-only queries for public, SEO-friendly pages (the storefront).
 * RLS guarantees we can only ever read ACTIVE stores here.
 */
import type { CustomerDetails, Product, Store } from "@/lib/types";
import { getSupabaseServer } from "./server";

/** Map a snake_case DB row to a camelCase app type (numeric → number). */
function mapStore(row: Record<string, unknown>): Store {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    slug: String(row.slug),
    name: String(row.name),
    logo_url: (row.logo_url as string | null) ?? null,
    whatsapp_number: (row.whatsapp_number as string | null) ?? null,
    is_premium: Boolean(row.is_premium),
    subscription_status: (row.subscription_status as Store["subscription_status"]) ?? "none",
    paystack_public_key: (row.paystack_public_key as string | null) ?? null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    name: String(row.name),
    price: Number(row.price ?? 0),
    description: (row.description as string | null) ?? null,
    image_path: (row.image_path as string | null) ?? null,
    stock_count: Number(row.stock_count ?? 0),
    created_at: String(row.created_at),
  };
}

function mapCustomer(row: Record<string, unknown>): CustomerDetails {
  const c = (row.customer_details ?? {}) as Record<string, unknown>;
  return {
    name: String(c.name ?? ""),
    phone: String(c.phone ?? ""),
    email: (c.email as string | null) ?? null,
    city: (c.city as string | null) ?? null,
    address: (c.address as string | null) ?? null,
    note: (c.note as string | null) ?? null,
  };
}

/** Public storefront data — RLS only returns active stores to anon users. */
export async function getPublicStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data ? mapStore(data as unknown as Record<string, unknown>) : null;
}

/** Products for a public storefront. */
export async function getPublicProducts(storeId: string): Promise<Product[]> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => mapProduct(r as unknown as Record<string, unknown>));
}
