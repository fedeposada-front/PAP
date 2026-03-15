import type { Product } from "../types/catalog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const FALLBACK_IMAGE = "https://placehold.co/640x640?text=MonCadeauLocal";

interface ShopRow {
  id: string;
  name: string;
  owner_user_id?: string | null;
}

interface ProfileRow {
  shop_name: string | null;
  shop_address: string | null;
}

async function findLegacyShopsByName(shopName: string, accessToken: string): Promise<ShopRow[]> {
  const normalizedName = shopName.trim();
  if (!normalizedName) return [];
  return requestSupabase<ShopRow[]>(
    `shops?name=eq.${encodeURIComponent(normalizedName)}&select=id,name,owner_user_id&order=created_at.asc`,
    { method: "GET" },
    { accessToken }
  );
}

async function claimLegacyShopIfNeeded(params: {
  userId: string;
  accessToken: string;
  shopName?: string | null;
}): Promise<ShopRow | null> {
  const normalizedName = params.shopName?.trim();
  if (!normalizedName) return null;

  const legacyShops = await findLegacyShopsByName(normalizedName, params.accessToken);
  const claimableShop = legacyShops.find((shop) => !shop.owner_user_id || shop.owner_user_id === params.userId);
  if (!claimableShop) return null;

  if (claimableShop.owner_user_id === params.userId) {
    return claimableShop;
  }

  const updated = await requestSupabase<ShopRow[]>(
    `shops?id=eq.${claimableShop.id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        owner_user_id: params.userId,
      }),
    },
    { accessToken: params.accessToken }
  );

  return updated[0] ?? { ...claimableShop, owner_user_id: params.userId };
}

interface ProductRow {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  features: string | null;
  composition: string | null;
  return_conditions: string | null;
  color: string | null;
  colors: string[] | null;
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

interface ShopCollectionRow {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  year: number | null;
  image_url: string | null;
}

export interface SellerShopCollection {
  id: string;
  shopId: string;
  title: string;
  description: string;
  year?: number;
  imageUrl?: string;
}

interface RequestOptions {
  accessToken: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function isSchemaColumnError(message: string, columns: string[]) {
  const normalizedMessage = message.toLowerCase();
  return (
    columns.some((column) => {
      const normalizedColumn = column.toLowerCase();
      return (
        normalizedMessage.includes(normalizedColumn) ||
        normalizedMessage.includes(`.${normalizedColumn}`) ||
        normalizedMessage.includes(`"${normalizedColumn}"`)
      );
    }) ||
    /schema cache/i.test(message)
  );
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
    features: row.features ?? "",
    composition: row.composition ?? "",
    returnConditions: row.return_conditions ?? "",
    color: row.color ?? "",
    colors: Array.isArray(row.colors) ? row.colors.filter(Boolean) : (row.color ? [row.color] : []),
    pickup: row.pickup,
    delivery: row.delivery,
    addedAt: row.created_at,
    isPublished: row.is_published,
    soldCount,
    status,
  };
}

function mapShopCollection(row: ShopCollectionRow): SellerShopCollection {
  return {
    id: row.id,
    shopId: row.shop_id,
    title: row.title,
    description: row.description ?? "",
    year: row.year ?? undefined,
    imageUrl: row.image_url ?? undefined,
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

  const claimedLegacyShop = await claimLegacyShopIfNeeded({
    userId,
    accessToken,
    shopName: profile?.shop_name,
  });
  if (claimedLegacyShop) return claimedLegacyShop;

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

  const ownerShops = await requestSupabase<ShopRow[]>(
    `shops?owner_user_id=eq.${params.userId}&select=id,name`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );
  const profileRows = await requestSupabase<ProfileRow[]>(
    `profiles?id=eq.${params.userId}&select=shop_name,shop_address&limit=1`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );
  const profileShopName = profileRows[0]?.shop_name?.trim() || "";

  const legacyShops = profileShopName
    ? await findLegacyShopsByName(profileShopName, params.accessToken)
    : [];

  const shops = [...ownerShops, ...legacyShops].filter(
    (shop, index, allShops) => allShops.findIndex((candidate) => candidate.id === shop.id) === index
  );
  if (shops.length === 0) return [];

  const shopIds = shops.map((shop) => shop.id);
  const encodedIds = encodeInList(shopIds);
  let productRows: ProductRow[];
  try {
    productRows = await requestSupabase<ProductRow[]>(
      `products?shop_id=in.(${encodedIds})&select=id,shop_id,title,description,features,composition,return_conditions,color,colors,price,image_url,main_image_url,image_urls,categories,category,available_today,stock,pickup,delivery,created_at,is_published,sold_count&order=created_at.desc`,
      { method: "GET" },
      { accessToken: params.accessToken }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isSchemaColumnError(message, ["features", "composition", "return_conditions", "color", "colors"])) {
      try {
        productRows = await requestSupabase<ProductRow[]>(
          `products?shop_id=in.(${encodedIds})&select=id,shop_id,title,description,price,image_url,main_image_url,image_urls,categories,category,available_today,stock,pickup,delivery,created_at,is_published,sold_count&order=created_at.desc`,
          { method: "GET" },
          { accessToken: params.accessToken }
        );
      } catch (compatError) {
        const compatMessage = compatError instanceof Error ? compatError.message : "";
        if (!isSchemaColumnError(compatMessage, ["main_image_url", "image_urls", "categories"])) {
          throw compatError;
        }
        productRows = await requestSupabase<ProductRow[]>(
          `products?shop_id=in.(${encodedIds})&select=id,shop_id,title,description,price,image_url,category,available_today,stock,pickup,delivery,created_at,is_published,sold_count&order=created_at.desc`,
          { method: "GET" },
          { accessToken: params.accessToken }
        );
      }
    } else if (isSchemaColumnError(message, ["main_image_url", "image_urls", "categories"])) {
      productRows = await requestSupabase<ProductRow[]>(
        `products?shop_id=in.(${encodedIds})&select=id,shop_id,title,description,price,image_url,category,available_today,stock,pickup,delivery,created_at,is_published,sold_count&order=created_at.desc`,
        { method: "GET" },
        { accessToken: params.accessToken }
      );
    } else {
      throw error;
    }
  }

  const shopById = new Map(shops.map((shop) => [shop.id, shop.name]));
  return productRows.map((row) => mapProduct(row, shopById.get(row.shop_id) ?? "Boutique"));
}

export async function fetchSellerShopCollections(params: {
  userId: string;
  accessToken: string;
}): Promise<SellerShopCollection[]> {
  if (!hasSupabaseConfig()) return [];

  const shop = await getOrCreateSellerShop(params.userId, params.accessToken);
  const rows = await requestSupabase<ShopCollectionRow[]>(
    `shop_collections?shop_id=eq.${shop.id}&select=id,shop_id,title,description,year,image_url&order=created_at.asc`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );

  return rows.map(mapShopCollection);
}

export async function createSellerShopCollection(params: {
  userId: string;
  accessToken: string;
  title: string;
  description?: string;
  year?: number;
  imageUrl?: string;
}): Promise<SellerShopCollection> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const shop = await getOrCreateSellerShop(params.userId, params.accessToken);
  const normalizedTitle = params.title.trim();
  if (normalizedTitle.length < 2) {
    throw new Error("Nom de collection requis (min 2 caracteres).");
  }

  const existingRows = await requestSupabase<ShopCollectionRow[]>(
    `shop_collections?shop_id=eq.${shop.id}&title=eq.${encodeURIComponent(normalizedTitle)}&select=id,shop_id,title,description,year,image_url&limit=1`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );
  if (existingRows[0]) {
    return mapShopCollection(existingRows[0]);
  }

  const insertedRows = await requestSupabase<ShopCollectionRow[]>(
    "shop_collections",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        shop_id: shop.id,
        title: normalizedTitle,
        description: params.description?.trim() || null,
        year: typeof params.year === "number" && Number.isFinite(params.year) ? params.year : null,
        image_url: params.imageUrl?.trim() || null,
      }]),
    },
    { accessToken: params.accessToken }
  );

  if (!insertedRows[0]) {
    throw new Error("Impossible de creer la collection.");
  }

  return mapShopCollection(insertedRows[0]);
}

export async function createSellerProduct(params: {
  userId: string;
  accessToken: string;
  title: string;
  description: string;
  features: string;
  composition: string;
  returnConditions: string;
  color: string;
  price: number;
  stock: number;
  categories: string[];
  collectionId?: string;
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
  const primaryCategory = normalizedCategories[0] ?? "artisanat";
  const normalizedCollectionId = params.collectionId?.trim() || null;
  const primaryColor = params.color.trim();

  const basePayload = {
    shop_id: shop.id,
    ...(normalizedCollectionId ? { collection_id: normalizedCollectionId } : {}),
    title: params.title,
    description: params.description,
    price: params.price,
    image_url: mainImage,
    category: primaryCategory,
    category_id: primaryCategory,
    ...(primaryColor ? { color: primaryColor } : {}),
    available_today: params.pickup,
    stock: params.stock,
    pickup: params.pickup,
    delivery: params.delivery,
    is_published: params.isPublished,
    sold_count: 0,
  };

  const productDetailsPayload = {
    ...basePayload,
    features: params.features,
    composition: params.composition,
    return_conditions: params.returnConditions,
  };

  const legacyBasePayload = {
    shop_id: shop.id,
    title: params.title,
    description: params.description,
    price: params.price,
    image_url: mainImage,
    category: primaryCategory,
    category_id: primaryCategory,
    available_today: params.pickup,
    stock: params.stock,
    pickup: params.pickup,
    delivery: params.delivery,
    is_published: params.isPublished,
    sold_count: 0,
  };

  const legacyProductDetailsPayload = {
    ...legacyBasePayload,
    features: params.features,
    composition: params.composition,
    return_conditions: params.returnConditions,
  };

  const modernPayload = {
    ...productDetailsPayload,
    main_image_url: mainImageForIndexedColumn,
    image_urls: normalizedImageUrls.length > 0 ? normalizedImageUrls : (mainImage ? [mainImage] : []),
    categories: normalizedCategories.length > 0 ? normalizedCategories : ["artisanat"],
  };

  const modernCompatPayload = {
    ...legacyBasePayload,
    main_image_url: mainImageForIndexedColumn,
    image_urls: normalizedImageUrls.length > 0 ? normalizedImageUrls : (mainImage ? [mainImage] : []),
    categories: normalizedCategories.length > 0 ? normalizedCategories : ["artisanat"],
  };

  const legacyDetailsCompatPayload = {
    ...legacyProductDetailsPayload,
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
    if (isSchemaColumnError(message, ["features", "composition", "return_conditions", "color", "colors", "collection_id"])) {
      try {
        await requestSupabase(
          "products",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify([modernCompatPayload]),
          },
          { accessToken: params.accessToken }
        );
        return;
      } catch (compatError) {
        const compatMessage = compatError instanceof Error ? compatError.message : "";
        if (isSchemaColumnError(compatMessage, ["main_image_url", "image_urls", "categories"])) {
          try {
            await requestSupabase(
              "products",
              {
                method: "POST",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify([legacyDetailsCompatPayload]),
              },
              { accessToken: params.accessToken }
            );
            return;
          } catch (legacyDetailsError) {
            const legacyDetailsMessage = legacyDetailsError instanceof Error ? legacyDetailsError.message : "";
            if (!isSchemaColumnError(legacyDetailsMessage, ["features", "composition", "return_conditions"])) {
              throw legacyDetailsError;
            }
          }
        } else {
          throw compatError;
        }
      }
    } else if (!isSchemaColumnError(message, ["main_image_url", "image_urls", "categories", "color", "colors", "collection_id"])) {
      throw error;
    }

    await requestSupabase(
      "products",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([legacyBasePayload]),
      },
      { accessToken: params.accessToken }
    );
  }
}

export async function duplicateSellerProduct(params: {
  userId: string;
  accessToken: string;
  product: Product;
  color: string;
}): Promise<void> {
  const normalizedColor = params.color.trim();
  if (!normalizedColor) {
    throw new Error("Couleur requise pour dupliquer le produit.");
  }

  await createSellerProduct({
    userId: params.userId,
    accessToken: params.accessToken,
    title: params.product.title,
    description: params.product.description,
    features: params.product.features ?? "",
    composition: params.product.composition ?? "",
    returnConditions: params.product.returnConditions ?? "",
    color: normalizedColor,
    price: params.product.price,
    stock: params.product.stock,
    categories: [params.product.category].filter(Boolean),
    pickup: params.product.pickup,
    delivery: params.product.delivery,
    isPublished: Boolean(params.product.isPublished),
    mainImageUrl: params.product.image,
    imageUrls: params.product.image ? [params.product.image] : [],
  });
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
