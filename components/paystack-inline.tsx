"use client";

/**
 * Paystack Inline (v2) — loads https://js.paystack.co/v2/inline.js once and
 * opens the checkout popup on demand.
 *
 * SECURITY: every call site passes an explicit PUBLIC key — the vendor's
 * own key for store checkouts. The secret key never appears anywhere in
 * this app.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    PaystackPop?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPaystackScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow retry
      reject(new Error("Could not load Paystack. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface PaystackCheckoutOptions {
  key: string;
  email: string;
  amount: number; // Naira
  reference: string;
  currency?: string;
  /** Plan code — subscriptions open the plan embed instead of an amount form. */
  plan?: string;
  channels?: string[];
  metadata?: Record<string, string>;
  label?: string;
  onSuccess?: (reference: string) => void;
  onClose?: () => void;
  onError?: (message: string) => void;
}

/** Open the Paystack Inline popup. Resolves once the popup closes. */
export async function openPaystackCheckout(opts: PaystackCheckoutOptions): Promise<void> {
  try {
    await loadPaystackScript();
  } catch (e) {
    opts.onError?.(e instanceof Error ? e.message : "Could not load Paystack.");
    return;
  }

  const handler = window.PaystackPop.setup({
    key: opts.key,
    email: opts.email,
    amount: opts.amount * 100, // kobo
    currency: opts.currency ?? "NGN",
    ref: opts.reference,
    plan: opts.plan,
    channels: opts.channels,
    metadata: { ...opts.metadata, platform: "vendorlink" },
    label: opts.label,
    callback: (response: { reference?: string }) => {
      if (response?.reference) {
        opts.onSuccess?.(response.reference);
      } else {
        opts.onError?.("Payment response was missing a reference. Contact support.");
      }
    },
    onclose: () => opts.onClose?.(),
  });

  try {
    handler.openIframe();
  } catch {
    opts.onError?.("Could not open the payment popup. Please try again.");
  }
}

/** Random reference helper (readable prefix for the Paystack dashboard). */
export function orderReference(orderId: string): string {
  return `VL-ORD-${orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
}
