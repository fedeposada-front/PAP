-- 2026-03-23
-- Marketplace conversations and messages.
-- Safe to run multiple times.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  buyer_display_name text not null default 'Client',
  shop_id uuid not null references public.shops(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.conversations add column if not exists buyer_display_name text;

update public.conversations c
set buyer_display_name = coalesce(
  nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
  'Client'
)
from public.profiles p
where p.id = c.buyer_user_id
  and (c.buyer_display_name is null or btrim(c.buyer_display_name) = '');

update public.conversations
set buyer_display_name = 'Client'
where buyer_display_name is null or btrim(buyer_display_name) = '';

alter table public.conversations
  alter column buyer_display_name set default 'Client';

alter table public.conversations
  alter column buyer_display_name set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_buyer_shop_unique'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_buyer_shop_unique
      unique (buyer_user_id, shop_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_body_not_blank'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_body_not_blank
      check (char_length(btrim(body)) > 0);
  end if;
end
$$;

create index if not exists idx_conversations_buyer_last_message_at
  on public.conversations(buyer_user_id, last_message_at desc);

create index if not exists idx_conversations_shop_last_message_at
  on public.conversations(shop_id, last_message_at desc);

create index if not exists idx_messages_conversation_created_at
  on public.messages(conversation_id, created_at asc);

create index if not exists idx_messages_sender_created_at
  on public.messages(sender_user_id, created_at desc);

create or replace function public.sync_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 160),
    updated_at = now()
  where id = new.conversation_id;

  return new;
end
$$;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_sync_conversation on public.messages;
create trigger trg_messages_sync_conversation
after insert on public.messages
for each row execute function public.sync_conversation_last_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

drop policy if exists "buyers and shop owners can read conversations" on public.conversations;
create policy "buyers and shop owners can read conversations"
on public.conversations
for select
to authenticated
using (
  auth.uid() = buyer_user_id
  or exists (
    select 1 from public.shops s
    where s.id = conversations.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can create conversations" on public.conversations;
create policy "buyers can create conversations"
on public.conversations
for insert
to authenticated
with check (
  auth.uid() = buyer_user_id
  and exists (
    select 1 from public.shops s
    where s.id = conversations.shop_id
  )
);

drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    join public.shops s on s.id = c.shop_id
    where c.id = messages.conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or s.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists "participants can send messages" on public.messages;
create policy "participants can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and exists (
    select 1
    from public.conversations c
    join public.shops s on s.id = c.shop_id
    where c.id = messages.conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or s.owner_user_id = auth.uid()
      )
  )
);

analyze public.conversations;
analyze public.messages;
