-- 2026-03-29
-- Shop members + guard against internal self-purchase.
-- Safe to run multiple times.

create table if not exists public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_members_shop_user_unique'
      and conrelid = 'public.shop_members'::regclass
  ) then
    alter table public.shop_members
      add constraint shop_members_shop_user_unique
      unique (shop_id, user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_members_role_check'
      and conrelid = 'public.shop_members'::regclass
  ) then
    alter table public.shop_members
      add constraint shop_members_role_check
      check (role in ('owner', 'admin', 'manager', 'support', 'catalog', 'member'));
  end if;
end
$$;

create index if not exists idx_shop_members_shop_id
  on public.shop_members(shop_id);

create index if not exists idx_shop_members_user_id
  on public.shop_members(user_id);

create or replace function public.is_shop_internal_user(target_shop_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shops s
    where s.id = target_shop_id
      and target_user_id is not null
      and (
        s.owner_user_id = target_user_id
        or exists (
          select 1
          from public.shop_members sm
          where sm.shop_id = target_shop_id
            and sm.user_id = target_user_id
        )
      )
  );
$$;

drop trigger if exists trg_shop_members_updated_at on public.shop_members;
create trigger trg_shop_members_updated_at
before update on public.shop_members
for each row execute function public.set_updated_at();

alter table public.shop_members enable row level security;

grant select, insert, update, delete on public.shop_members to authenticated;
grant execute on function public.is_shop_internal_user(uuid, uuid) to authenticated;

drop policy if exists "shop owners and members can read memberships" on public.shop_members;
create policy "shop owners and members can read memberships"
on public.shop_members
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.shops s
    where s.id = shop_members.shop_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can insert memberships" on public.shop_members;
create policy "shop owners can insert memberships"
on public.shop_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.shops s
    where s.id = shop_members.shop_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update memberships" on public.shop_members;
create policy "shop owners can update memberships"
on public.shop_members
for update
to authenticated
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_members.shop_id
      and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shops s
    where s.id = shop_members.shop_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can delete memberships" on public.shop_members;
create policy "shop owners can delete memberships"
on public.shop_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_members.shop_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own orders" on public.orders;
create policy "buyers can insert own orders"
on public.orders
for insert
to authenticated
with check (
  auth.uid() = buyer_user_id
  and exists (
    select 1 from public.shops s
    where s.id = orders.shop_id
  )
  and not public.is_shop_internal_user(orders.shop_id, auth.uid())
);

analyze public.shop_members;
