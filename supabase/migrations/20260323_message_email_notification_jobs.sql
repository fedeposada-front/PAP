-- 2026-03-23
-- Queue email notifications for marketplace messages.
-- Safe to run multiple times.

create table if not exists public.message_email_notifications (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'email',
  template_key text not null default 'message_reply',
  status text not null default 'pending',
  attempt_count integer not null default 0,
  scheduled_at timestamptz not null default now(),
  processed_at timestamptz,
  provider text,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'message_email_notifications_message_unique'
      and conrelid = 'public.message_email_notifications'::regclass
  ) then
    alter table public.message_email_notifications
      add constraint message_email_notifications_message_unique
      unique (message_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'message_email_notifications_status_allowed'
      and conrelid = 'public.message_email_notifications'::regclass
  ) then
    alter table public.message_email_notifications
      add constraint message_email_notifications_status_allowed
      check (
        status = any (
          array['pending','processing','sent','failed','provider_missing']::text[]
        )
      );
  end if;
end
$$;

create index if not exists idx_message_email_notifications_status_scheduled_at
  on public.message_email_notifications(status, scheduled_at, created_at);

create index if not exists idx_message_email_notifications_recipient_status
  on public.message_email_notifications(recipient_user_id, status, created_at desc);

create or replace function public.enqueue_message_email_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_recipient_user_id uuid;
begin
  select
    case
      when c.buyer_user_id = new.sender_user_id then s.owner_user_id
      else c.buyer_user_id
    end
  into next_recipient_user_id
  from public.conversations c
  join public.shops s on s.id = c.shop_id
  where c.id = new.conversation_id;

  if next_recipient_user_id is null or next_recipient_user_id = new.sender_user_id then
    return new;
  end if;

  insert into public.message_email_notifications (
    message_id,
    conversation_id,
    sender_user_id,
    recipient_user_id
  )
  values (
    new.id,
    new.conversation_id,
    new.sender_user_id,
    next_recipient_user_id
  )
  on conflict (message_id) do nothing;

  return new;
end
$$;

drop trigger if exists trg_message_email_notifications_updated_at on public.message_email_notifications;
create trigger trg_message_email_notifications_updated_at
before update on public.message_email_notifications
for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_enqueue_email_notification on public.messages;
create trigger trg_messages_enqueue_email_notification
after insert on public.messages
for each row execute function public.enqueue_message_email_notification();

alter table public.message_email_notifications enable row level security;

grant select on public.shops to service_role;
grant select on public.conversations to service_role;
grant select on public.messages to service_role;
grant select, update on public.message_email_notifications to service_role;

analyze public.message_email_notifications;
