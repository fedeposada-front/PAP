-- 2026-03-14
-- Ensure one shop per owner_user_id
-- Safe to run multiple times.

with ranked_shops as (
  select
    id,
    owner_user_id,
    row_number() over (
      partition by owner_user_id
      order by created_at asc, id asc
    ) as rn
  from public.shops
  where owner_user_id is not null
),
shops_to_keep as (
  select id, owner_user_id
  from ranked_shops
  where rn = 1
),
shops_to_merge as (
  select id, owner_user_id
  from ranked_shops
  where rn > 1
)
update public.products p
set shop_id = keeper.id
from shops_to_merge duplicate
join shops_to_keep keeper
  on keeper.owner_user_id = duplicate.owner_user_id
where p.shop_id = duplicate.id;

with ranked_shops as (
  select
    id,
    owner_user_id,
    row_number() over (
      partition by owner_user_id
      order by created_at asc, id asc
    ) as rn
  from public.shops
  where owner_user_id is not null
),
shops_to_keep as (
  select id, owner_user_id
  from ranked_shops
  where rn = 1
),
shops_to_merge as (
  select id, owner_user_id
  from ranked_shops
  where rn > 1
)
update public.shop_news n
set shop_id = keeper.id
from shops_to_merge duplicate
join shops_to_keep keeper
  on keeper.owner_user_id = duplicate.owner_user_id
where n.shop_id = duplicate.id;

with ranked_shops as (
  select
    id,
    owner_user_id,
    row_number() over (
      partition by owner_user_id
      order by created_at asc, id asc
    ) as rn
  from public.shops
  where owner_user_id is not null
),
shops_to_keep as (
  select id, owner_user_id
  from ranked_shops
  where rn = 1
),
shops_to_merge as (
  select id, owner_user_id
  from ranked_shops
  where rn > 1
)
update public.shop_collections c
set shop_id = keeper.id
from shops_to_merge duplicate
join shops_to_keep keeper
  on keeper.owner_user_id = duplicate.owner_user_id
where c.shop_id = duplicate.id;

with ranked_shops as (
  select
    id,
    owner_user_id,
    row_number() over (
      partition by owner_user_id
      order by created_at asc, id asc
    ) as rn
  from public.shops
  where owner_user_id is not null
)
delete from public.shops s
using ranked_shops ranked
where s.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists uniq_shops_owner_user_id
  on public.shops(owner_user_id)
  where owner_user_id is not null;