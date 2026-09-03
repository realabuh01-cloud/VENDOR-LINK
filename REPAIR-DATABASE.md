# Fixing the blank dashboard — clean database reset

Do these steps in order. You'll need the Supabase dashboard open in one tab
and your site in another. Takes ~10 minutes.

---

## Step 1 — Delete your test users (2 min)

1. Supabase dashboard → left menu → **Authentication** → **Users**
2. Delete **all** the test accounts you've created so far
   (select the user → top-right **Delete user** → confirm)
3. Why: the store/profile auto-creation only happens when an account is
   created. Old accounts made before the migration are permanently missing
   rows — deleting them lets you start clean.

---

## Step 2 — Drop all tables (1 min)

1. Left menu → **SQL Editor** → **New query**
2. Paste this and click **Run**:

```sql
-- 1) Storage policies survive table drops — remove them first
drop policy if exists "images_public_read"   on storage.objects;
drop policy if exists "images_vendor_insert" on storage.objects;
drop policy if exists "images_vendor_update" on storage.objects;
drop policy if exists "images_vendor_delete" on storage.objects;

-- 2) Drop the tables (cascade removes their RLS policies too)
drop table if exists public.subscriptions cascade;
drop table if exists public.orders         cascade;
drop table if exists public.products       cascade;
drop table if exists public.stores         cascade;
drop table if exists public.profiles       cascade;
```

3. You should see a green **"Success. No rows returned"** banner.

---

## Step 3 — Re-run the migration, ONE go (2 min)

1. Still in SQL Editor → **New query**
2. Open `supabase/migrations/0001_init.sql` (in this project) → copy the
   **entire file** → paste → **Run**
3. ⚠️ **Do not run sections separately.** If it stops midway with an error,
   that error is the root cause of your original problem — fix it and run
   the whole file again (it's now safe to re-run).
4. Green **"Success"** banner = tables, RLS, triggers and the
   `product-images` bucket are all in place.

---

## Step 4 — Verify everything (2 min)

Run these three checks in the SQL Editor, one after another:

```sql
-- 1) Tables exist and are empty
select 'profiles' as t, count(*) from public.profiles
union all select 'stores', count(*) from public.stores
union all select 'products', count(*) from public.products
union all select 'orders', count(*) from public.orders
union all select 'subscriptions', count(*) from public.subscriptions;
```

```sql
-- 2) RLS policies exist (should list ~13 policies)
select tablename, policyname from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

```sql
-- 3) The signup trigger exists (should return "on_auth_user_created")
select trigger_name from information_schema.triggers
where event_object_schema = 'auth' and event_object_table = 'users';
```

All three must return results. If #2 or #3 is empty — that was your bug.

---

## Step 5 — Confirm Vercel points at THIS Supabase project (2 min)

⚠️ This is the #1 cause of "works locally, breaks after deployment."

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Compare `NEXT_PUBLIC_SUPABASE_URL` with the URL shown in Supabase →
   **Project Settings → API** (of the project where you just ran the SQL)
3. They must be **identical**. If Vercel has a different URL, you've been
   signing up into a different Supabase project that has no migration —
   change the Vercel variable to match and redeploy.
4. Also set `NEXT_PUBLIC_APP_URL` to your real site URL
   (`https://your-app.vercel.app`) — NOT `http://localhost:3000`.

---

## Step 6 — Enable email login (1 min)

Supabase → **Authentication → Sign In / Providers** → **Email** → enable.
If "Confirm email" is ON, new users must click the link in their inbox first.

---

## Step 7 — Sign up a brand-new account (2 min)

1. Open your **deployed site** (the Vercel URL, not localhost)
2. Go to **Sign up** → use a NEW email → fill the form → submit
3. Confirm the email if prompted, then sign in
4. The dashboard should now load — products, orders, everything

---

## Step 8 — Confirm the rows were created

Supabase → **Table Editor**:
- `profiles` → your new user's row is there
- `stores` → a row whose `user_id` matches that profile id

If both exist, you're fixed. ✅

---

## Still blank after all this?

Open the site on the failing device → right-click → **Inspect** → **Console**
and **Network** tabs → sign in → take note of any red lines → send me the
exact error text. That will pinpoint it immediately.
