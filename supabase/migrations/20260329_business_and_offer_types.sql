-- 2026-03-29
-- Add business_type to shops and offer_type to products to support products, services, or both.
-- Safe to run multiple times.

alter table public.shops add column if not exists business_type text;
update public.shops set business_type = 'product' where business_type is null;
alter table public.shops alter column business_type set default 'product';
alter table public.shops alter column business_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shops_business_type_check'
      and conrelid = 'public.shops'::regclass
  ) then
    alter table public.shops
      add constraint shops_business_type_check
      check (business_type in ('product', 'service', 'hybrid'));
  end if;
end
$$;

alter table public.products add column if not exists offer_type text;
update public.products set offer_type = 'product' where offer_type is null;
alter table public.products alter column offer_type set default 'product';
alter table public.products alter column offer_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_offer_type_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_offer_type_check
      check (offer_type in ('product', 'service'));
  end if;
end
$$;

create index if not exists idx_shops_business_type on public.shops(business_type);
create index if not exists idx_products_offer_type on public.products(offer_type);

analyze public.shops;
analyze public.products;
