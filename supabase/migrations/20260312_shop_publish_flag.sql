-- 2026-03-12
-- Publish / draft workflow for shops
-- Safe to run multiple times.

alter table public.shops
  add column if not exists is_published boolean not null default true;

create index if not exists idx_shops_is_published
  on public.shops(is_published);
