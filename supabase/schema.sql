-- MonCadeauLocal MVP schema
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;
create extension if not exists unaccent;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.category_groups (
  id text primary key,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_groups_id_format check (id ~ '^[a-z0-9-]+$')
);

create table if not exists public.categories (
  id text primary key,
  group_id text not null references public.category_groups(id) on delete restrict,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_id_format check (id ~ '^[a-z0-9-]+$')
);

create index if not exists idx_categories_group_id_sort
  on public.categories(group_id, sort_order, label);

insert into public.category_groups (id, label, icon, sort_order)
values
  ('alimentation', 'Alimentation', 'food', 10),
  ('artistique', 'Artistique', 'palette', 20),
  ('mode-beaute', 'Mode et Beaute', 'sparkles', 30),
  ('maison-jardin', 'Maison et Jardin', 'home', 40),
  ('famille-loisirs', 'Famille et Loisirs', 'users', 50)
on conflict (id) do update
set
  label = excluded.label,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.categories (id, group_id, label, icon, sort_order)
values
  ('gourmand', 'alimentation', 'Epicerie fine', 'gift', 10),
  ('boucherie', 'alimentation', 'Boucherie', 'beef', 20),
  ('boulangerie', 'alimentation', 'Boulangerie / Patisserie', 'croissant', 30),
  ('supermarche', 'alimentation', 'Supermarche', 'shopping-cart', 40),
  ('frais', 'alimentation', 'Produits frais', 'snowflake', 50),
  ('vin', 'alimentation', 'Vins, bieres et spiritueux', 'wine', 60),
  ('papeterie', 'artistique', 'Papeterie', 'pen', 10),
  ('ceramique', 'artistique', 'Ceramique', 'circle', 20),
  ('peinture', 'artistique', 'Peinture', 'brush', 30),
  ('illustration', 'artistique', 'Illustration', 'image', 40),
  ('art', 'artistique', 'Art et creations', 'palette', 50),
  ('artisanat', 'artistique', 'Artisanat et fait main', 'hammer', 60),
  ('mode', 'mode-beaute', 'Mode', 'shirt', 10),
  ('beaute', 'mode-beaute', 'Beaute et cosmetiques', 'sparkles', 20),
  ('bijoux', 'mode-beaute', 'Bijoux et montres', 'gem', 30),
  ('bienetre', 'mode-beaute', 'Bien-etre', 'heart', 40),
  ('deco', 'maison-jardin', 'Deco et maison', 'lamp', 10),
  ('bricolage', 'maison-jardin', 'Bricolage et jardin', 'wrench', 20),
  ('fleurs', 'maison-jardin', 'Fleurs et plantes', 'flower', 30),
  ('bebe', 'famille-loisirs', 'Bebe et enfants', 'baby', 10),
  ('jouets', 'famille-loisirs', 'Jouets et jeux', 'toy-brick', 20),
  ('livres', 'famille-loisirs', 'Livres', 'book', 30),
  ('sport', 'famille-loisirs', 'Sport et loisirs', 'dumbbell', 40),
  ('hightech', 'famille-loisirs', 'High-tech et accessoires', 'smartphone', 50),
  ('animaux', 'famille-loisirs', 'Animaux', 'paw-print', 60),
  ('auto', 'famille-loisirs', 'Auto et velo', 'car', 70)
on conflict (id) do update
set
  group_id = excluded.group_id,
  label = excluded.label,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

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
  slug text,
  name text not null,
  category text not null,
  category_id text default 'artisanat',
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
alter table public.shops add column if not exists category_id text default 'artisanat';
alter table public.shops add column if not exists slug text;

create or replace function public.slugify_shop_name(input text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(
        both '_'
        from regexp_replace(
          regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '_', 'g'),
          '_+',
          '_',
          'g'
        )
      ),
      ''
    ),
    'boutique'
  );
$$;

create or replace function public.assign_shop_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 2;
begin
  base_slug := public.slugify_shop_name(new.name);
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.shops s
    where s.slug = candidate_slug
      and (new.id is null or s.id <> new.id)
  ) loop
    candidate_slug := base_slug || '_' || suffix::text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate_slug;
  return new;
end
$$;

with ranked_shops as (
  select
    id,
    public.slugify_shop_name(name) as base_slug,
    row_number() over (
      partition by public.slugify_shop_name(name)
      order by created_at asc, id asc
    ) as rn
  from public.shops
),
generated_slugs as (
  select
    id,
    case
      when rn = 1 then base_slug
      else base_slug || '_' || rn::text
    end as slug
  from ranked_shops
)
update public.shops s
set slug = g.slug
from generated_slugs g
where s.id = g.id;

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
  categories text[] not null default array[]::text[],
  category text not null,
  category_id text default 'artisanat',
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
alter table public.products add column if not exists category_id text default 'artisanat';

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

update public.shops s
set category = 'artisanat'
where not exists (select 1 from public.categories c where c.id = s.category);

update public.products p
set category = 'artisanat'
where not exists (select 1 from public.categories c where c.id = p.category);

update public.shops
set category_id = coalesce(category_id, category, 'artisanat');

update public.products
set category_id = coalesce(category_id, category, 'artisanat');

update public.products
set categories = case
  when array_length(categories, 1) is null and category is not null then array[category]::text[]
  when array_length(categories, 1) is null then array[]::text[]
  else categories
end;

update public.shops
set category = coalesce(category_id, category, 'artisanat');

update public.products
set category = coalesce(category_id, category, 'artisanat');

alter table public.shops
  alter column category set default 'artisanat';

alter table public.products
  alter column category set default 'artisanat';

alter table public.shops
  alter column category_id set default 'artisanat';

alter table public.products
  alter column category_id set default 'artisanat';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_category_fk'
  ) then
    alter table public.shops
      add constraint shops_category_fk
      foreign key (category) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_fk'
  ) then
    alter table public.products
      add constraint products_category_fk
      foreign key (category) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_category_id_fk'
  ) then
    alter table public.shops
      add constraint shops_category_id_fk
      foreign key (category_id) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_id_fk'
  ) then
    alter table public.products
      add constraint products_category_id_fk
      foreign key (category_id) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_category_sync_check'
  ) then
    alter table public.shops
      add constraint shops_category_sync_check
      check (category_id is null or category = category_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_slug_format'
  ) then
    alter table public.shops
      add constraint shops_slug_format
      check (slug is null or slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_sync_check'
  ) then
    alter table public.products
      add constraint products_category_sync_check
      check (category_id is null or category = category_id);
  end if;
end
$$;

create index if not exists idx_shops_city on public.shops(city);
create index if not exists idx_shops_category on public.shops(category);
create index if not exists idx_shops_category_id on public.shops(category_id);
create index if not exists idx_shops_is_published on public.shops(is_published);
create unique index if not exists uniq_shops_slug on public.shops(slug) where slug is not null;
create unique index if not exists uniq_shops_owner_user_id on public.shops(owner_user_id) where owner_user_id is not null;
create index if not exists idx_profiles_active_role on public.profiles(active_role);
create index if not exists idx_profiles_siret_verified on public.profiles(siret_verified);
create unique index if not exists uniq_profiles_siret_number on public.profiles(siret_number) where siret_number is not null;
create index if not exists idx_products_shop_id on public.products(shop_id);
create index if not exists idx_products_collection_id on public.products(collection_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_categories_gin on public.products using gin(categories);
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

drop trigger if exists trg_category_groups_updated_at on public.category_groups;
create trigger trg_category_groups_updated_at
before update on public.category_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_shops_updated_at on public.shops;
create trigger trg_shops_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

drop trigger if exists trg_shops_assign_slug on public.shops;
create trigger trg_shops_assign_slug
before insert or update of name on public.shops
for each row execute function public.assign_shop_slug();

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

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_fulfillment_type' and n.nspname = 'public'
  ) then
    create type public.order_fulfillment_type as enum ('pickup', 'delivery');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payment_policy' and n.nspname = 'public'
  ) then
    create type public.order_payment_policy as enum ('full_payment', 'deposit_20');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_status' and n.nspname = 'public'
  ) then
    create type public.order_status as enum (
      'draft',
      'awaiting_payment',
      'reserved',
      'paid',
      'ready_for_pickup',
      'picked_up',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
      'refunded'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payment_status' and n.nspname = 'public'
  ) then
    create type public.order_payment_status as enum (
      'unpaid',
      'partially_paid',
      'paid',
      'payment_failed',
      'partially_refunded',
      'refunded'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payout_status' and n.nspname = 'public'
  ) then
    create type public.order_payout_status as enum (
      'pending',
      'eligible',
      'released',
      'paid',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_attempt_status' and n.nspname = 'public'
  ) then
    create type public.payment_attempt_status as enum (
      'created',
      'pending',
      'requires_action',
      'succeeded',
      'failed',
      'cancelled',
      'refunded'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_attempt_scope' and n.nspname = 'public'
  ) then
    create type public.payment_attempt_scope as enum (
      'full',
      'deposit',
      'balance',
      'adjustment'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'shipment_status' and n.nspname = 'public'
  ) then
    create type public.shipment_status as enum (
      'pending',
      'ready',
      'shipped',
      'delivered',
      'issue',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'delivery_method' and n.nspname = 'public'
  ) then
    create type public.delivery_method as enum ('hand', 'post', 'carrier');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payout_status' and n.nspname = 'public'
  ) then
    create type public.payout_status as enum (
      'pending',
      'eligible',
      'scheduled',
      'paid',
      'failed',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('MCL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  fulfillment_type public.order_fulfillment_type not null,
  payment_policy public.order_payment_policy not null default 'full_payment',
  status public.order_status not null default 'draft',
  payment_status public.order_payment_status not null default 'unpaid',
  payout_status public.order_payout_status not null default 'pending',
  currency text not null default 'eur',
  items_subtotal numeric(10,2) not null default 0 check (items_subtotal >= 0),
  delivery_price numeric(10,2) not null default 0 check (delivery_price >= 0),
  buyer_fee numeric(10,2) not null default 0 check (buyer_fee >= 0),
  platform_fee numeric(10,2) not null default 0 check (platform_fee >= 0),
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(10,2) not null default 0 check (paid_amount >= 0),
  deposit_rate numeric(5,4) not null default 0 check (deposit_rate >= 0 and deposit_rate <= 1),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  remaining_amount numeric(10,2) not null default 0 check (remaining_amount >= 0),
  seller_payout_amount numeric(10,2) not null default 0 check (seller_payout_amount >= 0),
  customer_note text,
  internal_note text,
  provider text not null default 'stripe',
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  provider_transfer_group text,
  reservation_expires_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  picked_up_at timestamptz,
  customer_confirmed_received_at timestamptz,
  payout_eligible_at timestamptz,
  payout_released_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  shop_id uuid not null references public.shops(id) on delete restrict,
  title text not null,
  image_url text,
  color text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  scope public.payment_attempt_scope not null default 'full',
  status public.payment_attempt_status not null default 'created',
  provider text not null default 'stripe',
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'eur',
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  provider_charge_id text,
  idempotency_key text,
  raw_payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.delivery_method not null,
  status public.shipment_status not null default 'pending',
  service_name text,
  carrier_name text,
  price numeric(10,2) not null default 0 check (price >= 0),
  recipient_name text,
  recipient_phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country_code text not null default 'FR',
  tracking_number text,
  tracking_url text,
  shipping_label_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  deposit_required boolean not null default false,
  deposit_rate numeric(5,4) not null default 0 check (deposit_rate >= 0 and deposit_rate <= 1),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  remaining_due_amount numeric(10,2) not null default 0 check (remaining_due_amount >= 0),
  expires_at timestamptz,
  reserved_at timestamptz,
  picked_up_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'eur',
  status public.payout_status not null default 'pending',
  provider text not null default 'stripe',
  provider_transfer_id text,
  provider_payout_id text,
  available_at timestamptz,
  released_at timestamptz,
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_currency_format'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_currency_format
      check (currency ~ '^[a-z]{3}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_deposit_policy_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_deposit_policy_check
      check (payment_policy <> 'deposit_20' or fulfillment_type = 'pickup');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_paid_amount_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_paid_amount_check
      check (paid_amount <= total_amount);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_deposit_amount_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_deposit_amount_check
      check (deposit_amount <= total_amount);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_remaining_amount_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_remaining_amount_check
      check (remaining_amount <= total_amount);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_attempts_currency_format'
      and conrelid = 'public.payment_attempts'::regclass
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_currency_format
      check (currency ~ '^[a-z]{3}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shipments_country_code_format'
      and conrelid = 'public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_country_code_format
      check (country_code ~ '^[A-Z]{2}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payouts_currency_format'
      and conrelid = 'public.payouts'::regclass
  ) then
    alter table public.payouts
      add constraint payouts_currency_format
      check (currency ~ '^[a-z]{3}$');
  end if;
end
$$;

create index if not exists idx_orders_buyer_created_at
  on public.orders(buyer_user_id, created_at desc);

create index if not exists idx_orders_shop_created_at
  on public.orders(shop_id, created_at desc);

create index if not exists idx_orders_status_payment_status
  on public.orders(status, payment_status, created_at desc);

create index if not exists idx_order_items_order_id
  on public.order_items(order_id, created_at asc);

create index if not exists idx_order_items_product_id
  on public.order_items(product_id);

create index if not exists idx_payment_attempts_order_created_at
  on public.payment_attempts(order_id, created_at desc);

create index if not exists idx_shipments_order_status
  on public.shipments(order_id, status);

create index if not exists idx_pickup_reservations_order_expires_at
  on public.pickup_reservations(order_id, expires_at);

create index if not exists idx_payouts_shop_status
  on public.payouts(shop_id, status, created_at desc);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_payment_attempts_updated_at on public.payment_attempts;
create trigger trg_payment_attempts_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

drop trigger if exists trg_pickup_reservations_updated_at on public.pickup_reservations;
create trigger trg_pickup_reservations_updated_at
before update on public.pickup_reservations
for each row execute function public.set_updated_at();

drop trigger if exists trg_payouts_updated_at on public.payouts;
create trigger trg_payouts_updated_at
before update on public.payouts
for each row execute function public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_buyer_shop_unique'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_buyer_shop_unique
      unique (buyer_user_id, shop_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_body_not_blank'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_body_not_blank
      check (char_length(btrim(body)) > 0);
  end if;
end
$$;

create index if not exists idx_conversations_buyer_last_message_at
  on public.conversations(buyer_user_id, last_message_at desc);

create index if not exists idx_conversations_shop_last_message_at
  on public.conversations(shop_id, last_message_at desc);

create index if not exists idx_messages_conversation_created_at
  on public.messages(conversation_id, created_at asc);

create index if not exists idx_messages_sender_created_at
  on public.messages(sender_user_id, created_at desc);

create or replace function public.sync_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 160),
    updated_at = now()
  where id = new.conversation_id;

  return new;
end
$$;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_sync_conversation on public.messages;
create trigger trg_messages_sync_conversation
after insert on public.messages
for each row execute function public.sync_conversation_last_message();

alter table public.profiles enable row level security;
alter table public.category_groups enable row level security;
alter table public.categories enable row level security;
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
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.shipments enable row level security;
alter table public.pickup_reservations enable row level security;
alter table public.payouts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select on public.category_groups to anon;
grant select on public.categories to anon;
grant select on public.shops to anon;
grant select on public.products to anon;
grant select on public.shop_collections to anon;
grant select on public.ads to anon;
grant select on public.shop_news to anon;
grant select on public.shop_news_likes to anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.category_groups to authenticated;
grant select on public.categories to authenticated;
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
grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant select, insert, update on public.shipments to authenticated;
grant select, insert, update on public.pickup_reservations to authenticated;
grant select on public.payment_attempts to authenticated;
grant select on public.payouts to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

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

drop policy if exists "category groups are readable by everyone" on public.category_groups;
create policy "category groups are readable by everyone"
on public.category_groups
for select
using (true);

drop policy if exists "categories are readable by everyone" on public.categories;
create policy "categories are readable by everyone"
on public.categories
for select
using (true);

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

drop policy if exists "buyers can read own orders" on public.orders;
create policy "buyers can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = buyer_user_id);

drop policy if exists "shop owners can read own orders" on public.orders;
create policy "shop owners can read own orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own orders" on public.orders;
create policy "buyers can insert own orders"
on public.orders
for insert
to authenticated
with check (
  auth.uid() = buyer_user_id
  and exists (
    select 1 from public.shops s
    where s.id = orders.shop_id
  )
);

drop policy if exists "buyers can update own orders" on public.orders;
create policy "buyers can update own orders"
on public.orders
for update
to authenticated
using (auth.uid() = buyer_user_id)
with check (auth.uid() = buyer_user_id);

drop policy if exists "shop owners can update own orders" on public.orders;
create policy "shop owners can update own orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own order items" on public.order_items;
create policy "buyers can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own order items" on public.order_items;
create policy "shop owners can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = order_items.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own order items" on public.order_items;
create policy "buyers can insert own order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own shipments" on public.shipments;
create policy "buyers can read own shipments"
on public.shipments
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = shipments.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own shipments" on public.shipments;
create policy "shop owners can read own shipments"
on public.shipments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = shipments.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own shipments" on public.shipments;
create policy "buyers can insert own shipments"
on public.shipments
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = shipments.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update own shipments" on public.shipments;
create policy "shop owners can update own shipments"
on public.shipments
for update
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = shipments.order_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = shipments.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own pickup reservations" on public.pickup_reservations;
create policy "buyers can read own pickup reservations"
on public.pickup_reservations
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = pickup_reservations.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own pickup reservations" on public.pickup_reservations;
create policy "shop owners can read own pickup reservations"
on public.pickup_reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = pickup_reservations.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own pickup reservations" on public.pickup_reservations;
create policy "buyers can insert own pickup reservations"
on public.pickup_reservations
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = pickup_reservations.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update own pickup reservations" on public.pickup_reservations;
create policy "shop owners can update own pickup reservations"
on public.pickup_reservations
for update
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = pickup_reservations.order_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = pickup_reservations.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own payment attempts" on public.payment_attempts;
create policy "buyers can read own payment attempts"
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = payment_attempts.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own payment attempts" on public.payment_attempts;
create policy "shop owners can read own payment attempts"
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payment_attempts.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own payouts" on public.payouts;
create policy "shop owners can read own payouts"
on public.payouts
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = payouts.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers and shop owners can read conversations" on public.conversations;
create policy "buyers and shop owners can read conversations"
on public.conversations
for select
to authenticated
using (
  auth.uid() = buyer_user_id
  or exists (
    select 1 from public.shops s
    where s.id = conversations.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can create conversations" on public.conversations;
create policy "buyers can create conversations"
on public.conversations
for insert
to authenticated
with check (
  auth.uid() = buyer_user_id
  and exists (
    select 1 from public.shops s
    where s.id = conversations.shop_id
  )
);

drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    join public.shops s on s.id = c.shop_id
    where c.id = messages.conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or s.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists "participants can send messages" on public.messages;
create policy "participants can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and exists (
    select 1
    from public.conversations c
    join public.shops s on s.id = c.shop_id
    where c.id = messages.conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or s.owner_user_id = auth.uid()
      )
  )
);
