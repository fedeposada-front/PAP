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

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
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
