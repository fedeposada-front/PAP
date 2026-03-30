import { toShopSlug } from "../utils/shopRouting";
import { fetchManagedShopAccess } from "./shopAccess";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface ShopNewsItem {
  id: string;
  shopId: string;
  title: string;
  description: string;
  imageUrl: string;
  isPublished: boolean;
  createdAt: string;
}

export interface FeedNewsItem extends ShopNewsItem {
  shopName: string;
  shopSlug: string;
  shopImageUrl: string;
  likeCount: number;
  likedByMe: boolean;
}

interface ShopNewsRow {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
}

interface SellerShopRow {
  id: string;
}

interface FeedShopRow {
  id: string;
  name: string;
  slug?: string | null;
  logo_image_url: string | null;
}

interface NewsLikeRow {
  news_id: string;
  user_id: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function encodeInList(values: string[]): string {
  return values.map((value) => `"${value}"`).join(",");
}

function mapNews(row: ShopNewsRow): ShopNewsItem {
  return {
    id: row.id,
    shopId: row.shop_id,
    title: row.title,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

async function requestSupabaseAnon<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur lors du chargement des actualités.";
    throw new Error(message);
  }
  return payload as T;
}

async function requestSupabaseAuth<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur lors de l'écriture des actualités.";
    throw new Error(message);
  }
  return payload as T;
}

async function getSellerShopId(userId: string, accessToken: string): Promise<string> {
  const access = await fetchManagedShopAccess({ userId, accessToken });
  if (access?.shopId) {
    return access.shopId;
  }

  const rows = await requestSupabaseAuth<SellerShopRow[]>(
    `shops?owner_user_id=eq.${userId}&select=id&order=created_at.asc&limit=1`,
    { method: "GET" },
    accessToken
  );
  const shopId = rows[0]?.id;
  if (!shopId) {
    throw new Error("Aucune boutique trouvée pour ce compte.");
  }
  return shopId;
}

export async function fetchPublicShopNews(shopId: string): Promise<ShopNewsItem[]> {
  if (!hasSupabaseConfig()) return [];
  const rows = await requestSupabaseAnon<ShopNewsRow[]>(
    `shop_news?shop_id=eq.${shopId}&is_published=eq.true&select=id,shop_id,title,description,image_url,is_published,created_at&order=created_at.desc`
  );
  return rows.map(mapNews);
}

export async function fetchPublicShopNewsItem(params: {
  shopId: string;
  newsId: string;
}): Promise<ShopNewsItem | null> {
  if (!hasSupabaseConfig()) return null;
  const rows = await requestSupabaseAnon<ShopNewsRow[]>(
    `shop_news?id=eq.${params.newsId}&shop_id=eq.${params.shopId}&is_published=eq.true&select=id,shop_id,title,description,image_url,is_published,created_at&limit=1`
  );
  return rows[0] ? mapNews(rows[0]) : null;
}

export async function fetchNewsFeed(params?: {
  accessToken?: string | null;
  userId?: string | null;
}): Promise<FeedNewsItem[]> {
  if (!hasSupabaseConfig()) return [];

  const newsRows = await requestSupabaseAnon<ShopNewsRow[]>(
    "shop_news?is_published=eq.true&select=id,shop_id,title,description,image_url,is_published,created_at&order=created_at.desc"
  );
  if (newsRows.length === 0) return [];

  const shopIds = [...new Set(newsRows.map((row) => row.shop_id))];
  const newsIds = newsRows.map((row) => row.id);

  const [shopRows, likeRows, likedRows] = await Promise.all([
    requestSupabaseAnon<FeedShopRow[]>(
      `shops?id=in.(${encodeInList(shopIds)})&select=id,name,slug,logo_image_url`
    ).catch(async (error) => {
      const message = error instanceof Error ? error.message : "";
      if (!/slug|schema cache|column/i.test(message)) throw error;
      return requestSupabaseAnon<FeedShopRow[]>(
        `shops?id=in.(${encodeInList(shopIds)})&select=id,name,logo_image_url`
      );
    }),
    requestSupabaseAnon<NewsLikeRow[]>(
      `shop_news_likes?news_id=in.(${encodeInList(newsIds)})&select=news_id,user_id`
    ),
    params?.accessToken && params.userId
      ? requestSupabaseAuth<NewsLikeRow[]>(
          `shop_news_likes?news_id=in.(${encodeInList(newsIds)})&user_id=eq.${params.userId}&select=news_id,user_id`,
          { method: "GET" },
          params.accessToken
        )
      : Promise.resolve([] as NewsLikeRow[]),
  ]);

  const shopById = new Map(shopRows.map((shop) => [shop.id, shop]));
  const likeCountByNewsId = new Map<string, number>();
  for (const row of likeRows) {
    likeCountByNewsId.set(row.news_id, (likeCountByNewsId.get(row.news_id) ?? 0) + 1);
  }
  const likedByMe = new Set(likedRows.map((row) => row.news_id));

  return newsRows
    .map((row) => {
      const shop = shopById.get(row.shop_id);
      if (!shop) return null;
      const item = mapNews(row);
      return {
        ...item,
        shopName: shop.name,
        shopSlug: shop.slug?.trim() || toShopSlug(shop.name),
        shopImageUrl: shop.logo_image_url ?? item.imageUrl,
        likeCount: likeCountByNewsId.get(row.id) ?? 0,
        likedByMe: likedByMe.has(row.id),
      } satisfies FeedNewsItem;
    })
    .filter((item): item is FeedNewsItem => Boolean(item));
}

export async function fetchSellerShopNews(params: {
  userId: string;
  accessToken: string;
}): Promise<ShopNewsItem[]> {
  if (!hasSupabaseConfig()) return [];
  const shopId = await getSellerShopId(params.userId, params.accessToken);
  const rows = await requestSupabaseAuth<ShopNewsRow[]>(
    `shop_news?shop_id=eq.${shopId}&select=id,shop_id,title,description,image_url,is_published,created_at&order=created_at.desc`,
    { method: "GET" },
    params.accessToken
  );
  return rows.map(mapNews);
}

export async function createSellerShopNews(params: {
  userId: string;
  accessToken: string;
  title: string;
  description: string;
  imageUrl: string;
  isPublished: boolean;
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  const shopId = await getSellerShopId(params.userId, params.accessToken);
  await requestSupabaseAuth(
    "shop_news",
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        shop_id: shopId,
        title: params.title.trim(),
        description: params.description.trim() || null,
        image_url: params.imageUrl.trim() || null,
        is_published: params.isPublished,
      }]),
    },
    params.accessToken
  );
}

export async function updateSellerShopNewsPublishStatus(params: {
  newsId: string;
  accessToken: string;
  isPublished: boolean;
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  await requestSupabaseAuth(
    `shop_news?id=eq.${params.newsId}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        is_published: params.isPublished,
      }),
    },
    params.accessToken
  );
}

export async function updateSellerShopNews(params: {
  newsId: string;
  accessToken: string;
  title: string;
  description: string;
  imageUrl: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  await requestSupabaseAuth(
    `shop_news?id=eq.${params.newsId}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        title: params.title.trim(),
        description: params.description.trim() || null,
        image_url: params.imageUrl.trim() || null,
      }),
    },
    params.accessToken
  );
}

export async function likeShopNews(params: {
  newsId: string;
  userId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;
  await requestSupabaseAuth(
    "shop_news_likes",
    {
      method: "POST",
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify([{
        news_id: params.newsId,
        user_id: params.userId,
      }]),
    },
    params.accessToken
  );
}

export async function unlikeShopNews(params: {
  newsId: string;
  userId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;
  await requestSupabaseAuth(
    `shop_news_likes?news_id=eq.${params.newsId}&user_id=eq.${params.userId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
    params.accessToken
  );
}

export async function deleteSellerShopNews(params: {
  newsId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  await requestSupabaseAuth(
    `shop_news?id=eq.${params.newsId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
    params.accessToken
  );
}
