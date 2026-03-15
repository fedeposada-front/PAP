-- 2026-03-14
-- Optional shop collections for products
-- Safe to run multiple times.

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

alter table public.products
  add column if not exists collection_id uuid references public.shop_collections(id) on delete set null;

create index if not exists idx_shop_collections_shop_id
  on public.shop_collections(shop_id, created_at desc);

create index if not exists idx_products_collection_id
  on public.products(collection_id);

drop trigger if exists trg_shop_collections_updated_at on public.shop_collections;
create trigger trg_shop_collections_updated_at
before update on public.shop_collections
for each row execute function public.set_updated_at();

alter table public.shop_collections enable row level security;

grant select on public.shop_collections to anon;
grant select, insert, update, delete on public.shop_collections to authenticated;

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
