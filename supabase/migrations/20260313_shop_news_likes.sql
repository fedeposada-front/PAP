-- 2026-03-13
-- Likes on published shop news
-- Safe to run multiple times.

create table if not exists public.shop_news_likes (
  news_id uuid not null references public.shop_news(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (news_id, user_id)
);

create index if not exists idx_shop_news_likes_news_id
  on public.shop_news_likes(news_id);

create index if not exists idx_shop_news_likes_user_id
  on public.shop_news_likes(user_id);

alter table public.shop_news_likes enable row level security;

grant select on public.shop_news_likes to anon, authenticated;
grant insert, delete on public.shop_news_likes to authenticated;

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
