-- 2026-03-13
-- Additional product details
-- Safe to run multiple times.

alter table public.products
  add column if not exists features text;

alter table public.products
  add column if not exists composition text;

alter table public.products
  add column if not exists return_conditions text;
