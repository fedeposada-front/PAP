import type { BusinessType, OfferType, Product, Shop, ShopTeamMember } from "../types/catalog";
import { toShopSlug } from "../utils/shopRouting";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const FALLBACK_IMAGE = "https://placehold.co/640x640?text=Lovcal";
type OpeningHours = Record<string, { open?: boolean; openTime?: string; closeTime?: string }>;

interface ShopRow {
  id: string;
  slug?: string | null;
  business_type?: string | null;
  name: string;
  category: string;
  description: string | null;
  story?: string | null;
  team_members?: unknown;
  address: string;
  city: string;
  postal_code?: string | null;
  phone: string | null;
  is_open: boolean;
  pickup_today: boolean;
  open_sunday: boolean;
  delivery: boolean;
  hours: string | null;
  opening_hours?: OpeningHours | null;
  rating: number | null;
  review_count: number;
  lat: number | null;
  lng: number | null;
  is_published: boolean | null;
  logo_image_url?: string | null;
  banner_image_url?: string | null;
}

function mapTeamMembers(value: unknown): ShopTeamMember[] {
  if (!Array.isArray(value)) return [];
  const teamMembers: ShopTeamMember[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { name?: unknown; role?: unknown; image_url?: unknown; imageUrl?: unknown };
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const role = typeof raw.role === "string" ? raw.role.trim() : "";
    const imageUrl =
      typeof raw.image_url === "string"
        ? raw.image_url
        : typeof raw.imageUrl === "string"
          ? raw.imageUrl
          : "";
    if (!name) continue;
    teamMembers.push({
      name,
      role,
      imageUrl: imageUrl || undefined,
    });
  }
  return teamMembers;
}

function resolveShopSlug(slug: string | null | undefined, name: string) {
  return slug?.trim() || toShopSlug(name);
}

function normalizeBusinessType(value: string | null | undefined): BusinessType {
  return value === "service" || value === "hybrid" ? value : "product";
}

interface ProductRow {
  id: string;
  shop_id: string;
  collection_id?: string | null;
  offer_type?: string | null;
  title: string;
  description: string | null;
  features: string | null;
  composition: string | null;
  return_conditions: string | null;
  color: string | null;
  colors: string[] | null;
  price: number;
  image_url: string | null;
  main_image_url?: string | null;
  image_urls?: string[] | null;
  categories: string[] | null;
  category: string;
  available_today: boolean;
  stock: number;
  pickup: boolean;
  delivery: boolean;
  created_at: string;
}

function normalizeOfferType(value: string | null | undefined): OfferType {
  return value === "service" ? "service" : "product";
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

function isStatementTimeoutError(message: string) {
  return /statement timeout|canceling statement due to statement timeout/i.test(message);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function isValidHoursText(value: string) {
  if (!value.trim()) return false;
  const compact = value.replace(/\s/g, "");
  const ranges = compact.match(/\d{2}:\d{2}-\d{2}:\d{2}/g);
  if (!ranges || ranges.length === 0) return false;
  return ranges.every((range) => {
    const [start, end] = range.split("-");
    return isValidTime(start) && isValidTime(end) && start < end;
  });
}

async function requestSupabase<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: "no-store",
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

function mapShop(row: ShopRow): Shop {
  const todayKeys = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
  const dayKey = todayKeys[new Date().getDay()];
  const daySchedule = row.opening_hours?.[dayKey];
  const hasValidDaySchedule =
    Boolean(daySchedule?.open) &&
    typeof daySchedule?.openTime === "string" &&
    typeof daySchedule?.closeTime === "string" &&
    isValidTime(daySchedule.openTime) &&
    isValidTime(daySchedule.closeTime) &&
    daySchedule.openTime < daySchedule.closeTime;
  let isOpenBySchedule = false;
  if (hasValidDaySchedule) {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    isOpenBySchedule = hhmm >= daySchedule!.openTime! && hhmm <= daySchedule!.closeTime!;
  }

  const todayHours = hasValidDaySchedule
    ? `${daySchedule!.openTime}-${daySchedule!.closeTime}`
    : daySchedule?.open === false
      ? "Fermé aujourd'hui"
      : undefined;

  const fallbackHours = typeof row.hours === "string" && isValidHoursText(row.hours)
    ? row.hours
    : "Horaires non renseignés";

  return {
    id: row.id,
    slug: resolveShopSlug(row.slug, row.name),
    businessType: normalizeBusinessType(row.business_type),
    name: row.name,
    postalCode: row.postal_code ?? undefined,
    category: row.category?.trim() || "Non catégorisé",
    image: row.logo_image_url ?? FALLBACK_IMAGE,
    bannerImage: row.banner_image_url ?? row.logo_image_url ?? FALLBACK_IMAGE,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    distance: row.city || "-",
    address: row.address,
    city: row.city,
    isOpen: Boolean(row.is_open) || isOpenBySchedule,
    pickupToday: row.pickup_today,
    openSunday: row.open_sunday,
    delivery: row.delivery,
    hours: todayHours ?? fallbackHours,
    todayHours,
    openingHours: row.opening_hours ?? undefined,
    phone: row.phone ?? "",
    description: row.description ?? "",
    story: row.story ?? "",
    teamMembers: mapTeamMembers(row.team_members),
    lat: row.lat ?? Number.NaN,
    lng: row.lng ?? Number.NaN,
  };
}

function mapProduct(row: ProductRow, shopName: string, shopSlug?: string | null): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    collectionId: row.collection_id ?? undefined,
    offerType: normalizeOfferType(row.offer_type),
    shopName,
    shopSlug: resolveShopSlug(shopSlug, shopName),
    title: row.title,
    price: Number(row.price),
    image: row.image_url ?? row.main_image_url ?? FALLBACK_IMAGE,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : (row.image_url ? [row.image_url] : []),
    category: row.category,
    categories: Array.isArray(row.categories) ? row.categories.filter(Boolean) : [row.category].filter(Boolean),
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
  };
}

async function fetchPublishedShopLookups(): Promise<Array<Pick<ShopRow, "id" | "name" | "slug">>> {
  try {
    return await requestSupabase<Array<Pick<ShopRow, "id" | "name" | "slug">>>(
      "shops?select=id,name,slug&is_published=eq.true"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isSchemaColumnError(message, ["slug"])) {
      throw error;
    }
    const fallbackRows = await requestSupabase<Array<Pick<ShopRow, "id" | "name">>>(
      "shops?select=id,name&is_published=eq.true"
    );
    return fallbackRows.map((row) => ({ ...row, slug: undefined }));
  }
}

export async function fetchShops(): Promise<Shop[]> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  let rows: ShopRow[];
  try {
    rows = await requestSupabase<ShopRow[]>(
      "shops?select=id,slug,business_type,name,category,description,story,team_members,address,city,postal_code,phone,is_open,pickup_today,open_sunday,delivery,hours,opening_hours,rating,review_count,lat,lng,is_published,logo_image_url,banner_image_url&is_published=eq.true&order=created_at.desc"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isSchemaColumnError(message, ["slug", "business_type", "story", "team_members", "opening_hours", "logo_image_url", "banner_image_url"])) {
      throw error;
    }
    rows = await requestSupabase<ShopRow[]>(
      "shops?select=id,name,category,description,address,city,postal_code,phone,is_open,pickup_today,open_sunday,delivery,hours,rating,review_count,lat,lng,is_published&is_published=eq.true&order=created_at.desc"
    );
  }
  return rows.map(mapShop);
}

export async function fetchShopById(shopId: string): Promise<Shop | null> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  try {
    let rows: ShopRow[];
    try {
      rows = await requestSupabase<ShopRow[]>(
        `shops?select=id,slug,business_type,name,category,description,story,team_members,address,city,postal_code,phone,is_open,pickup_today,open_sunday,delivery,hours,opening_hours,rating,review_count,lat,lng,is_published,logo_image_url,banner_image_url&id=eq.${shopId}&is_published=eq.true&limit=1`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!isSchemaColumnError(message, ["slug", "business_type", "story", "team_members", "opening_hours", "logo_image_url", "banner_image_url"])) {
        throw error;
      }
      rows = await requestSupabase<ShopRow[]>(
        `shops?select=id,name,category,description,address,city,postal_code,phone,is_open,pickup_today,open_sunday,delivery,hours,rating,review_count,lat,lng,is_published&id=eq.${shopId}&is_published=eq.true&limit=1`
      );
    }
    return rows[0] ? mapShop(rows[0]) : null;
  } catch (error) {
    console.error("fetchShopById failed", error);
    throw error;
  }
}

export async function fetchShopCollectionTitle(collectionId: string): Promise<string | null> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  const rows = await requestSupabase<Array<{ title: string | null }>>(
    `shop_collections?select=title&id=eq.${collectionId}&limit=1`
  );
  return rows[0]?.title?.trim() || null;
}

function buildProductsQuery(options?: { limit?: number; lightweight?: boolean; includeOfferType?: boolean }) {
  const offerType = options?.includeOfferType === false ? "" : "offer_type,";
  const select = options?.lightweight
    ? `id,shop_id,collection_id,${offerType}title,description,price,image_url,main_image_url,image_urls,category,categories,available_today,stock,pickup,delivery,created_at`
    : `id,shop_id,collection_id,${offerType}title,description,features,composition,return_conditions,color,colors,price,image_url,main_image_url,image_urls,categories,category,available_today,stock,pickup,delivery,created_at`;
  const limit = options?.limit ? `&limit=${options.limit}` : "";
  return `products?select=${select}&is_published=eq.true&order=created_at.desc${limit}`;
}

export async function fetchProducts(options?: { limit?: number; lightweight?: boolean }): Promise<Product[]> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  const shopRowsPromise = fetchPublishedShopLookups();
  const productRowsPromise = requestSupabase<ProductRow[]>(buildProductsQuery(options));

  let productRows: ProductRow[];
  let shopRows: Array<Pick<ShopRow, "id" | "name" | "slug">>;
  try {
    [productRows, shopRows] = await Promise.all([productRowsPromise, shopRowsPromise]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isStatementTimeoutError(message)) {
      [productRows, shopRows] = await Promise.all([
        requestSupabase<ProductRow[]>(
          buildProductsQuery({ limit: options?.limit ?? 60, lightweight: true, includeOfferType: false })
        ),
        shopRowsPromise,
      ]);
    } else if (!isSchemaColumnError(message, ["offer_type", "features", "composition", "return_conditions", "color", "colors", "main_image_url", "image_urls", "categories"])) {
      throw error;
    } else {
      [productRows, shopRows] = await Promise.all([
        requestSupabase<ProductRow[]>(
          buildProductsQuery({ limit: options?.limit, lightweight: true, includeOfferType: false })
        ),
        shopRowsPromise,
      ]);
    }
  }
  const shopById = new Map(shopRows.map((shop) => [shop.id, shop]));
  return productRows
    .filter((row) => shopById.has(row.shop_id))
    .map((row) => {
      const shop = shopById.get(row.shop_id);
      return mapProduct(row, shop?.name ?? "Boutique", shop?.slug);
    });
}

export async function fetchProductsByShopId(shopId: string): Promise<Product[]> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  try {
    const shop = await fetchShopById(shopId);
    if (!shop) return [];

    let productRows: ProductRow[];
    try {
      productRows = await requestSupabase<ProductRow[]>(
        `products?select=id,shop_id,collection_id,offer_type,title,description,features,composition,return_conditions,color,colors,price,image_url,main_image_url,image_urls,categories,category,available_today,stock,pickup,delivery,created_at&shop_id=eq.${shopId}&is_published=eq.true&order=created_at.desc`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        !isSchemaColumnError(message, [
          "offer_type",
          "features",
          "composition",
          "return_conditions",
          "color",
          "colors",
          "main_image_url",
          "image_urls",
          "categories",
          "collection_id",
        ])
      ) {
        throw error;
      }
      productRows = await requestSupabase<ProductRow[]>(
        `products?select=id,shop_id,title,description,price,image_url,main_image_url,image_urls,category,available_today,stock,pickup,delivery,created_at&shop_id=eq.${shopId}&is_published=eq.true&order=created_at.desc`
      );
    }

    return productRows.map((row) => mapProduct(row, shop.name, shop.slug));
  } catch (error) {
    console.error("fetchProductsByShopId failed", error);
    throw error;
  }
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }
  try {
    let productRows: ProductRow[];
    try {
      productRows = await requestSupabase<ProductRow[]>(
        `products?select=id,shop_id,collection_id,offer_type,title,description,features,composition,return_conditions,color,colors,price,image_url,main_image_url,image_urls,categories,category,available_today,stock,pickup,delivery,created_at&id=eq.${productId}&is_published=eq.true&limit=1`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        !isSchemaColumnError(message, [
          "offer_type",
          "features",
          "composition",
          "return_conditions",
          "color",
          "colors",
          "main_image_url",
          "image_urls",
          "categories",
          "collection_id",
        ])
      ) {
        throw error;
      }
      productRows = await requestSupabase<ProductRow[]>(
        `products?select=id,shop_id,title,description,price,image_url,main_image_url,image_urls,category,available_today,stock,pickup,delivery,created_at&id=eq.${productId}&is_published=eq.true&limit=1`
      );
    }

    const row = productRows[0];
    if (!row) return null;

    const shop = await fetchShopById(row.shop_id);
    if (!shop) return null;
    return mapProduct(row, shop.name, shop.slug);
  } catch (error) {
    console.error("fetchProductById failed", error);
    throw error;
  }
}
