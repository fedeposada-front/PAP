-- 2026-03-29
-- Track whether the company completed the business type onboarding step.
-- Safe to run multiple times.

alter table public.shops add column if not exists business_type_configured boolean;

update public.shops
set business_type_configured = true
where business_type_configured is null;

alter table public.shops
  alter column business_type_configured set default false;

alter table public.shops
  alter column business_type_configured set not null;

create index if not exists idx_shops_business_type_configured
  on public.shops(business_type_configured);

analyze public.shops;
