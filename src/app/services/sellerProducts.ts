import type { Product } from "../types/catalog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const FALLBACK_IMAGE = "https://placehold.co/640x640?text=MonCadeauLocal";

interface ShopRow {
  id: string;
  name: string;
}

interface ProfileRow {
  shop_name: string | null;
  shop_address: string | null;
}

interface ProductRow {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  main_image_url: string | null;
  image_urls: string[] | null;
  categories: string[] | null;
  category: string;
  available_today: boolean;
  stock: number;
  pickup: boolean;
  delivery: boolean;
  created_at: string;
  is_published: boolean;
  sold_count: number | null;
}

interface RequestOptions {
  accessToken: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function encodeInList(ids: string[]) {
  return ids.map((id) => `"${id}"`).join(",");
}

async function requestSupabase<T>(path: string, init: RequestInit, options: RequestOptions): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${options.accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : `Supabase request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function mapProduct(row: ProductRow, shopName: string): Product {
  const soldCount = Number(row.sold_count ?? 0);
  const status: Product["status"] =
    row.is_published ? "published" : soldCount > 0 ? "disabled" : "draft";

  return {
    id: row.id,
    shopId: row.shop_id,
    shopName,
    title: row.title,
    price: Number(row.price),
    image: row.image_url ?? row.main_image_url ?? FALLBACK_IMAGE,
    category: row.categories?.[0] ?? row.category,
    availableToday: row.available_today,
    stock: row.stock,
    description: row.description ?? "",
    pickup: row.pickup,
    delivery: row.delivery,
    addedAt: row.created_at,
    isPublished: row.is_published,
    soldCount,
    status,
  };
}

async function getOrCreateSellerShop(userId: string, accessToken: string): Promise<ShopRow> {
  const existing = await requestSupabase<ShopRow[]>(
    `shops?owner_user_id=eq.${userId}&select=id,name&order=created_at.asc&limit=1`,
    { method: "GET" },
    { accessToken }
  );
  if (existing[0]) return existing[0];

  const profileRows = await requestSupabase<ProfileRow[]>(
    `profiles?id=eq.${userId}&select=shop_name,shop_address&limit=1`,
    { method: "GET" },
    { accessToken }
  );
  const profile = profileRows[0];

  const inserted = await requestSupabase<ShopRow[]>(
    "shops",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        owner_user_id: userId,
        name: profile?.shop_name?.trim() || "Ma boutique",
        category: "artisanat",
        description: "",
        address: profile?.shop_address?.trim() || "Adresse a renseigner",
        city: "Amiens",
        phone: "",
        is_open: false,
        pickup_today: false,
        open_sunday: false,
        delivery: false,
        hours: "",
      }]),
    },
    { accessToken }
  );

  if (!inserted[0]) {
    throw new Error("Impossible de creer la boutique.");
  }
  return inserted[0];
}

export async function fetchSellerProducts(params: {
  userId: string;
  accessToken: string;
}): Promise<Product[]> {
  if (!hasSupabaseConfig()) return [];

  const shops = await requestSupabase<ShopRow[]>(
    `shops?owner_user_id=eq.${params.userId}&select=id,name`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );
  if (shops.length === 0) return [];

  const shopIds = shops.map((shop) => shop.id);
  const encodedIds = encodeInList(shopIds);
  const productRows = await requestSupabase<ProductRow[]>(
    `products?shop_id=in.(${encodedIds})&select=id,shop_id,title,description,price,image_url,main_image_url,image_urls,categories,category,available_today,stock,pickup,delivery,created_at,is_published,sold_count&order=created_at.desc`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );

  const shopById = new Map(shops.map((shop) => [shop.id, shop.name]));
  return productRows.map((row) => mapProduct(row, shopById.get(row.shop_id) ?? "Boutique"));
}

export async function createSellerProduct(params: {
  userId: string;
  accessToken: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  categories: string[];
  pickup: boolean;
  delivery: boolean;
  isPublished: boolean;
  mainImageUrl?: string;
  imageUrls?: string[];
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const shop = await getOrCreateSellerShop(params.userId, params.accessToken);

  const normalizedImageUrls = (params.imageUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);
  const mainImage = params.mainImageUrl?.trim() || normalizedImageUrls[0] || null;
  const mainImageForIndexedColumn =
    mainImage && mainImage.startsWith("data:")
      ? FALLBACK_IMAGE
      : mainImage;
  const normalizedCategories = params.categories.filter(Boolean);

  const legacyPayload = {
    shop_id: shop.id,
    title: params.title,
    description: params.description,
    price: params.price,
    image_url: mainImage,
    category: normalizedCategories[0] ?? "artisanat",
    available_today: params.pickup,
    stock: params.stock,
    pickup: params.pickup,
    delivery: params.delivery,
    is_published: params.isPublished,
    sold_count: 0,
  };

  const modernPayload = {
    ...legacyPayload,
    main_image_url: mainImageForIndexedColumn,
    image_urls: normalizedImageUrls.length > 0 ? normalizedImageUrls : (mainImage ? [mainImage] : []),
    categories: normalizedCategories.length > 0 ? normalizedCategories : ["artisanat"],
  };

  try {
    await requestSupabase(
      "products",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([modernPayload]),
      },
      { accessToken: params.accessToken }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingModernColumn =
      /column .* (main_image_url|image_urls|categories)/i.test(message) ||
      /schema cache/i.test(message);
    if (!missingModernColumn) {
      throw error;
    }

    await requestSupabase(
      "products",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([legacyPayload]),
      },
      { accessToken: params.accessToken }
    );
  }
}

export async function deleteSellerProduct(params: {
  productId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const rows = await requestSupabase<Array<{ sold_count: number | null }>>(
    `products?id=eq.${params.productId}&select=sold_count&limit=1`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );
  const soldCount = Number(rows[0]?.sold_count ?? 0);
  if (soldCount > 0) {
    throw new Error("Produit déjà vendu: suppression impossible.");
  }

  await requestSupabase(
    `products?id=eq.${params.productId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
    { accessToken: params.accessToken }
  );
}

export async function updateSellerProductPublishStatus(params: {
  productId: string;
  accessToken: string;
  isPublished: boolean;
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  await requestSupabase(
    `products?id=eq.${params.productId}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        is_published: params.isPublished,
      }),
    },
    { accessToken: params.accessToken }
  );
}
