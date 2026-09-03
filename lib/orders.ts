"use client";

/**
 * Checkout service — order creation + payment confirmation (Supabase).
 *
 * Orders are created via the `create_order` SECURITY DEFINER RPC, which
 * validates stock, computes the total server-side and enforces the free-plan
 * monthly order cap (10). Payment confirmation flows through the Paystack
 * webhook (`charge.success`); the client-side onSuccess callback is only a
 * fast optimistic path — the webhook is the source of truth.
 */
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { CustomerDetails, OrderStatus, PaymentMethod } from "@/lib/types";
import { friendlyError } from "@/lib/utils";

export interface CreateOrderInput {
  storeId: string;
  items: { product_id: string; qty: number }[];
  customer: CustomerDetails;
  method: PaymentMethod;
}

/** Create a (pending) order and reserve stock. */
export async function createOrder(
  input: CreateOrderInput,
): Promise<{ order_id: string; total_amount: number }> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc("create_order", {
    p_store_id: input.storeId,
    p_items: input.items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
    p_customer: input.customer,
    p_method: input.method,
  });
  if (error) throw new Error(friendlyError(error.message));
  return data as { order_id: string; total_amount: number };
}

/** Confirm a Paystack payment for an existing pending order. */
export async function confirmOrderPayment(
  orderId: string,
  reference: string,
  storeId: string,
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.rpc("confirm_order_payment", {
    p_order_id: orderId,
    p_reference: reference,
    p_store_id: storeId,
  });
  if (error) throw new Error(friendlyError(error.message));
}

/** Poll order status (used by the success page to wait for webhook confirmation). */
export async function getOrderStatus(orderId: string): Promise<OrderStatus | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.rpc("get_order_status", { p_order_id: orderId });
  if (error) return null;
  return (data as OrderStatus | null) ?? null;
}

/**
 * Build a wa.me deep link. Message format required by the spec:
 * "Hi, I want to buy [Product] for [Price]".
 */
export function buildWhatsAppOrderUrl(
  whatsappNumber: string | null,
  message: string,
): string | null {
  if (!whatsappNumber) return null;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Compose the WhatsApp message for a cart. */
export function buildWhatsAppMessage(
  storeName: string,
  orderId: string,
  lines: { name: string; price: number; qty: number }[],
  total: number,
  customer: CustomerDetails,
): string {
  const items = lines
    .map((l) => `• ${l.name} (x${l.qty}) — ₦${l.price.toLocaleString()}`)
    .join("\n");
  return [
    `Hi ${storeName}! I want to place an order from your VendorLink store.`,
    ``,
    items,
    ``,
    `Total: ₦${total.toLocaleString()}`,
    `Name: ${customer.name}`,
    customer.address ? `Delivery address: ${customer.address}${customer.city ? `, ${customer.city}` : ""}` : `Location: ${customer.city ?? "—"}`,
    customer.note ? `Note: ${customer.note}` : "",
    ``,
    `Order ID: ${orderId}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** Single-item shortcut message: "Hi, I want to buy [Product] for [Price]". */
export function buildSingleProductMessage(
  storeName: string,
  productName: string,
  price: number,
): string {
  return `Hi ${storeName}, I want to buy ${productName} for ₦${price.toLocaleString()}. Is it still available?`;
}
