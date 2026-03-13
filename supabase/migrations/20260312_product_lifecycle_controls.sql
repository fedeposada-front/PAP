-- 2026-03-12
-- Product lifecycle controls for seller dashboard
-- Safe to run multiple times.

alter table public.products
  add column if not exists sold_count integer not null default 0;
