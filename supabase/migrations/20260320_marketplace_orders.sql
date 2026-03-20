-- 2026-03-20
-- Marketplace orders, deposits, shipments, payment attempts, and payouts.
-- Safe to run multiple times.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_fulfillment_type' and n.nspname = 'public'
  ) then
    create type public.order_fulfillment_type as enum ('pickup', 'delivery');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payment_policy' and n.nspname = 'public'
  ) then
    create type public.order_payment_policy as enum ('full_payment', 'deposit_20');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_status' and n.nspname = 'public'
  ) then
    create type public.order_status as enum (
      'draft',
      'awaiting_payment',
      'reserved',
      'paid',
      'ready_for_pickup',
      'picked_up',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
      'refunded'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payment_status' and n.nspname = 'public'
  ) then
    create type public.order_payment_status as enum (
      'unpaid',
      'partially_paid',
      'paid',
      'payment_failed',
      'partially_refunded',
      'refunded'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payout_status' and n.nspname = 'public'
  ) then
    create type public.order_payout_status as enum (
      'pending',
      'eligible',
      'released',
      'paid',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_attempt_status' and n.nspname = 'public'
  ) then
    create type public.payment_attempt_status as enum (
      'created',
      'pending',
      'requires_action',
      'succeeded',
      'failed',
      'cancelled',
      'refunded'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_attempt_scope' and n.nspname = 'public'
  ) then
    create type public.payment_attempt_scope as enum (
      'full',
      'deposit',
      'balance',
      'adjustment'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'shipment_status' and n.nspname = 'public'
  ) then
    create type public.shipment_status as enum (
      'pending',
      'ready',
      'shipped',
      'delivered',
      'issue',
      'cancelled'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'delivery_method' and n.nspname = 'public'
  ) then
    create type public.delivery_method as enum ('hand', 'post', 'carrier');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payout_status' and n.nspname = 'public'
  ) then
    create type public.payout_status as enum (
      'pending',
      'eligible',
      'scheduled',
      'paid',
      'failed',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('MCL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  fulfillment_type public.order_fulfillment_type not null,
  payment_policy public.order_payment_policy not null default 'full_payment',
  status public.order_status not null default 'draft',
  payment_status public.order_payment_status not null default 'unpaid',
  payout_status public.order_payout_status not null default 'pending',
  currency text not null default 'eur',
  items_subtotal numeric(10,2) not null default 0 check (items_subtotal >= 0),
  delivery_price numeric(10,2) not null default 0 check (delivery_price >= 0),
  buyer_fee numeric(10,2) not null default 0 check (buyer_fee >= 0),
  platform_fee numeric(10,2) not null default 0 check (platform_fee >= 0),
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(10,2) not null default 0 check (paid_amount >= 0),
  deposit_rate numeric(5,4) not null default 0 check (deposit_rate >= 0 and deposit_rate <= 1),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  remaining_amount numeric(10,2) not null default 0 check (remaining_amount >= 0),
  seller_payout_amount numeric(10,2) not null default 0 check (seller_payout_amount >= 0),
  customer_note text,
  internal_note text,
  provider text not null default 'stripe',
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  provider_transfer_group text,
  reservation_expires_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  picked_up_at timestamptz,
  customer_confirmed_received_at timestamptz,
  payout_eligible_at timestamptz,
  payout_released_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  shop_id uuid not null references public.shops(id) on delete restrict,
  title text not null,
  image_url text,
  color text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  scope public.payment_attempt_scope not null default 'full',
  status public.payment_attempt_status not null default 'created',
  provider text not null default 'stripe',
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'eur',
  provider_checkout_session_id text,
  provider_payment_intent_id text,
  provider_charge_id text,
  idempotency_key text,
  raw_payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method public.delivery_method not null,
  status public.shipment_status not null default 'pending',
  service_name text,
  carrier_name text,
  price numeric(10,2) not null default 0 check (price >= 0),
  recipient_name text,
  recipient_phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country_code text not null default 'FR',
  tracking_number text,
  tracking_url text,
  shipping_label_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  deposit_required boolean not null default false,
  deposit_rate numeric(5,4) not null default 0 check (deposit_rate >= 0 and deposit_rate <= 1),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  remaining_due_amount numeric(10,2) not null default 0 check (remaining_due_amount >= 0),
  expires_at timestamptz,
  reserved_at timestamptz,
  picked_up_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete restrict,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'eur',
  status public.payout_status not null default 'pending',
  provider text not null default 'stripe',
  provider_transfer_id text,
  provider_payout_id text,
  available_at timestamptz,
  released_at timestamptz,
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_currency_format'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_currency_format
      check (currency ~ '^[a-z]{3}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_deposit_policy_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_deposit_policy_check
      check (payment_policy <> 'deposit_20' or fulfillment_type = 'pickup');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_paid_amount_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_paid_amount_check
      check (paid_amount <= total_amount);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_deposit_amount_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_deposit_amount_check
      check (deposit_amount <= total_amount);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_remaining_amount_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_remaining_amount_check
      check (remaining_amount <= total_amount);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_attempts_currency_format'
      and conrelid = 'public.payment_attempts'::regclass
  ) then
    alter table public.payment_attempts
      add constraint payment_attempts_currency_format
      check (currency ~ '^[a-z]{3}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shipments_country_code_format'
      and conrelid = 'public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_country_code_format
      check (country_code ~ '^[A-Z]{2}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payouts_currency_format'
      and conrelid = 'public.payouts'::regclass
  ) then
    alter table public.payouts
      add constraint payouts_currency_format
      check (currency ~ '^[a-z]{3}$');
  end if;
end
$$;

create index if not exists idx_orders_buyer_created_at
  on public.orders(buyer_user_id, created_at desc);

create index if not exists idx_orders_shop_created_at
  on public.orders(shop_id, created_at desc);

create index if not exists idx_orders_status_payment_status
  on public.orders(status, payment_status, created_at desc);

create index if not exists idx_order_items_order_id
  on public.order_items(order_id, created_at asc);

create index if not exists idx_order_items_product_id
  on public.order_items(product_id);

create index if not exists idx_payment_attempts_order_created_at
  on public.payment_attempts(order_id, created_at desc);

create index if not exists idx_shipments_order_status
  on public.shipments(order_id, status);

create index if not exists idx_pickup_reservations_order_expires_at
  on public.pickup_reservations(order_id, expires_at);

create index if not exists idx_payouts_shop_status
  on public.payouts(shop_id, status, created_at desc);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_payment_attempts_updated_at on public.payment_attempts;
create trigger trg_payment_attempts_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

drop trigger if exists trg_pickup_reservations_updated_at on public.pickup_reservations;
create trigger trg_pickup_reservations_updated_at
before update on public.pickup_reservations
for each row execute function public.set_updated_at();

drop trigger if exists trg_payouts_updated_at on public.payouts;
create trigger trg_payouts_updated_at
before update on public.payouts
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.shipments enable row level security;
alter table public.pickup_reservations enable row level security;
alter table public.payouts enable row level security;

grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant select, insert, update on public.shipments to authenticated;
grant select, insert, update on public.pickup_reservations to authenticated;
grant select on public.payment_attempts to authenticated;
grant select on public.payouts to authenticated;

drop policy if exists "buyers can read own orders" on public.orders;
create policy "buyers can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = buyer_user_id);

drop policy if exists "shop owners can read own orders" on public.orders;
create policy "shop owners can read own orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_user_id = auth.uid()
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
);

drop policy if exists "buyers can update own orders" on public.orders;
create policy "buyers can update own orders"
on public.orders
for update
to authenticated
using (auth.uid() = buyer_user_id)
with check (auth.uid() = buyer_user_id);

drop policy if exists "shop owners can update own orders" on public.orders;
create policy "shop owners can update own orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shops s
    where s.id = orders.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own order items" on public.order_items;
create policy "buyers can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own order items" on public.order_items;
create policy "shop owners can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = order_items.shop_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own order items" on public.order_items;
create policy "buyers can insert own order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own shipments" on public.shipments;
create policy "buyers can read own shipments"
on public.shipments
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = shipments.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own shipments" on public.shipments;
create policy "shop owners can read own shipments"
on public.shipments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = shipments.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own shipments" on public.shipments;
create policy "buyers can insert own shipments"
on public.shipments
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = shipments.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update own shipments" on public.shipments;
create policy "shop owners can update own shipments"
on public.shipments
for update
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = shipments.order_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = shipments.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own pickup reservations" on public.pickup_reservations;
create policy "buyers can read own pickup reservations"
on public.pickup_reservations
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = pickup_reservations.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own pickup reservations" on public.pickup_reservations;
create policy "shop owners can read own pickup reservations"
on public.pickup_reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = pickup_reservations.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can insert own pickup reservations" on public.pickup_reservations;
create policy "buyers can insert own pickup reservations"
on public.pickup_reservations
for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = pickup_reservations.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can update own pickup reservations" on public.pickup_reservations;
create policy "shop owners can update own pickup reservations"
on public.pickup_reservations
for update
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = pickup_reservations.order_id and s.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = pickup_reservations.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "buyers can read own payment attempts" on public.payment_attempts;
create policy "buyers can read own payment attempts"
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = payment_attempts.order_id and o.buyer_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own payment attempts" on public.payment_attempts;
create policy "shop owners can read own payment attempts"
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.shops s on s.id = o.shop_id
    where o.id = payment_attempts.order_id and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "shop owners can read own payouts" on public.payouts;
create policy "shop owners can read own payouts"
on public.payouts
for select
to authenticated
using (
  exists (
    select 1 from public.shops s
    where s.id = payouts.shop_id and s.owner_user_id = auth.uid()
  )
);

analyze public.orders;
analyze public.order_items;
analyze public.payment_attempts;
analyze public.shipments;
analyze public.pickup_reservations;
analyze public.payouts;
