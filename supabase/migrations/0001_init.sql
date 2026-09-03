-- ═══════════════════════════════════════════════════════════════════════════
-- VendorLink — Supabase schema + RLS + business rules
-- Phase 1 migration. Run in the Supabase SQL editor, then deploy the
-- Edge Function (supabase/functions/paystack-webhook).
--
-- ✅ RE-RUNNABLE: tables use IF NOT EXISTS, triggers/functions use
--    DROP IF EXISTS / CREATE OR REPLACE, and policies are dropped and
--    recreated. Safe to run as many times as you like.
--
-- PLAN LIMITS (must match lib/config.ts):
--   • All stores: 20 products max, unlimited orders (100% free — no plans)
--   • is_premium / subscriptions columns are retained but unused, so
--     monetization can be switched back on later without a migration.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─── Tables ────────────────────────────────────────────────────────────────

-- 1) profiles — 1:1 with auth.users
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null,
  phone      text,
  created_at timestamptz not null default now()
);

-- 2) stores — one per vendor (multi-tenancy boundary)
create table if not exists public.stores (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles (id) on delete cascade,
  slug                text not null unique,          -- public URL: /store/<slug>
  name                text not null,
  logo_url            text,                          -- Supabase Storage public URL
  whatsapp_number     text,                          -- international digits (23480…)
  is_premium          boolean not null default false,
  subscription_status text not null default 'none'
                      check (subscription_status in ('none','active','past_due','cancelled')),
  paystack_public_key text,                          -- vendor PUBLIC key (never secret)
  is_active           boolean not null default true, -- store visibility toggle
  created_at          timestamptz not null default now()
);

-- 3) products — image_path holds the RELATIVE path in the `product-images`
--    bucket (e.g. "<store_id>/<uuid>.jpg"), never an external URL.
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  price        integer not null check (price >= 0),  -- Naira
  description  text,
  image_path   text,
  stock_count  integer not null default 1 check (stock_count >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists products_store_idx on public.products (store_id);

-- 4) orders — customer_details is JSONB (name, phone, email, city, address, note)
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores (id) on delete cascade,
  customer_details  jsonb not null,
  total_amount      integer not null check (total_amount >= 0),  -- Naira, server-computed
  status            text not null default 'pending'
                    check (status in ('pending','paid','delivered','cancelled')),
  payment_method    text not null check (payment_method in ('whatsapp','paystack')),
  paystack_reference text,
  created_at        timestamptz not null default now()
);
create index if not exists orders_store_idx on public.orders (store_id, created_at desc);

-- 5) subscriptions — platform revenue records (managed by the webhook)
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles (id) on delete cascade,
  paystack_subscription_code text,
  plan_code                 text,
  current_period_end        timestamptz,
  status                    text not null default 'active'
                            check (status in ('active','cancelled','expired')),
  created_at                timestamptz not null default now()
);

-- ─── Storage bucket: product-images (PUBLIC read) ──────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ─── Helpers ───────────────────────────────────────────────────────────────

-- Slugify store names (used by the signup trigger).
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(
    regexp_replace(
      regexp_replace(coalesce(input, ''), '[^a-z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'),
    '-+', '-', 'g'));
$$;

-- ─── Signup trigger: create profiles + default stores entry ────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name   text;
  v_slug   text;
  v_email  text;
  v_store  text;
  v_suffix int := 0;
begin
  v_email := coalesce(new.email, '');
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(v_email, '@', 1)
  );
  v_store := nullif(trim(new.raw_user_meta_data ->> 'store_name'), '');
  v_slug  := coalesce(public.slugify(v_store), public.slugify(v_name), 'store-' || substr(new.id::text, 1, 8));

  insert into public.profiles (id, email, full_name, phone)
  values (new.id, v_email, v_name, new.raw_user_meta_data ->> 'phone');

  -- Unique slug with graceful fallback (vendors can change it in Settings).
  loop
    begin
      insert into public.stores (user_id, slug, name)
      values (new.id, v_slug, coalesce(v_store, v_name || '''s Store'));
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      v_slug := left(public.slugify(v_name), 38) || '-' || v_suffix;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Product cap (20 per store) — enforced at the DB layer ────────────────
-- All stores are free; the cap applies to everyone.
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.products where store_id = new.store_id;
  if v_count >= 20 then
    raise exception 'PRODUCT_LIMIT:Each store can have up to 20 products. Delete a product to add a new one.';
  end if;
  return new;
end;
$$;

drop trigger if exists products_limit_check on public.products;
create trigger products_limit_check
  before insert on public.products
  for each row execute function public.enforce_product_limit();

-- ─── create_order RPC — the single, unforgeable order path ─────────────────
-- Enforces: active store, non-empty cart, stock availability (row locks),
-- server-computed totals. Orders are unlimited (no monthly cap).
create or replace function public.create_order(
  p_store_id uuid,
  p_items    jsonb,   -- [{product_id, qty}]
  p_customer jsonb,   -- {name, phone, email, city, address, note}
  p_method   text     -- 'whatsapp' | 'paystack'
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_store      public.stores%rowtype;
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_qty        integer;
  v_total      integer := 0;
  v_lines      jsonb := '[]'::jsonb;
  v_order_id   uuid;
begin
  select * into v_store from public.stores
   where id = p_store_id and is_active = true;
  if not found then
    raise exception 'STORE_NOT_FOUND:This store does not exist or is currently closed.';
  end if;

  if p_method not in ('whatsapp', 'paystack') then
    raise exception 'VALIDATION:Invalid payment method.';
  end if;

  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'VALIDATION:Your cart is empty.';
  end if;

  -- Validate items, lock stock rows, compute total from the DB (never client).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
     where id = (v_item ->> 'product_id')::uuid
       and store_id = p_store_id
     for update;

    if not found then
      raise exception 'VALIDATION:A product in your cart is no longer available.';
    end if;

    v_qty := coalesce((v_item ->> 'qty')::integer, 0);
    if v_qty <= 0 then
      raise exception 'VALIDATION:Invalid quantity.';
    end if;
    if v_product.stock_count < v_qty then
      raise exception 'STOCK:Not enough stock for "%".', v_product.name;
    end if;

    update public.products
       set stock_count = stock_count - v_qty
     where id = v_product.id;

    v_total := v_total + (v_product.price * v_qty);
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id::text,
      'name',       v_product.name,
      'price',      v_product.price,
      'qty',        v_qty
    );
  end loop;

  insert into public.orders (store_id, customer_details, total_amount, status, payment_method)
  values (p_store_id, p_customer, v_total, 'pending', p_method)
  returning id into v_order_id;

  return jsonb_build_object('order_id', v_order_id::text, 'total_amount', v_total);
end;
$$;

revoke all on function public.create_order(uuid, jsonb, jsonb, text) from public;
grant execute on function public.create_order(uuid, jsonb, jsonb, text) to anon, authenticated;

-- ─── confirm_order_payment RPC — optimistic client-side confirmation ───────
-- The Paystack webhook (charge.success) performs the authoritative update.
-- All stores can accept card payments (no premium gating).
create or replace function public.confirm_order_payment(
  p_order_id  uuid,
  p_reference text,
  p_store_id  uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_store public.stores%rowtype;
begin
  select * into v_store from public.stores where id = p_store_id and is_active = true;
  if not found then
    raise exception 'STORE_NOT_FOUND:Store not found.';
  end if;
  update public.orders
     set status = 'paid', paystack_reference = p_reference
   where id = p_order_id and store_id = p_store_id and status = 'pending';
end;
$$;

revoke all on function public.confirm_order_payment(uuid, text, uuid) from public;
grant execute on function public.confirm_order_payment(uuid, text, uuid) to anon, authenticated;

-- ─── get_order_status RPC — lets the success page poll (no data leak) ──────
create or replace function public.get_order_status(p_order_id uuid)
returns text
language sql
security definer set search_path = public
as $$
  select status from public.orders where id = p_order_id;
$$;

revoke all on function public.get_order_status(uuid) from public;
grant execute on function public.get_order_status(uuid) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — vendors must NEVER see each other's data.
-- Policies use DROP IF EXISTS + CREATE so the whole file is re-runnable.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: owners only
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- stores: anyone may read ACTIVE stores (public storefronts); owners manage theirs
drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read" on public.stores
  for select using (is_active = true);
drop policy if exists "stores_owner_all" on public.stores;
create policy "stores_owner_all" on public.stores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- products: visible when the parent store is active; owners manage theirs
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (
    exists (select 1 from public.stores s where s.id = store_id and s.is_active = true)
  );
drop policy if exists "products_owner_all" on public.products;
create policy "products_owner_all" on public.products
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- orders: owners only (customers track status via the get_order_status RPC)
drop policy if exists "orders_owner_all" on public.orders;
create policy "orders_owner_all" on public.orders
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.user_id = auth.uid())
  );

-- subscriptions: owners read; writes come from the service-role webhook
drop policy if exists "subscriptions_owner_select" on public.subscriptions;
create policy "subscriptions_owner_select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ─── Storage policies (product-images bucket) ──────────────────────────────
-- Public read so storefronts load without auth.
drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Vendors may only write INSIDE their own store's folder.
-- Path layout is "<store_id>/<uuid>.<ext>", so the first path segment is the
-- store id. Verified again server-side in the upload Route Handler.
drop policy if exists "images_vendor_insert" on storage.objects;
create policy "images_vendor_insert" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.stores where user_id = auth.uid()
    )
  );

drop policy if exists "images_vendor_update" on storage.objects;
create policy "images_vendor_update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.stores where user_id = auth.uid()
    )
  );

drop policy if exists "images_vendor_delete" on storage.objects;
create policy "images_vendor_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.stores where user_id = auth.uid()
    )
  );
