-- 2026-03-14
-- Collection details + optional product color
-- Safe to run multiple times.

alter table public.shop_collections
  add column if not exists year integer,
  add column if not exists image_url text;

alter table public.products
  add column if not exists color text;
