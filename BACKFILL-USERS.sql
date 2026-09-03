-- ═══════════════════════════════════════════════════════════════════════
-- VendorLink — BACKFILL script
-- Creates a profiles row AND a stores row for every auth user who is
-- missing one (e.g. accounts created before the migration ran).
--
-- • Idempotent — safe to run as many times as you like.
-- • Run this in: Supabase → SQL Editor → New query → Run.
-- • Admin SQL bypasses RLS, so nothing is blocked.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1) profiles for users missing one ────────────────────────────────────
insert into public.profiles (id, email, full_name, phone)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1)
  ) as full_name,
  u.raw_user_meta_data ->> 'phone' as phone
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- ── 2) stores for users missing one ──────────────────────────────────────
-- Slug logic: store_name from signup metadata → fallback full name → email
-- prefix. Collisions (existing stores or duplicate names in this batch) get
-- a short user-id suffix so the unique constraint never breaks.
with missing as (
  select
    u.id,
    u.email,
    u.raw_user_meta_data,
    lower(regexp_replace(
      regexp_replace(
        regexp_replace(
          coalesce(
            nullif(trim(u.raw_user_meta_data ->> 'store_name'), ''),
            coalesce(
              nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
              split_part(u.email, '@', 1)
            )
          ),
          '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )) as base_slug
  from auth.users u
  where not exists (select 1 from public.stores s where s.user_id = u.id)
),
ranked as (
  select
    m.*,
    count(*) over (partition by m.base_slug) as slug_taken
  from missing m
)
insert into public.stores (user_id, slug, name)
select
  m.id,
  case
    when m.base_slug = '' then 'store-' || left(m.id::text, 8)
    when m.slug_taken > 1
      or exists (select 1 from public.stores s where s.slug = m.base_slug)
      then left(m.base_slug, 31) || '-' || left(m.id::text, 8)
    else m.base_slug
  end,
  coalesce(
    nullif(trim(m.raw_user_meta_data ->> 'store_name'), ''),
    coalesce(
      nullif(trim(m.raw_user_meta_data ->> 'full_name'), ''),
      split_part(m.email, '@', 1)
    ) || '''s Store'
  ) as name
from ranked m;

-- ── 3) Verify — every row must show true / true ──────────────────────────
select
  u.email,
  p.id is not null as has_profile,
  s.id is not null as has_store
from auth.users u
left join public.profiles p on p.id = u.id
left join public.stores  s on s.user_id = u.id
order by u.created_at desc;
