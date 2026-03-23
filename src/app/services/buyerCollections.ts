import { toShopSlug } from "../utils/shopRouting";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface FavoriteRow {
  product_id: string;
}

interface FollowedRow {
  shop_id: string;
}

interface ProductRow {
  id: string;
  title: string;
  price: number;
  category: string;
  shop_id: string;
}

interface ShopRow {
  id: string;
  name: string;
  category: string;
  slug?: string | null;
}

export interface FavoriteProductItem {
  id: string;
  title: string;
  price: number;
  category: string;
  shopId: string;
  shopName: string;
  shopSlug?: string;
}

export interface FollowedShopItem {
  id: string;
  name: string;
  category: string;
  slug?: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function requestSupabase<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur de lecture des donnees utilisateur.";
    throw new Error(message);
  }

  return payload as T;
}

function encodeInList(ids: string[]) {
  return ids.map((id) => `"${id}"`).join(",");
}

export async function fetchFavoriteProducts(params: {
  userId: string;
  accessToken: string;
}): Promise<FavoriteProductItem[]> {
  if (!hasSupabaseConfig()) return [];

  const favoriteRows = await requestSupabase<FavoriteRow[]>(
    `favorite_products?user_id=eq.${params.userId}&select=product_id&order=created_at.desc`,
    params.accessToken
  );
  if (favoriteRows.length === 0) return [];

  const productIds = [...new Set(favoriteRows.map((row) => row.product_id))];
  const products = await requestSupabase<ProductRow[]>(
    `products?id=in.(${encodeInList(productIds)})&select=id,title,price,category,shop_id`,
    params.accessToken
  );
  if (products.length === 0) return [];

  const shopIds = [...new Set(products.map((product) => product.shop_id))];
  const shops = await requestSupabase<ShopRow[]>(
    `shops?id=in.(${encodeInList(shopIds)})&select=id,name,category,slug`,
    params.accessToken
  ).catch(async (error) => {
    const message = error instanceof Error ? error.message : "";
    if (!/slug|schema cache|column/i.test(message)) throw error;
    return requestSupabase<ShopRow[]>(
      `shops?id=in.(${encodeInList(shopIds)})&select=id,name,category`,
      params.accessToken
    );
  });
  const shopById = new Map(shops.map((shop) => [shop.id, shop]));
  const productById = new Map(products.map((product) => [product.id, product]));

  const favoriteItems: FavoriteProductItem[] = [];
  for (const row of favoriteRows) {
    const product = productById.get(row.product_id);
    if (!product) continue;
    const shop = shopById.get(product.shop_id);
    favoriteItems.push({
      id: product.id,
      title: product.title,
      price: product.price,
      category: product.category,
      shopId: product.shop_id,
      shopName: shop?.name ?? "Boutique",
      shopSlug: shop?.slug?.trim() || (shop ? toShopSlug(shop.name) : undefined),
    });
  }
  return favoriteItems;
}

export async function fetchFollowedShops(params: {
  userId: string;
  accessToken: string;
}): Promise<FollowedShopItem[]> {
  if (!hasSupabaseConfig()) return [];

  const followedRows = await requestSupabase<FollowedRow[]>(
    `followed_shops?user_id=eq.${params.userId}&select=shop_id&order=created_at.desc`,
    params.accessToken
  );
  if (followedRows.length === 0) return [];

  const shopIds = [...new Set(followedRows.map((row) => row.shop_id))];
  const shops = await requestSupabase<ShopRow[]>(
    `shops?id=in.(${encodeInList(shopIds)})&select=id,name,category,slug`,
    params.accessToken
  ).catch(async (error) => {
    const message = error instanceof Error ? error.message : "";
    if (!/slug|schema cache|column/i.test(message)) throw error;
    return requestSupabase<ShopRow[]>(
      `shops?id=in.(${encodeInList(shopIds)})&select=id,name,category`,
      params.accessToken
    );
  });
  const shopById = new Map(shops.map((shop) => [shop.id, shop]));

  const followedItems: FollowedShopItem[] = [];
  for (const row of followedRows) {
    const shop = shopById.get(row.shop_id);
    if (!shop) continue;
    followedItems.push({
      id: shop.id,
      name: shop.name,
      category: shop.category,
      slug: shop.slug?.trim() || toShopSlug(shop.name),
    });
  }
  return followedItems;
}
