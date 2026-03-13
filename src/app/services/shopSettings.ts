const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface ShopSettingsRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string;
  city: string;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  opening_hours: Record<string, unknown> | null;
  open_holidays: boolean | null;
  delivery: boolean;
  pickup_today: boolean;
  delivery_hand: boolean | null;
  delivery_post: boolean | null;
  delivery_carrier: boolean | null;
  logo_image_url: string | null;
  banner_image_url: string | null;
  is_published: boolean | null;
  lat: number | null;
  lng: number | null;
}

interface ProfileRow {
  shop_name: string | null;
  shop_address: string | null;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

interface AddressFeature {
  geometry?: {
    coordinates?: [number, number];
  };
}

async function geocodeShopAddress(params: {
  address: string;
  city?: string;
  postalCode?: string;
}): Promise<{ lat: number; lng: number } | null> {
  const address = params.address.trim();
  if (!address) return null;

  const q = [address, params.postalCode?.trim(), params.city?.trim()].filter(Boolean).join(" ");
  const query = new URLSearchParams({
    q,
    limit: "1",
  });
  if (params.city?.trim()) query.set("city", params.city.trim());
  if (params.postalCode?.trim()) query.set("postcode", params.postalCode.trim());

  try {
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${query.toString()}`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { features?: AddressFeature[] };
    const coords = payload.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function requestSupabase<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur Supabase.";
    throw new Error(message);
  }

  return payload as T;
}

async function getOrCreateShop(userId: string, accessToken: string): Promise<ShopSettingsRow> {
  const existing = await requestSupabase<ShopSettingsRow[]>(
    `shops?owner_user_id=eq.${userId}&select=id,name,category,description,address,city,postal_code,phone,email,website,hours,opening_hours,open_holidays,delivery,pickup_today,delivery_hand,delivery_post,delivery_carrier,logo_image_url,banner_image_url,is_published,lat,lng&order=created_at.asc&limit=1`,
    { method: "GET" },
    accessToken
  );
  if (existing[0]) return existing[0];

  const profileRows = await requestSupabase<ProfileRow[]>(
    `profiles?id=eq.${userId}&select=shop_name,shop_address&limit=1`,
    { method: "GET" },
    accessToken
  );
  const profile = profileRows[0];
  const initialAddress = profile?.shop_address?.trim() || "";
  const coords = await geocodeShopAddress({
    address: initialAddress,
    city: "Amiens",
  });

  const inserted = await requestSupabase<ShopSettingsRow[]>(
    "shops",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        owner_user_id: userId,
        name: profile?.shop_name?.trim() || "Ma boutique",
        category: "Non catégorisé",
        description: "",
        address: initialAddress || "Adresse a renseigner",
        city: "Amiens",
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        is_published: false,
      }]),
    },
    accessToken
  );

  if (!inserted[0]) {
    throw new Error("Impossible de creer la boutique.");
  }
  return inserted[0];
}

export async function fetchShopSettings(userId: string, accessToken: string) {
  if (!hasSupabaseConfig()) return null;
  return getOrCreateShop(userId, accessToken);
}

export async function saveShopSettings(params: {
  userId: string;
  accessToken: string;
  shopName: string;
  shopCategory: string;
  shopDesc: string;
  shopAddress: string;
  shopCity: string;
  shopPostal: string;
  shopPhone: string;
  shopEmail: string;
  shopWebsite: string;
  schedule: Record<string, unknown>;
  openHolidays: boolean;
  pickup: boolean;
  delivery: boolean;
  deliveryHand: boolean;
  deliveryPost: boolean;
  deliveryCarrier: boolean;
  logoImage: string | null;
  bannerImage: string | null;
  isPublished: boolean;
}): Promise<ShopSettingsRow> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const shop = await getOrCreateShop(params.userId, params.accessToken);
  const coords = await geocodeShopAddress({
    address: params.shopAddress,
    city: params.shopCity,
    postalCode: params.shopPostal,
  });

  await requestSupabase(
    `shops?id=eq.${shop.id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        name: params.shopName,
        category: params.shopCategory,
        description: params.shopDesc || null,
        address: params.shopAddress,
        city: params.shopCity,
        postal_code: params.shopPostal || null,
        phone: params.shopPhone || null,
        email: params.shopEmail || null,
        website: params.shopWebsite || null,
        opening_hours: params.schedule,
        open_holidays: params.openHolidays,
        pickup_today: params.pickup,
        delivery: params.delivery,
        delivery_hand: params.delivery && params.deliveryHand,
        delivery_post: params.delivery && params.deliveryPost,
        delivery_carrier: params.delivery && params.deliveryCarrier,
        logo_image_url: params.logoImage,
        banner_image_url: params.bannerImage,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        is_published: params.isPublished,
      }),
    },
    params.accessToken
  );

  await requestSupabase(
    `profiles?id=eq.${params.userId}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        shop_name: params.shopName,
        shop_address: params.shopAddress,
      }),
    },
    params.accessToken
  );

  const refreshed = await requestSupabase<ShopSettingsRow[]>(
    `shops?owner_user_id=eq.${params.userId}&select=id,name,category,description,address,city,postal_code,phone,email,website,hours,opening_hours,open_holidays,delivery,pickup_today,delivery_hand,delivery_post,delivery_carrier,logo_image_url,banner_image_url,is_published,lat,lng&order=created_at.asc&limit=1`,
    { method: "GET" },
    params.accessToken
  );

  if (!refreshed[0]) {
    throw new Error("Sauvegarde effectuee, mais lecture de verification impossible.");
  }
  return refreshed[0];
}
