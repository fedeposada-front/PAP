-- 2026-03-13
-- Shop story + team members
-- Safe to run multiple times.

alter table public.shops
  add column if not exists story text;

alter table public.shops
  add column if not exists team_members jsonb not null default '[]'::jsonb;
