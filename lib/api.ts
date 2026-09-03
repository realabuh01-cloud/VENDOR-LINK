"use client";

/**
 * Data-access layer for client components — Supabase only.
 * Limits are enforced server-side with RLS + SECURITY DEFINER functions.
 */
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type {
  CustomerDetails,
  Order,
  OrderRow,
  OrderStatus,
  PaymentMethod,
  Product,
  Session,
  Store,
} from "@/lib/types";
import { friendlyError } from "@/lib/utils";

/** Normalise any thrown error into a friendly Error. */
function toError(e: unknown): Error {
  if (e instanceof Error) return new Error(friendlyError(e.message));
  return new Error("Something went wrong. Please try again.");
}

/* ─────────────────────────────── AUTH ────────────────────────────────── */

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await getSupabaseBrowser().auth.getSession();
  const u = session?.user;
  if (!u) return null;
  return {
    user: {
      id: u.id,
      email: u.email ?? "",
      full_name: (u.user_metadata?.full_name as string) ?? null,
      phone: (u.user_metadata?.phone as string) ?? null,
    },
  };
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) throw toError(error);
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  store_name: string;
}): Promise<void> {
  const supabase = getSupabaseBrowser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    // user_metadata → the handle_new_user trigger creates profile + store.
    options: {
      data: {
        full_name: input.full_name,
        phone: input.phone,
        store_name: input.store_name,
      },
      emailRedirectTo: `${appUrl}/dashboard`,
    },
  });
  if (error) throw toError(error);
}

export async function sendMagicLink(email: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  const { error } = await getSupabaseBrowser().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/dashboard` },
  });
  if (error) throw toError(error);
}

export async function signOutUser(): Promise<void> {
  await getSupabaseBrowser().auth.signOut();
}

/* ─────────────────────────────── STORES ──────────────────────────────── */

function mapStoreRow(r: Record<string, unknown>): Store {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    slug: String(r.slug),
    name: String(r.name),
    logo_url: (r.logo_url as string | null) ?? null,
    whatsapp_number: (r.whatsapp_number as string | null) ?? null,
    is_premium: Boolean(r.is_premium),
    subscription_status: (r.subscription_status as Store["subscription_status"]) ?? "none",
    paystack_public_key: (r.paystack_public_key as string | null) ?? null,
    is_active: Boolean(r.is_active),
    created_at: String(r.created_at),
  };
}

export async function getMyStore(): Promise<Store | null> {
  const supabase = getSupabaseBrowser();

  // Always scope to the signed-in user. Querying without a filter would
  // return EVERY active store (RLS allows public reads), and .single()
  // throws "multiple rows returned" (PGRST116) the moment more than one
  // store exists on the platform — which blanked the dashboard for all
  // vendors. Filtering by user_id (unique on stores) guarantees exactly
  // one row or none.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return null; // e.g. signup trigger hasn't created the store yet
  return mapStoreRow(data as unknown as Record<string, unknown>);
}

export async function updateStore(
  storeId: string,
  patch: Partial<Pick<Store, "name" | "slug" | "whatsapp_number" | "paystack_public_key" | "is_active" | "logo_url">>,
): Promise<Store> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("stores")
    .update(patch)
    .eq("id", storeId)
    .select("*")
    .single();
  if (error) throw toError(error);
  return mapStoreRow(data as unknown as Record<string, unknown>);
}

/* ────────────────────────────── PRODUCTS ─────────────────────────────── */

function mapProductRow(r: Record<string, unknown>): Product {
  return {
    id: String(r.id),
    store_id: String(r.store_id),
    name: String(r.name),
    price: Number(r.price ?? 0),
    description: (r.description as string | null) ?? null,
    image_path: (r.image_path as string | null) ?? null,
    stock_count: Number(r.stock_count ?? 0),
    created_at: String(r.created_at),
  };
}

export async function listMyProducts(storeId: string): Promise<Product[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw toError(error);
  return (data ?? []).map((r) => mapProductRow(r as unknown as Record<string, unknown>));
}

export async function createProduct(
  storeId: string,
  input: { name: string; price: number; description?: string | null; image_path?: string | null; stock_count: number },
): Promise<Product> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      name: input.name,
      price: Math.round(input.price),
      description: input.description ?? null,
      image_path: input.image_path ?? null,
      stock_count: Math.max(0, Math.round(input.stock_count)),
    })
    .select("*")
    .single();
  if (error) throw toError(error); // "FREE_LIMIT:…" raised by the DB trigger
  return mapProductRow(data as unknown as Record<string, unknown>);
}

export async function updateProduct(
  productId: string,
  patch: Partial<Pick<Product, "name" | "price" | "description" | "image_path" | "stock_count">>,
): Promise<Product> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .single();
  if (error) throw toError(error);
  return mapProductRow(data as unknown as Record<string, unknown>);
}

export async function deleteProduct(productId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw toError(error);
}

/** Public storefront helper: fetch a store's products (anon RLS read). */
export async function fetchStoreProducts(storeId: string): Promise<Product[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw toError(error);
  return (data ?? []).map((r) => mapProductRow(r as unknown as Record<string, unknown>));
}

/* ─────────────────────────────── ORDERS ──────────────────────────────── */

function mapOrderRow(r: Record<string, unknown>): OrderRow {
  return {
    id: String(r.id),
    store_id: String(r.store_id),
    customer_details: (r.customer_details ?? {
      name: "",
      phone: "",
      email: null,
      city: null,
      address: null,
      note: null,
    }) as CustomerDetails,
    items: (r.items ?? []) as Order["items"],
    total_amount: Number(r.total_amount ?? 0),
    status: (r.status as OrderStatus) ?? "pending",
    payment_method: (r.payment_method as PaymentMethod) ?? "whatsapp",
    paystack_reference: (r.paystack_reference as string | null) ?? null,
    created_at: String(r.created_at),
  };
}

export async function listMyOrders(storeId: string): Promise<OrderRow[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw toError(error);
  return (data ?? []).map((r) => mapOrderRow(r as unknown as Record<string, unknown>));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw toError(error);
}
