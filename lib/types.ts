/**
 * VendorLink — shared TypeScript types.
 * These mirror the Supabase schema (supabase/migrations/0001_init.sql).
 */

/** Plan lifecycle status stored on each store row. */
export type PlanStatus = "none" | "active" | "past_due" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  /** Logo image (Supabase Storage URL). */
  logo_url: string | null;
  /** Vendor's WhatsApp number in international digits (23480…). */
  whatsapp_number: string | null;
  is_premium: boolean;
  subscription_status: PlanStatus;
  /** Vendor's Paystack PUBLIC key — used client-side for Inline checkout. NEVER a secret key. */
  paystack_public_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  /** Price in Naira. */
  price: number;
  description: string | null;
  /**
   * RELATIVE path inside the `product-images` Storage bucket
   * (e.g. "store-uuid/9f3c….jpg") — never an external URL. The public URL is
   * derived at render time via productImageUrl().
   */
  image_path: string | null;
  stock_count: number;
  created_at: string;
}

export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled";
export type PaymentMethod = "whatsapp" | "paystack";

/** Customer details captured at checkout (stored as orders.customer_details JSONB). */
export interface CustomerDetails {
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  note: string | null;
}

export interface OrderItem {
  product_id: string;
  name: string;
  /** Price snapshot in Naira at the moment of purchase. */
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  store_id: string;
  customer_details: CustomerDetails;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  paystack_reference: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  paystack_subscription_code: string | null;
  plan_code: string | null;
  current_period_end: string | null;
  status: "active" | "cancelled" | "expired";
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
}

export interface Session {
  user: SessionUser;
}

/** An item sitting in a shopper's cart (product + chosen quantity). */
export interface CartItem {
  product: Product;
  qty: number;
}

/** Plain JSON order row as returned by the Supabase RPC (items are embedded). */
export interface OrderRow {
  id: string;
  store_id: string;
  customer_details: CustomerDetails;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  paystack_reference: string | null;
  created_at: string;
}
