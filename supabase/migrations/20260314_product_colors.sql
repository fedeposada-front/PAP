-- 2026-03-14
-- Multiple colors for products
-- Safe to run multiple times.

alter table public.products
  add column if not exists colors text[] not null default array[]::text[];

update public.products
set colors = case
  when array_length(colors, 1) is null and color is not null and btrim(color) <> '' then array[color]::text[]
  when array_length(colors, 1) is null then array[]::text[]
  else colors
end;
