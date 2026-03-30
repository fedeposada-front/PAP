-- 2026-03-30
-- Buyer-facing profile card fields.
-- Safe to run multiple times.

alter table public.profiles
  add column if not exists nickname text;

alter table public.profiles
  add column if not exists city text;

update public.profiles
set nickname = nullif(btrim(first_name), '')
where (nickname is null or btrim(nickname) = '')
  and first_name is not null
  and btrim(first_name) <> '';

analyze public.profiles;
