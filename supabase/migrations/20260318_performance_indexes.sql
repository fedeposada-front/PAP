-- 2026-03-18
-- Performance indexes for catalog, shop pages, product pages, follows, and news feed.
-- Safe to run multiple times.

-- Public shop listing and shop lookup
create index if not exists idx_shops_published_created_at
  on public.shops(is_published, created_at desc);

create index if not exists idx_shops_name_created_at
  on public.shops(name, created_at asc);

create index if not exists idx_shops_owner_created_at
  on public.shops(owner_user_id, created_at asc)
  where owner_user_id is not null;

-- Home feed, shop product listing, product detail
create index if not exists idx_products_published_created_at
  on public.products(is_published, created_at desc);

create index if not exists idx_products_shop_published_created_at
  on public.products(shop_id, is_published, created_at desc);

create index if not exists idx_products_collection_id
  on public.products(collection_id)
  where collection_id is not null;

-- Buyer favorites and followed shops
create index if not exists idx_favorite_products_user_created_at
  on public.favorite_products(user_id, created_at desc);

create index if not exists idx_followed_shops_user_created_at
  on public.followed_shops(user_id, created_at desc);

create index if not exists idx_followed_shops_shop_created_at
  on public.followed_shops(shop_id, created_at desc);

-- Seller collections
create index if not exists idx_shop_collections_shop_created_at
  on public.shop_collections(shop_id, created_at asc);

create index if not exists idx_shop_collections_shop_title
  on public.shop_collections(shop_id, title);

-- Shop news public feed and seller dashboard
create index if not exists idx_shop_news_shop_published_created_at
  on public.shop_news(shop_id, is_published, created_at desc);

create index if not exists idx_shop_news_published_created_at
  on public.shop_news(is_published, created_at desc);

-- Optional stats refresh for the planner after new indexes
analyze public.shops;
analyze public.products;
analyze public.favorite_products;
analyze public.followed_shops;
analyze public.shop_collections;
analyze public.shop_news;
