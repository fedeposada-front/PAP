-- 2026-03-09
-- Shop settings + delivery modes + product media + multi-categories
-- Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- SHOPS: fields for settings page and delivery details
-- ---------------------------------------------------------------------------
alter table public.shops
  add column if not exists banner_image_url text,
  add column if not exists logo_image_url text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists delivery_hand boolean not null default true,
  add column if not exists delivery_post boolean not null default false,
  add column if not exists delivery_carrier boolean not null default false,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists open_holidays boolean not null default false;

-- Keep delivery sub-modes coherent with global delivery switch
update public.shops
set
  delivery_hand = case when delivery then delivery_hand else false end,
  delivery_post = case when delivery then delivery_post else false end,
  delivery_carrier = case when delivery then delivery_carrier else false end;

-- ---------------------------------------------------------------------------
-- PRODUCTS: main image + gallery + multi-categories
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists main_image_url text,
  add column if not exists image_urls text[] not null default array[]::text[],
  add column if not exists categories text[] not null default array[]::text[];

-- Backfill from existing single-image/single-category data
update public.products
set
  main_image_url = coalesce(main_image_url, image_url),
  image_urls = case
    when array_length(image_urls, 1) is null and image_url is not null then array[image_url]::text[]
    when array_length(image_urls, 1) is null then array[]::text[]
    else image_urls
  end,
  categories = case
    when array_length(categories, 1) is null and category is not null then array[category]::text[]
    when array_length(categories, 1) is null then array[]::text[]
    else categories
  end;

-- Constraints for data quality
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_categories_not_empty_if_published'
  ) then
    alter table public.products
      add constraint products_categories_not_empty_if_published
      check (is_published = false or array_length(categories, 1) >= 1);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_main_image_required_if_published'
  ) then
    alter table public.products
      add constraint products_main_image_required_if_published
      check (is_published = false or main_image_url is not null);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_shops_delivery_modes
  on public.shops(delivery, delivery_hand, delivery_post, delivery_carrier);

create index if not exists idx_products_main_image_url
  on public.products(main_image_url);

create index if not exists idx_products_categories_gin
  on public.products using gin(categories);
