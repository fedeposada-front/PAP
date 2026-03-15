-- MonCadeauLocal MVP schema
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  roles text[] not null default array['buyer']::text[],
  active_role text not null default 'buyer',
  shop_name text,
  shop_address text,
  siret_number text,
  siret_verified boolean not null default false,
  seller_attested boolean not null default false,
  seller_vacation_mode boolean not null default false,
  seller_deactivated boolean not null default false,
  payout_iban text,
  payout_bank_name text,
  payout_account_holder text,
  payout_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_roles_not_empty check (array_length(roles, 1) >= 1),
  constraint profiles_roles_allowed check (roles <@ array['buyer','seller']::text[]),
  constraint profiles_active_role_allowed check (active_role = any (array['buyer','seller']::text[])),
  constraint profiles_active_role_in_roles check (active_role = any (roles)),
  constraint profiles_siret_format check (siret_number is null or siret_number ~ '^[0-9]{14}$')
);

alter table public.profiles add column if not exists siret_number text;
alter table public.profiles add column if not exists siret_verified boolean not null default false;
alter table public.profiles add column if not exists shop_address text;
alter table public.profiles add column if not exists seller_attested boolean not null default false;
alter table public.profiles add column if not exists seller_vacation_mode boolean not null default false;
alter table public.profiles add column if not exists seller_deactivated boolean not null default false;
alter table public.profiles add column if not exists payout_iban text;
alter table public.profiles add column if not exists payout_bank_name text;
alter table public.profiles add column if not exists payout_account_holder text;
alter table public.profiles add column if not exists payout_active boolean not null default true;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_siret_format'
  ) then
    alter table public.profiles
      add constraint profiles_siret_format
      check (siret_number is null or siret_number ~ '^[0-9]{14}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_payout_iban_format'
  ) then
    alter table public.profiles
      add constraint profiles_payout_iban_format
      check (
        payout_iban is null
        or (
          payout_iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'
          and char_length(payout_iban) between 15 and 34
          and (left(payout_iban, 2) <> 'FR' or char_length(payout_iban) = 27)
        )
      );
  end if;
end
$$;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  description text,
  story text,
  team_members jsonb not null default '[]'::jsonb,
  address text not null,
  city text not null default 'Amiens',
  postal_code text,
  phone text,
  lat double precision,
  lng double precision,
  is_open boolean not null default false,
  pickup_today boolean not null default false,
  open_sunday boolean not null default false,
  delivery boolean not null default false,
  is_published boolean not null default true,
  hours text,
  rating numeric(2,1),
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops add column if not exists is_published boolean not null default true;

create table if not exists public.followed_shops (
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table if not exists public.shop_collections (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  description text,
  year integer,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  collection_id uuid references public.shop_collections(id) on delete set null,
  title text not null,
  description text,
  features text,
  composition text,
  return_conditions text,
  color text,
  colors text[] not null default array[]::text[],
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  category text not null,
  available_today boolean not null default false,
  stock integer not null default 0 check (stock >= 0),
  pickup boolean not null default true,
  delivery boolean not null default false,
  is_published boolean not null default true,
  sold_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists sold_count integer not null default 0;

create table if not exists public.favorite_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.shop_news (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_news_likes (
  news_id uuid not null references public.shop_news(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (news_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'lead_event_type' and n.nspname = 'public'
  ) then
    create type public.lead_event_type as enum (
      'view_shop',
      'click_call',
      'click_route',
      'click_message',
      'reservation_request'
    );
  end if;
end
$$;

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  event_type public.lead_event_type not null,
  shop_id uuid references public.shops(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete set null,
  title text not null,
  subtitle text,
  image_url text,
  cta_label text not null default 'Decouvrir',
  target_url text,
  placement text not null,
  city text not null default 'Amiens',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_impressions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  placement text not null,
  city text,
  session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_clicks (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  placement text not null,
  city text,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shops_city on public.shops(city);
create index if not exists idx_shops_category on public.shops(category);
create index if not exists idx_shops_is_published on public.shops(is_published);
create unique index if not exists uniq_shops_owner_user_id on public.shops(owner_user_id) where owner_user_id is not null;
create index if not exists idx_profiles_active_role on public.profiles(active_role);
create index if not exists idx_profiles_siret_verified on public.profiles(siret_verified);
create index if not exists idx_products_shop_id on public.products(shop_id);
create index if not exists idx_products_collection_id on public.products(collection_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_favorite_products_user_created_at on public.favorite_products(user_id, created_at desc);
create index if not exists idx_followed_shops_user_created_at on public.followed_shops(user_id, created_at desc);
create index if not exists idx_shop_collections_shop_id on public.shop_collections(shop_id, created_at desc);
create index if not exists idx_shop_news_shop_created_at on public.shop_news(shop_id, created_at desc);
create index if not exists idx_shop_news_published on public.shop_news(is_published);
create index if not exists idx_shop_news_likes_news_id on public.shop_news_likes(news_id);
create index if not exists idx_shop_news_likes_user_id on public.shop_news_likes(user_id);
create index if not exists idx_lead_events_shop_id on public.lead_events(shop_id);
create index if not exists idx_lead_events_type on public.lead_events(event_type);
create index if not exists idx_lead_events_created_at on public.lead_events(created_at desc);
create index if not exists idx_ads_placement_city on public.ads(placement, city);
create index if not exists idx_ad_impressions_ad_id on public.ad_impressions(ad_id);
create index if not exists idx_ad_clicks_ad_id on public.ad_clicks(ad_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_shops_updated_at on public.shops;
create trigger trg_shops_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_shop_collections_updated_at on public.shop_collections;
create trigger trg_shop_collections_updated_at
before update on public.shop_collections
for each row execute function public.set_updated_at();

drop trigger if exists trg_shop_news_updated_at on public.shop_news;
create trigger trg_shop_news_updated_at
before update on public.shop_news
for each row execute function public.set_updated_at();

drop trigger if exists trg_ads_updated_at on public.ads;
create trigger trg_ads_updated_at
before update on public.ads
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.favorite_products enable row level security;
alter table public.followed_shops enable row level security;
alter table public.shop_collections enable row level security;
alter table public.shop_news enable row level security;
alter table public.shop_news_likes enable row level security;
alter table public.lead_events enable row level security;
alter table public.ads enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.ad_clicks enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.shops to anon;
grant select on public.products to anon;
grant select on public.shop_collections to anon;
grant select on public.ads to anon;
grant select on public.shop_news to anon;
grant select on public.shop_news_likes to anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.shops to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.favorite_products to authenticated;
grant select, insert, update, delete on public.followed_shops to authenticated;
grant select, insert, update, delete on public.shop_collections to authenticated;
grant select, insert, update, delete on public.shop_news to authenticated;
grant select on public.shop_news_likes to authenticated;
grant insert, delete on public.shop_news_likes to authenticated;
grant select, insert, update, delete on public.lead_events to authenticated;
grant select, insert, update, delete on public.ads to authenticated;
grant select, insert, update, delete on public.ad_impressions to authenticated;
grant select, insert, update, delete on public.ad_clicks to authenticated;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "shops are readable by everyone" on public.shops;
create policy "shops are readable by everyone"
on public.shops
for select
using (true);

drop policy if exists "shop owners can insert shops" on public.shops;
create policy "shop owners can insert shops"
on public.shops
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "shop owners can update shops" on public.shops;
create policy "shop owners can update shops"
on public.shops
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "shop owners can delete shops" on public.shops;
create policy "shop owners can delete shops"
on public.shops
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "products are readable by everyone" on public.products;
create policy "products are readable by everyone"
on public.products
for select
using (true);

drop policy if exists "users can read own favorite products" on public.favorite_products;
create policy "users can read own favorite products"
on public.favorite_products
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own favorite products" on public.favorite_products;
create policy "users can insert own favorite products"
on public.favorite_products
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can delete own favorite products" on public.favorite_products;
create policy "users can delete own favorite products"
on public.favorite_products
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can read own followed shops" on public.followed_shops;
create policy "users can read own followed shops"
on public.followed_shops
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own followed shops" on public.followed_shops;
create policy "users can insert own followed shops"
on public.followed_shops
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can delete own followed shops" on public.followed_shops;
create policy "users can delete own followed shops"
on public.followed_shops
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "shop collections are readable by everyone" on public.shop_collections;
create policy "shop collections are readable by everyone"
on public.shop_collections
for select
using (true);

drop policy if exists "shop owners can manage own collections" on public.shop_collections;
create policy "shop owners can manage own collections"
on public.shop_collections
for all
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = shop_collections.shop_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = shop_collections.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "published shop news are readable by everyone" on public.shop_news;
create policy "published shop news are readable by everyone"
on public.shop_news
for select
using (is_published = true);

drop policy if exists "shop owners can read own shop news" on public.shop_news;
create policy "shop owners can read own shop news"
on public.shop_news
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = shop_news.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can insert own shop news" on public.shop_news;
create policy "shop owners can insert own shop news"
on public.shop_news
for insert
to authenticated
with check (
  exists (
    select 1 from public.shops s
    where s.id = shop_news.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update own shop news" on public.shop_news;
create policy "shop owners can update own shop news"
on public.shop_news
for update
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = shop_news.shop_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = shop_news.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can delete own shop news" on public.shop_news;
create policy "shop owners can delete own shop news"
on public.shop_news
for delete
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = shop_news.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop news likes are readable by everyone" on public.shop_news_likes;
create policy "shop news likes are readable by everyone"
on public.shop_news_likes
for select
using (true);

drop policy if exists "users can insert own shop news likes" on public.shop_news_likes;
create policy "users can insert own shop news likes"
on public.shop_news_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can delete own shop news likes" on public.shop_news_likes;
create policy "users can delete own shop news likes"
on public.shop_news_likes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "shop owners can insert products" on public.products;
create policy "shop owners can insert products"
on public.products
for insert
to authenticated
with check (
  exists (
    select 1 from public.shops s
    where s.id = shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update products" on public.products;
create policy "shop owners can update products"
on public.products
for update
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = shop_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can delete products" on public.products;
create policy "shop owners can delete products"
on public.products
for delete
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "anyone can insert lead events" on public.lead_events;
create policy "anyone can insert lead events"
on public.lead_events
for insert
with check (true);

drop policy if exists "shop owners can read own lead events" on public.lead_events;
create policy "shop owners can read own lead events"
on public.lead_events
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = lead_events.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "ads are readable by everyone" on public.ads;
create policy "ads are readable by everyone"
on public.ads
for select
using (true);

drop policy if exists "shop owners can manage own ads" on public.ads;
create policy "shop owners can manage own ads"
on public.ads
for all
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = ads.shop_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = ads.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "anyone can insert ad impressions" on public.ad_impressions;
create policy "anyone can insert ad impressions"
on public.ad_impressions
for insert
with check (true);

drop policy if exists "anyone can insert ad clicks" on public.ad_clicks;
create policy "anyone can insert ad clicks"
on public.ad_clicks
for insert
with check (true);
