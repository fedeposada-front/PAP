-- 2026-03-29
-- Multi-role member model + email invitations.
-- Safe to run multiple times.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'shop_members_role_check'
      and conrelid = 'public.shop_members'::regclass
  ) then
    alter table public.shop_members
      drop constraint shop_members_role_check;
  end if;
end
$$;

alter table public.shop_members
  add column if not exists role text not null default 'member';

update public.shop_members
set role = 'manager'
where role = 'admin';

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
      check (role in ('owner', 'manager', 'support', 'catalog', 'content', 'member'));
  end if;
end
$$;

create table if not exists public.shop_member_roles (
  id uuid primary key default gen_random_uuid(),
  shop_member_id uuid not null references public.shop_members(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_roles_unique'
      and conrelid = 'public.shop_member_roles'::regclass
  ) then
    alter table public.shop_member_roles
      add constraint shop_member_roles_unique
      unique (shop_member_id, role);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_roles_role_check'
      and conrelid = 'public.shop_member_roles'::regclass
  ) then
    alter table public.shop_member_roles
      add constraint shop_member_roles_role_check
      check (role in ('manager', 'support', 'catalog', 'content'));
  end if;
end
$$;

create index if not exists idx_shop_member_roles_member_id
  on public.shop_member_roles(shop_member_id);

insert into public.shop_member_roles (shop_member_id, role)
select sm.id, sm.role
from public.shop_members sm
where sm.role in ('manager', 'support', 'catalog', 'content')
on conflict do nothing;

create table if not exists public.shop_member_invitations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  invited_email text not null,
  primary_role text not null default 'support',
  token_hash text not null,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  last_sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  provider text,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_invitations_token_hash_unique'
      and conrelid = 'public.shop_member_invitations'::regclass
  ) then
    alter table public.shop_member_invitations
      add constraint shop_member_invitations_token_hash_unique
      unique (token_hash);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_invitations_primary_role_check'
      and conrelid = 'public.shop_member_invitations'::regclass
  ) then
    alter table public.shop_member_invitations
      add constraint shop_member_invitations_primary_role_check
      check (primary_role in ('manager', 'support', 'catalog', 'content'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_invitations_status_check'
      and conrelid = 'public.shop_member_invitations'::regclass
  ) then
    alter table public.shop_member_invitations
      add constraint shop_member_invitations_status_check
      check (status in ('pending', 'accepted', 'revoked', 'expired'));
  end if;
end
$$;

create index if not exists idx_shop_member_invitations_shop_status
  on public.shop_member_invitations(shop_id, status, created_at desc);

create index if not exists idx_shop_member_invitations_email
  on public.shop_member_invitations(lower(invited_email));

create table if not exists public.shop_member_invitation_roles (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.shop_member_invitations(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_invitation_roles_unique'
      and conrelid = 'public.shop_member_invitation_roles'::regclass
  ) then
    alter table public.shop_member_invitation_roles
      add constraint shop_member_invitation_roles_unique
      unique (invitation_id, role);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_member_invitation_roles_role_check'
      and conrelid = 'public.shop_member_invitation_roles'::regclass
  ) then
    alter table public.shop_member_invitation_roles
      add constraint shop_member_invitation_roles_role_check
      check (role in ('manager', 'support', 'catalog', 'content'));
  end if;
end
$$;

create index if not exists idx_shop_member_invitation_roles_invitation_id
  on public.shop_member_invitation_roles(invitation_id);

drop trigger if exists trg_shop_member_invitations_updated_at on public.shop_member_invitations;
create trigger trg_shop_member_invitations_updated_at
before update on public.shop_member_invitations
for each row execute function public.set_updated_at();

alter table public.shop_member_roles enable row level security;
alter table public.shop_member_invitations enable row level security;
alter table public.shop_member_invitation_roles enable row level security;

grant select, insert, update, delete on public.shop_member_roles to authenticated;
grant select, insert, update, delete on public.shop_member_invitations to authenticated;
grant select, insert, update, delete on public.shop_member_invitation_roles to authenticated;
grant select, insert, update on public.profiles to service_role;
grant select, insert, update, delete on public.shop_members to service_role;
grant select, insert, update, delete on public.shop_member_roles to service_role;
grant select, insert, update, delete on public.shop_member_invitations to service_role;
grant select, insert, update, delete on public.shop_member_invitation_roles to service_role;

drop policy if exists "shop owners and members can read member roles" on public.shop_member_roles;
create policy "shop owners and members can read member roles"
on public.shop_member_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_members sm
    where sm.id = shop_member_roles.shop_member_id
      and (
        sm.user_id = auth.uid()
        or exists (
          select 1
          from public.shops s
          where s.id = sm.shop_id
            and s.owner_user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "shop owners can manage member roles" on public.shop_member_roles;
create policy "shop owners can manage member roles"
on public.shop_member_roles
for all
to authenticated
using (
  exists (
    select 1
    from public.shop_members sm
    join public.shops s on s.id = sm.shop_id
    where sm.id = shop_member_roles.shop_member_id
      and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shop_members sm
    join public.shops s on s.id = sm.shop_id
    where sm.id = shop_member_roles.shop_member_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read invitations" on public.shop_member_invitations;
create policy "shop owners can read invitations"
on public.shop_member_invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_member_invitations.shop_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can manage invitations" on public.shop_member_invitations;
create policy "shop owners can manage invitations"
on public.shop_member_invitations
for all
to authenticated
using (
  exists (
    select 1
    from public.shops s
    where s.id = shop_member_invitations.shop_id
      and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shops s
    where s.id = shop_member_invitations.shop_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read invitation roles" on public.shop_member_invitation_roles;
create policy "shop owners can read invitation roles"
on public.shop_member_invitation_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_member_invitations inv
    join public.shops s on s.id = inv.shop_id
    where inv.id = shop_member_invitation_roles.invitation_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can manage invitation roles" on public.shop_member_invitation_roles;
create policy "shop owners can manage invitation roles"
on public.shop_member_invitation_roles
for all
to authenticated
using (
  exists (
    select 1
    from public.shop_member_invitations inv
    join public.shops s on s.id = inv.shop_id
    where inv.id = shop_member_invitation_roles.invitation_id
      and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shop_member_invitations inv
    join public.shops s on s.id = inv.shop_id
    where inv.id = shop_member_invitation_roles.invitation_id
      and s.owner_user_id = auth.uid()
  )
);

analyze public.shop_member_roles;
analyze public.shop_member_invitations;
analyze public.shop_member_invitation_roles;
