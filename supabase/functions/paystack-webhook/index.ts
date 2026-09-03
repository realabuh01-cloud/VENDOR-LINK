// ─────────────────────────────────────────────────────────────────────────────
// VendorLink — Paystack webhook handler (Supabase Edge Function, Deno)
//
// Deploy:
//   supabase functions deploy paystack-webhook
//   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
//   supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   supabase secrets set EXPECTED_PLAN_CODE=PLN_xxx   (optional hardening)
//
// Paystack dashboard → Developers → Webhooks → set URL to:
//   https://<project-ref>.supabase.co/functions/v1/paystack-webhook
//
// Events handled:
//   • charge.success         — Premium subscription charges (platform plan)
//                              AND vendor order payments (metadata.order_id)
//   • subscription.disable   — downgrade the vendor to the free plan
//
// SECURITY: the Paystack secret key lives ONLY in this function's secrets.
// It is never exposed to the browser. The signature is verified on every
// request. Subscription activation additionally requires the charged plan to
// match EXPECTED_PLAN_CODE (when set).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPECTED_PLAN_CODE = Deno.env.get("EXPECTED_PLAN_CODE"); // optional

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  // ── 1. Signature verification (HMAC SHA-512 of the raw body) ─────────────
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) {
    return json({ status: false, message: "Missing signature" }, 401);
  }

  const rawBody = await req.text();
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return json({ status: false, message: "Invalid signature" }, 401);
    }
  } catch {
    return json({ status: false, message: "Invalid signature" }, 401);
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: Record<string, unknown>;
  };

  console.log(`Webhook received: ${event.event}`);

  try {
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data ?? {});
        break;
      case "subscription.disable":
        await handleSubscriptionDisable(event.data ?? {});
        break;
      default:
        console.log(`Ignoring event: ${event.event}`);
    }
  } catch (err) {
    // Return 200 anyway so Paystack doesn't retry events we've logged & skipped.
    console.error("Webhook processing error:", err);
  }

  return json({ status: true });
});

// ─── charge.success ─────────────────────────────────────────────────────────
// Two distinct flows ride this event:
//   1. Premium subscription charges (metadata.sub_user_id)
//   2. Vendor order payments (metadata.order_id + metadata.store_id)
async function handleChargeSuccess(data: Record<string, unknown>) {
  const status = String(data.status ?? "");
  const reference = String(data.reference ?? "");
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const amount = Number(data.amount ?? 0); // kobo

  if (status !== "success") return;

  // ── Flow 1: platform subscription charge ────────────────────────────────
  if (metadata.sub_user_id) {
    const planCode = getPlanCode(data);
    if (EXPECTED_PLAN_CODE && planCode && planCode !== EXPECTED_PLAN_CODE) {
      console.warn(`Rejected subscription charge ${reference}: plan ${planCode} ≠ ${EXPECTED_PLAN_CODE}`);
      return;
    }
    if (EXPECTED_PLAN_CODE && !planCode) {
      console.warn(`Rejected subscription charge ${reference}: no plan attached`);
      return;
    }
    if (amount < 10_000 * 100) {
      console.warn(`Rejected subscription charge ${reference}: amount ${amount}k too low`);
      return;
    }
    await activatePremium(
      String(metadata.sub_user_id),
      getSubscriptionCode(data),
      planCode,
    );
    return;
  }

  // ── Flow 2: vendor order payment ─────────────────────────────────────────
  if (metadata.order_id) {
    await markOrderPaid(
      String(metadata.order_id),
      String(metadata.store_id ?? ""),
      reference,
    );
    return;
  }

  console.log(`Ignoring charge ${reference}: no recognized metadata`);
}

function getPlanCode(data: Record<string, unknown>): string | null {
  const plan = data.plan as Record<string, unknown> | undefined;
  if (plan && plan.plan_code) return String(plan.plan_code);
  const obj = data.plan_object as Record<string, unknown> | undefined;
  if (obj && obj.plan_code) return String(obj.plan_code);
  return null;
}

function getSubscriptionCode(data: Record<string, unknown>): string | null {
  const sub = data.subscription as Record<string, unknown> | undefined;
  if (sub && sub.subscription_code) return String(sub.subscription_code);
  if (data.subscription_code) return String(data.subscription_code);
  return null;
}

/** Upsert an active subscription + flip the vendor's store to Premium. */
async function activatePremium(userId: string, subCode: string | null, planCode: string | null) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  // Upsert by subscription code when present.
  if (subCode) {
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("paystack_subscription_code", subCode)
      .maybeSingle();

    if (existing) {
      await admin
        .from("subscriptions")
        .update({
          status: "active",
          plan_code: planCode,
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("subscriptions").insert({
        user_id: userId,
        paystack_subscription_code: subCode,
        plan_code: planCode,
        current_period_end: periodEnd.toISOString(),
        status: "active",
      });
    }
  } else {
    await admin.from("subscriptions").insert({
      user_id: userId,
      paystack_subscription_code: null,
      plan_code: planCode,
      current_period_end: periodEnd.toISOString(),
      status: "active",
    });
  }

  // Flip the store to Premium.
  const { error } = await admin
    .from("stores")
    .update({ is_premium: true, subscription_status: "active" })
    .eq("user_id", userId);

  if (error) console.error("activatePremium store update failed:", error.message);
  console.log(`Premium activated for user ${userId}`);
}

/** Confirm a vendor order payment (idempotent for pending orders). */
async function markOrderPaid(orderId: string, storeId: string, reference: string) {
  const { error } = await admin
    .from("orders")
    .update({ status: "paid", paystack_reference: reference })
    .eq("id", orderId)
    .eq("store_id", storeId)
    .eq("status", "pending");

  if (error) console.error("markOrderPaid failed:", error.message);
  else console.log(`Order ${orderId} marked paid (${reference})`);
}

// ─── subscription.disable ───────────────────────────────────────────────────
// Fired when the vendor cancels, or a renewal fails after retries.
// Downgrade the store to the free plan (product/order limits re-apply).
async function handleSubscriptionDisable(data: Record<string, unknown>) {
  const subCode = String(data.subscription_code ?? data.code ?? "");

  if (subCode) {
    await admin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("paystack_subscription_code", subCode);

    const { data: sub } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("paystack_subscription_code", subCode)
      .maybeSingle();

    if (sub?.user_id) {
      await admin
        .from("stores")
        .update({ is_premium: false, subscription_status: "cancelled" })
        .eq("user_id", sub.user_id);
      console.log(`Premium disabled for user ${sub.user_id}`);
    }
    return;
  }

  // Fallback: Paystack also sends customer info on disable events.
  const customer = data.customer as Record<string, unknown> | undefined;
  const customerCode = customer ? String(customer.customer_code ?? "") : "";
  if (customerCode) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, user_id")
      .eq("paystack_subscription_code", customerCode)
      .maybeSingle();

    if (sub) {
      await admin
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", sub.id);
      await admin
        .from("stores")
        .update({ is_premium: false, subscription_status: "cancelled" })
        .eq("user_id", sub.user_id);
      console.log(`Premium disabled for user ${sub.user_id}`);
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
