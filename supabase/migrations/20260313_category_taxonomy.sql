-- 2026-03-13
-- Category taxonomy in database: group -> subcategory
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Taxonomy tables
-- ---------------------------------------------------------------------------
create table if not exists public.category_groups (
  id text primary key,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_groups_id_format check (id ~ '^[a-z0-9-]+$')
);

create table if not exists public.categories (
  id text primary key,
  group_id text not null references public.category_groups(id) on delete restrict,
  label text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_id_format check (id ~ '^[a-z0-9-]+$')
);

create index if not exists idx_categories_group_id_sort
  on public.categories(group_id, sort_order, label);

-- ---------------------------------------------------------------------------
-- Seed groups
-- ---------------------------------------------------------------------------
insert into public.category_groups (id, label, icon, sort_order)
values
  ('alimentation', 'Alimentation', 'food', 10),
  ('artistique', 'Artistique', 'palette', 20),
  ('mode-beaute', 'Mode et Beaute', 'sparkles', 30),
  ('maison-jardin', 'Maison et Jardin', 'home', 40),
  ('famille-loisirs', 'Famille et Loisirs', 'users', 50)
on conflict (id) do update
set
  label = excluded.label,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Seed subcategories
-- ---------------------------------------------------------------------------
insert into public.categories (id, group_id, label, icon, sort_order)
values
  ('gourmand', 'alimentation', 'Epicerie fine', 'gift', 10),
  ('boucherie', 'alimentation', 'Boucherie', 'beef', 20),
  ('boulangerie', 'alimentation', 'Boulangerie / Patisserie', 'croissant', 30),
  ('supermarche', 'alimentation', 'Supermarche', 'shopping-cart', 40),
  ('frais', 'alimentation', 'Produits frais', 'snowflake', 50),
  ('vin', 'alimentation', 'Vins, bieres et spiritueux', 'wine', 60),
  ('papeterie', 'artistique', 'Papeterie', 'pen', 10),
  ('ceramique', 'artistique', 'Ceramique', 'circle', 20),
  ('peinture', 'artistique', 'Peinture', 'brush', 30),
  ('illustration', 'artistique', 'Illustration', 'image', 40),
  ('art', 'artistique', 'Art et creations', 'palette', 50),
  ('artisanat', 'artistique', 'Artisanat et fait main', 'hammer', 60),
  ('mode', 'mode-beaute', 'Mode', 'shirt', 10),
  ('beaute', 'mode-beaute', 'Beaute et cosmetiques', 'sparkles', 20),
  ('bijoux', 'mode-beaute', 'Bijoux et montres', 'gem', 30),
  ('bienetre', 'mode-beaute', 'Bien-etre', 'heart', 40),
  ('deco', 'maison-jardin', 'Deco et maison', 'lamp', 10),
  ('bricolage', 'maison-jardin', 'Bricolage et jardin', 'wrench', 20),
  ('fleurs', 'maison-jardin', 'Fleurs et plantes', 'flower', 30),
  ('bebe', 'famille-loisirs', 'Bebe et enfants', 'baby', 10),
  ('jouets', 'famille-loisirs', 'Jouets et jeux', 'toy-brick', 20),
  ('livres', 'famille-loisirs', 'Livres', 'book', 30),
  ('sport', 'famille-loisirs', 'Sport et loisirs', 'dumbbell', 40),
  ('hightech', 'famille-loisirs', 'High-tech et accessoires', 'smartphone', 50),
  ('animaux', 'famille-loisirs', 'Animaux', 'paw-print', 60),
  ('auto', 'famille-loisirs', 'Auto et velo', 'car', 70)
on conflict (id) do update
set
  group_id = excluded.group_id,
  label = excluded.label,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Link existing entities to taxonomy
-- ---------------------------------------------------------------------------
alter table public.shops
  add column if not exists category_id text;

alter table public.products
  add column if not exists category_id text;

update public.shops s
set category = 'artisanat'
where not exists (select 1 from public.categories c where c.id = s.category);

update public.products p
set category = 'artisanat'
where not exists (select 1 from public.categories c where c.id = p.category);

update public.shops
set category_id = coalesce(category_id, category, 'artisanat');

update public.products
set category_id = coalesce(category_id, category, 'artisanat');

update public.shops
set category = coalesce(category_id, category, 'artisanat');

update public.products
set category = coalesce(category_id, category, 'artisanat');

alter table public.shops
  alter column category set default 'artisanat';

alter table public.products
  alter column category set default 'artisanat';

alter table public.shops
  alter column category_id set default 'artisanat';

alter table public.products
  alter column category_id set default 'artisanat';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_category_fk'
  ) then
    alter table public.shops
      add constraint shops_category_fk
      foreign key (category) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_fk'
  ) then
    alter table public.products
      add constraint products_category_fk
      foreign key (category) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_category_id_fk'
  ) then
    alter table public.shops
      add constraint shops_category_id_fk
      foreign key (category_id) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_id_fk'
  ) then
    alter table public.products
      add constraint products_category_id_fk
      foreign key (category_id) references public.categories(id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shops_category_sync_check'
  ) then
    alter table public.shops
      add constraint shops_category_sync_check
      check (category_id is null or category = category_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_sync_check'
  ) then
    alter table public.products
      add constraint products_category_sync_check
      check (category_id is null or category = category_id);
  end if;
end
$$;

create index if not exists idx_shops_category_id on public.shops(category_id);
create index if not exists idx_products_category_id on public.products(category_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_category_groups_updated_at on public.category_groups;
create trigger trg_category_groups_updated_at
before update on public.category_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security: read for everyone, writes reserved to service/admin flows
-- ---------------------------------------------------------------------------
alter table public.category_groups enable row level security;
alter table public.categories enable row level security;

grant select on public.category_groups to anon, authenticated;
grant select on public.categories to anon, authenticated;

drop policy if exists "category groups are readable by everyone" on public.category_groups;
create policy "category groups are readable by everyone"
on public.category_groups
for select
using (true);

drop policy if exists "categories are readable by everyone" on public.categories;
create policy "categories are readable by everyone"
on public.categories
for select
using (true);
