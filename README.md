# VendorLink 🛍️

**Multi-tenant e-commerce for Nigerian vendors — instant storefronts, 100% free.**

| | |
|---|---|
| **Business model** | **Free plan:** every store is free — 20 products, unlimited orders, WhatsApp + Paystack checkout. **Premium (₦2,000/mo):** unlimited products per store. Custom sites and custom payment setups are quote-based (vendors contact us). |
| **Stack** | Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style UI · Supabase (Postgres, Auth, Storage, Edge Functions) · Paystack (Inline) · Vercel |
| **Cost** | ₦0 — every service runs on its free tier. |
| **Mobile-first** | 90% of traffic is mobile; every screen is designed phone-first. |

---

## Features

### Buyers (public storefront)
- `/store/[slug]` — products grid with photos, prices and stock.
- **"Pay now"** via **Paystack Inline** (card, bank, USSD — money goes straight to the *vendor's* Paystack account) for every store that has added its public key.
- **"Order via WhatsApp"** with the message *"Hi, I want to buy [Product] for [Price]"* — always available.
- Cart + quantity controls, customer details at checkout, live order-status page that polls for webhook confirmation.

### Vendors (dashboard)
- **Auth:** Supabase email/password + magic link; signup auto-creates the `profiles` row and a default `stores` row (DB trigger).
- **Products:** full CRUD with **real device photos** — validated (JPG/PNG/WebP, ≤ 2MB), **compressed client-side with `browser-image-compression` to < 500KB *before* upload**, stored in the public `product-images` bucket as `<storeId>/<uuid>.<ext>`; `products.image_path` keeps the **relative path** (no external URLs).
- **Orders:** incoming orders with customer details, WhatsApp chat links, status workflow (pending → paid / delivered / cancelled).
- **Settings:** store name/link, WhatsApp number, **Paystack public key** (public keys only — secret keys are rejected with a warning), logo upload, visibility toggle.

### Security & multi-tenancy
- Strict **RLS on every table** — vendors can only touch rows tied to `auth.uid()`; customers only see active stores.
- **No Paystack secret keys anywhere in the app** — the secret lives only inside the webhook Edge Function; only vendor **public** keys are stored for checkout.
- Prices/totals are computed **server-side** (`create_order` RPC); the client is never trusted.

### Limits (enforced in the DB, not just the UI)
- **20 products** per store (Postgres trigger)
- **Unlimited orders** (no monthly cap)

> The numbers live in `lib/config.ts` (`PRODUCT_LIMIT`) — change it there and in `0001_init.sql` to adjust.

### Premium (₦2,000/month)
Premium lifts the 20-product cap. The schema already has `stores.is_premium`, `stores.subscription_status`, and the `subscriptions` table, and the webhook includes the subscription handlers (`charge.success` / `subscription.disable`). To turn Premium on, you would:
1. Re-add a subscription page (git history has the previous `subscription-card.tsx`) and set the plan price to ₦2,000/month.
2. Re-add the platform Paystack env vars.
3. Gate the product trigger (`enforce_product_limit`) on `is_premium`, so premium stores skip the 20-product check.
4. Keep `PRODUCT_LIMIT` at 20 in `lib/config.ts` and the migration for free stores. Premium stores bypass this check.

---

## Project structure

```
app/
  (auth)/login, signup        Auth pages (password + magic link)
  store/[slug]/               Public storefront (Server Component + client store view)
  store/[slug]/success        Order-status polling page
  dashboard/                  Overview, products, orders, settings
  dashboard/api/upload/       Server route → Supabase Storage (service role)
components/
  dashboard/                  Shell, product form/table, orders, settings
  storefront/                 Store view, cart drawer, checkout modal
  image-uploader.tsx          Validate → compress (browser-image-compression) → upload
  paystack-inline.tsx         v2 inline loader (any public key)
  setup-required.tsx          Friendly screen while env vars are missing
lib/
  config.ts                   Product limit, env detection (SINGLE SOURCE OF TRUTH)
  api.ts                      Client data layer (Supabase)
  orders.ts                   Checkout service (create/confirm/status/WhatsApp)
  supabase/                   Browser/server clients, RLS-safe public queries
supabase/
  migrations/0001_init.sql    Schema, RLS, triggers, RPCs, storage bucket/policies
  functions/paystack-webhook/ Edge function (order confirmations; dormant subscription handlers)
```

---

## Phase-by-phase deployment guide

### Phase 1 — Supabase (free tier)
1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/migrations/0001_init.sql` (re-runnable). This creates:
   - Tables `profiles`, `stores`, `products`, `orders`, `subscriptions`
   - The public **`product-images`** storage bucket
   - RLS policies, the signup trigger (profile + store), the 20-product trigger, and the `create_order` / `confirm_order_payment` / `get_order_status` RPCs
3. **Authentication → Providers → Email**: enable *Email*. For magic links, turn off *"Confirm email"* (or keep it on and ask users to verify).
4. Copy `Project Settings → API` → **URL** + **anon key** into `.env.local`.

### Phase 2 — Paystack (per-vendor checkout)
- The platform needs no Paystack account for billing anymore (free mode).
- Each **vendor** creates their own Paystack account and pastes their **public key** into Dashboard → Settings. Card payments land in the vendor's account.

### Phase 3 — Webhook (Edge Function)
Still required so vendor order payments are confirmed server-side:
```bash
supabase login
supabase functions deploy paystack-webhook
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
supabase secrets set SUPABASE_URL=https://xxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
In Paystack **Settings → API Keys & Webhooks**, point the webhook at
`https://<project-ref>.supabase.co/functions/v1/paystack-webhook`
(event: `charge.success`; `subscription.disable` is dormant until monetization returns).

### Phase 4 — Vercel (free tier)
1. Push this repo to GitHub → **Import** in Vercel.
2. Add the env vars from `.env.example` (Vercel env settings).
3. Deploy. Done — vendors sign up and get `/store/<slug>` instantly.

### Phase 5 — Go live checklist
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain (magic-link redirects)
- [ ] SMTP (e.g. Resend) connected for signup confirmation emails — see `EMAIL-SETUP.md`
- [ ] Test: signup → store auto-created → add products → order via WhatsApp → card payment with a vendor key

---

## Running locally

```bash
npm install
npm run dev        # pages needing data show the "Setup required" screen until env vars exist
```

With `.env.local` filled in, the app runs against real Supabase (`npm run build && npm run start` for production mode).

### Env vars (`NEXT_PUBLIC_*` = safe for the browser)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — image-upload route |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |

**Secret keys never appear in this repo** — `PAYSTACK_SECRET_KEY` exists only as a secret on the Edge Function.

---

## Security decisions worth knowing

1. **Orders are created *before* payment** — stock is reserved server-side, totals are DB-computed. The client-side `onSuccess` is optimistic; the **webhook is the source of truth**.
2. **Vendor payments go to the vendor** — the checkout uses the *vendor's* public key from their `stores` row.
3. Middleware handles session refresh + dashboard auth. The product cap lives in the DB trigger (not edge middleware) — counting rows per request at the edge would be theater, not security.
