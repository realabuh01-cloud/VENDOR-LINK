# Getting your VendorLink environment variables ✅

Follow this checklist top to bottom. Everything is free.

---

## Part 1 — Supabase (3 variables)

1. Go to **https://supabase.com** → sign in with GitHub.
2. Click **New project**:
   - Name: `vendorlink`
   - Database password: anything strong (you'll paste it once for the SQL editor)
   - **Region:** pick the one closest to Nigeria (e.g. **Frankfurt** or **Dublin**)
   - Wait ~2 minutes for the project to provision.
3. Open **Project Settings → API** (left sidebar). You'll see three things:

| What you see | Copy into |
|---|---|
| **Project URL** (https://xxxx.supabase.co) | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public** key (eyJ…) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key (eyJ…) | `SUPABASE_SERVICE_ROLE_KEY` ⚠️ secret — server only |

4. **Create the database schema** (must do this or the app has no tables):
   - Open **SQL Editor** → **New query**
   - Paste the entire contents of `supabase/migrations/0001_init.sql` (in this project)
   - Click **Run**. You should see "Success".
   - This creates all tables, RLS security, the `product-images` storage bucket, and the product limit (20 per store).
5. **Enable email login:**
   - **Authentication → Sign In / Providers → Email** → enable **Email** provider.
   - For magic links: turn OFF **"Confirm email"** so users sign in instantly (or leave it on — new users will just verify first).
6. ⚠️ Free tier note: Supabase pauses projects after **1 week of inactivity** — log in once a week, or any visit to your site wakes it (may take a minute).

---

## Part 2 — Paystack (vendor checkout — no platform billing)

VendorLink is in **free mode** (no Premium subscription), so the platform
needs no Paystack account or plan. Paystack is used per-vendor:

- Each **vendor** creates their own Paystack account and pastes their
  **public key** (`pk_test_…`) into Dashboard → Store settings. Card
  payments land in the vendor's own account.
- You (the platform) still need the webhook in Part 5 so vendor order
  payments are confirmed server-side.

---

## Part 3 — App URL (1 variable)

- **Local development:** `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- **After deploying to Vercel:** `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`

This is where Paystack/magic-link redirects send users after login.

---

## Part 4 — Put the variables in place

### A. Running locally
Create a file called **`.env.local`** in the project root (copy `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then **restart the dev server** (`npm run dev`) — env vars only load at startup.

### B. Deploying to Vercel
Repo → GitHub → Import in Vercel → **Settings → Environment Variables** → add the same four values → Redeploy.

---

## Part 5 — The Paystack webhook (confirms vendor order payments)

These are **Deno secrets on the Edge Function** — NOT `.env.local`:

```bash
npx supabase login
npx supabase functions deploy paystack-webhook --project-ref YOUR_PROJECT_REF
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx --project-ref YOUR_PROJECT_REF
npx supabase secrets set SUPABASE_URL=https://xxxx.supabase.co --project-ref YOUR_PROJECT_REF
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... --project-ref YOUR_PROJECT_REF
```

> `YOUR_PROJECT_REF` is the `xxxx` part of your Supabase URL.

Then in Paystack: **Settings → API Keys & Webhooks → Webhook URL** →
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook`

Event it listens for: `charge.success` (`subscription.disable` is dormant until monetization returns).

---

## Final checklist

- [ ] Migration SQL ran successfully in Supabase SQL Editor
- [ ] Email auth enabled in Supabase
- [ ] `.env.local` (or Vercel env) has all 4 variables
- [ ] App restarted / redeployed
- [ ] Webhook function deployed + secrets set + webhook URL registered in Paystack
- [ ] Test: sign up a vendor → add products (max 20) → place an order via WhatsApp → card payment with a vendor Paystack key
