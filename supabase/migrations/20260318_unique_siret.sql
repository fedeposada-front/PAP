-- 2026-03-18
-- Ensure one SIRET per profile.
-- Safe to run multiple times.

with ranked_profiles as (
  select
    id,
    siret_number,
    row_number() over (
      partition by siret_number
      order by created_at asc, id asc
    ) as rn
  from public.profiles
  where siret_number is not null
),
duplicate_profiles as (
  select id
  from ranked_profiles
  where rn > 1
)
update public.profiles p
set
  siret_number = null,
  siret_verified = false,
  seller_attested = false,
  active_role = case when 'buyer' = any (roles) then 'buyer' else active_role end
from duplicate_profiles d
where p.id = d.id;

create unique index if not exists uniq_profiles_siret_number
  on public.profiles(siret_number)
  where siret_number is not null;
