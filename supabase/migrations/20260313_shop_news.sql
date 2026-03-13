-- 2026-03-13
-- Shop news / updates for storefront carousel
-- Safe to run multiple times.

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

create index if not exists idx_shop_news_shop_created_at
  on public.shop_news(shop_id, created_at desc);

create index if not exists idx_shop_news_published
  on public.shop_news(is_published);

alter table public.shop_news enable row level security;

grant select on public.shop_news to anon;
grant select, insert, update, delete on public.shop_news to authenticated;

drop trigger if exists trg_shop_news_updated_at on public.shop_news;
create trigger trg_shop_news_updated_at
before update on public.shop_news
for each row execute function public.set_updated_at();

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
