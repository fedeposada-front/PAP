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

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  description text,
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
  hours text,
  rating numeric(2,1),
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  category text not null,
  available_today boolean not null default false,
  stock integer not null default 0 check (stock >= 0),
  pickup boolean not null default true,
  delivery boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists idx_products_shop_id on public.products(shop_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_lead_events_shop_id on public.lead_events(shop_id);
create index if not exists idx_lead_events_type on public.lead_events(event_type);
create index if not exists idx_lead_events_created_at on public.lead_events(created_at desc);
create index if not exists idx_ads_placement_city on public.ads(placement, city);
create index if not exists idx_ad_impressions_ad_id on public.ad_impressions(ad_id);
create index if not exists idx_ad_clicks_ad_id on public.ad_clicks(ad_id);

drop trigger if exists trg_shops_updated_at on public.shops;
create trigger trg_shops_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_ads_updated_at on public.ads;
create trigger trg_ads_updated_at
before update on public.ads
for each row execute function public.set_updated_at();

alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.lead_events enable row level security;
alter table public.ads enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.ad_clicks enable row level security;

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
