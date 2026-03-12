import type { Product, Shop } from "../types/catalog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const FALLBACK_IMAGE = "https://placehold.co/640x640?text=MonCadeauLocal";

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
  rating: number | null;
  review_count: number;
  lat: number | null;
  lng: number | null;
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
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    image: FALLBACK_IMAGE,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    distance: "-",
    address: row.address,
    city: row.city,
    isOpen: row.is_open,
    pickupToday: row.pickup_today,
    openSunday: row.open_sunday,
    delivery: row.delivery,
    hours: row.hours ?? "-",
    phone: row.phone ?? "",
    description: row.description ?? "",
    lat: row.lat ?? 49.8941,
    lng: row.lng ?? 2.2958,
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
      "shops?select=id,name,category,description,address,city,phone,is_open,pickup_today,open_sunday,delivery,hours,rating,review_count,lat,lng&order=created_at.desc"
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
      requestSupabase<Pick<ShopRow, "id" | "name">[]>("shops?select=id,name"),
    ]);
    const shopNameById = new Map(shopRows.map((shop) => [shop.id, shop.name]));
    return productRows.map((row) => mapProduct(row, shopNameById.get(row.shop_id) ?? "Boutique"));
  } catch {
    return [];
  }
}
