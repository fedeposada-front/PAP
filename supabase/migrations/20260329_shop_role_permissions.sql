-- 2026-03-29
-- Role-based backoffice permissions for shop members.
-- Safe to run multiple times.

create or replace function public.has_shop_member_role(
  target_shop_id uuid,
  target_user_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shop_members sm
    left join public.shop_member_roles smr on smr.shop_member_id = sm.id
    where sm.shop_id = target_shop_id
      and sm.user_id = target_user_id
      and (
        sm.role = any (allowed_roles)
        or smr.role = any (allowed_roles)
      )
  );
$$;

create or replace function public.has_shop_permission(
  target_shop_id uuid,
  target_user_id uuid,
  capability text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_user_id is null then false
    when exists (
      select 1
      from public.shops s
      where s.id = target_shop_id
        and s.owner_user_id = target_user_id
    ) then true
    when capability = 'manage_catalog' then public.has_shop_member_role(target_shop_id, target_user_id, array['manager', 'catalog'])
    when capability = 'manage_content' then public.has_shop_member_role(target_shop_id, target_user_id, array['manager', 'content'])
    when capability = 'support' then public.has_shop_member_role(target_shop_id, target_user_id, array['manager', 'support'])
    when capability = 'manage_members' then false
    when capability = 'manage_settings' then false
    else false
  end;
$$;

grant execute on function public.has_shop_member_role(uuid, uuid, text[]) to authenticated;
grant execute on function public.has_shop_permission(uuid, uuid, text) to authenticated;

drop policy if exists "shop owners can manage own collections" on public.shop_collections;
create policy "shop owners and catalog members can manage collections"
on public.shop_collections
for all
to authenticated
using (
  public.has_shop_permission(shop_collections.shop_id, auth.uid(), 'manage_catalog')
)
with check (
  public.has_shop_permission(shop_collections.shop_id, auth.uid(), 'manage_catalog')
);

drop policy if exists "shop owners can read own shop news" on public.shop_news;
create policy "shop owners and content members can read own shop news"
on public.shop_news
for select
to authenticated
using (
  public.has_shop_permission(shop_news.shop_id, auth.uid(), 'manage_content')
);

drop policy if exists "shop owners can insert own shop news" on public.shop_news;
create policy "shop owners and content members can insert own shop news"
on public.shop_news
for insert
to authenticated
with check (
  public.has_shop_permission(shop_news.shop_id, auth.uid(), 'manage_content')
);

drop policy if exists "shop owners can update own shop news" on public.shop_news;
create policy "shop owners and content members can update own shop news"
on public.shop_news
for update
to authenticated
using (
  public.has_shop_permission(shop_news.shop_id, auth.uid(), 'manage_content')
)
with check (
  public.has_shop_permission(shop_news.shop_id, auth.uid(), 'manage_content')
);

drop policy if exists "shop owners can delete own shop news" on public.shop_news;
create policy "shop owners and content members can delete own shop news"
on public.shop_news
for delete
to authenticated
using (
  public.has_shop_permission(shop_news.shop_id, auth.uid(), 'manage_content')
);

drop policy if exists "shop owners can insert products" on public.products;
create policy "shop owners and catalog members can insert products"
on public.products
for insert
to authenticated
with check (
  public.has_shop_permission(products.shop_id, auth.uid(), 'manage_catalog')
);

drop policy if exists "shop owners can update products" on public.products;
create policy "shop owners and catalog members can update products"
on public.products
for update
to authenticated
using (
  public.has_shop_permission(products.shop_id, auth.uid(), 'manage_catalog')
)
with check (
  public.has_shop_permission(products.shop_id, auth.uid(), 'manage_catalog')
);

drop policy if exists "shop owners can delete products" on public.products;
create policy "shop owners and catalog members can delete products"
on public.products
for delete
to authenticated
using (
  public.has_shop_permission(products.shop_id, auth.uid(), 'manage_catalog')
);

drop policy if exists "shop owners can read own lead events" on public.lead_events;
create policy "shop owners and support members can read own lead events"
on public.lead_events
for select
to authenticated
using (
  public.has_shop_permission(lead_events.shop_id, auth.uid(), 'support')
);

drop policy if exists "buyers and shop owners can read conversations" on public.conversations;
create policy "buyers and shop staff can read conversations"
on public.conversations
for select
to authenticated
using (
  auth.uid() = buyer_user_id
  or public.has_shop_permission(conversations.shop_id, auth.uid(), 'support')
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
    where c.id = messages.conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or public.has_shop_permission(c.shop_id, auth.uid(), 'support')
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
    where c.id = messages.conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or public.has_shop_permission(c.shop_id, auth.uid(), 'support')
      )
  )
);

analyze public.shop_collections;
analyze public.shop_news;
analyze public.products;
analyze public.lead_events;
analyze public.conversations;
analyze public.messages;
