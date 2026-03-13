import type { Product, Shop } from "../types/catalog";
import { toShopSlug } from "../utils/shopRouting";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const FALLBACK_IMAGE = "https://placehold.co/640x640?text=MonCadeauLocal";
type OpeningHours = Record<string, { open?: boolean; openTime?: string; closeTime?: string }>;

interface ShopRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string;
  city: string;
  phone: string | null;
  is_open: boolean;
  pickup_today: boolean;
  open_sunday: boolean;
  delivery: boolean;
  hours: string | null;
  opening_hours: OpeningHours | null;
  rating: number | null;
  review_count: number;
  lat: number | null;
  lng: number | null;
  is_published: boolean | null;
  logo_image_url: string | null;
  banner_image_url: string | null;
}

interface ProductRow {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available_today: boolean;
  stock: number;
  pickup: boolean;
  delivery: boolean;
  created_at: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
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

  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
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
    isOpenBySchedule = hhmm >= daySchedule.openTime && hhmm <= daySchedule.closeTime;
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
    slug: toShopSlug(row.name),
    name: row.name,
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
    lat: row.lat ?? Number.NaN,
    lng: row.lng ?? Number.NaN,
  };
}

function mapProduct(row: ProductRow, shopName: string): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    shopName,
    title: row.title,
    price: Number(row.price),
    image: row.image_url ?? FALLBACK_IMAGE,
    category: row.category,
    availableToday: row.available_today,
    stock: row.stock,
    description: row.description ?? "",
    pickup: row.pickup,
    delivery: row.delivery,
    addedAt: row.created_at,
  };
}

export async function fetchShops(): Promise<Shop[]> {
  if (!hasSupabaseConfig()) return [];
  try {
    const rows = await requestSupabase<ShopRow[]>(
      "shops?select=id,name,category,description,address,city,phone,is_open,pickup_today,open_sunday,delivery,hours,opening_hours,rating,review_count,lat,lng,is_published,logo_image_url,banner_image_url&is_published=eq.true&order=created_at.desc"
    );
    return rows.map(mapShop);
  } catch {
    return [];
  }
}

export async function fetchProducts(): Promise<Product[]> {
  if (!hasSupabaseConfig()) return [];
  try {
    const [productRows, shopRows] = await Promise.all([
      requestSupabase<ProductRow[]>(
        "products?select=id,shop_id,title,description,price,image_url,category,available_today,stock,pickup,delivery,created_at&is_published=eq.true&order=created_at.desc"
      ),
      requestSupabase<Pick<ShopRow, "id" | "name">[]>("shops?select=id,name&is_published=eq.true"),
    ]);
    const shopNameById = new Map(shopRows.map((shop) => [shop.id, shop.name]));
    return productRows
      .filter((row) => shopNameById.has(row.shop_id))
      .map((row) => mapProduct(row, shopNameById.get(row.shop_id) ?? "Boutique"));
  } catch {
    return [];
  }
}
