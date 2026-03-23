-- 2026-03-22
-- Persistent unique slugs for shops to avoid public URL collisions.
-- Safe to run multiple times.

create extension if not exists unaccent;

alter table public.shops add column if not exists slug text;

create or replace function public.slugify_shop_name(input text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(
        both '_'
        from regexp_replace(
          regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '_', 'g'),
          '_+',
          '_',
          'g'
        )
      ),
      ''
    ),
    'boutique'
  );
$$;

create or replace function public.assign_shop_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 2;
begin
  base_slug := public.slugify_shop_name(new.name);
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.shops s
    where s.slug = candidate_slug
      and (new.id is null or s.id <> new.id)
  ) loop
    candidate_slug := base_slug || '_' || suffix::text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate_slug;
  return new;
end
$$;

with ranked_shops as (
  select
    id,
    public.slugify_shop_name(name) as base_slug,
    row_number() over (
      partition by public.slugify_shop_name(name)
      order by created_at asc, id asc
    ) as rn
  from public.shops
),
generated_slugs as (
  select
    id,
    case
      when rn = 1 then base_slug
      else base_slug || '_' || rn::text
    end as slug
  from ranked_shops
)
update public.shops s
set slug = g.slug
from generated_slugs g
where s.id = g.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shops_slug_format'
      and conrelid = 'public.shops'::regclass
  ) then
    alter table public.shops
      add constraint shops_slug_format
      check (slug is null or slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$');
  end if;
end
$$;

create unique index if not exists uniq_shops_slug
  on public.shops(slug)
  where slug is not null;

drop trigger if exists trg_shops_assign_slug on public.shops;
create trigger trg_shops_assign_slug
before insert or update of name on public.shops
for each row execute function public.assign_shop_slug();

analyze public.shops;
