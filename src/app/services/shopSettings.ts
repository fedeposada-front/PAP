import { CATEGORY_SUBCATEGORIES } from "../data/catalog";
import type { ShopTeamMember } from "../types/catalog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const DEFAULT_SHOP_CATEGORY_ID = "artisanat";
const CATEGORY_ID_SET = new Set(CATEGORY_SUBCATEGORIES.map((category) => category.id));
const CATEGORY_ID_BY_LABEL = new Map(
  CATEGORY_SUBCATEGORIES.map((category) => [category.label.toLowerCase(), category.id] as const)
);

interface ShopSettingsRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  story: string | null;
  team_members: unknown;
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

export interface ShopSettingsData extends ShopSettingsRow {
  teamMembers: ShopTeamMember[];
}

interface ProfileRow {
  shop_name: string | null;
  shop_address: string | null;
}

interface LegacyShopLookupRow {
  id: string;
  name: string;
  owner_user_id: string | null;
}

interface OwnedShopLookupRow {
  id: string;
  name: string;
}

const SHOP_SETTINGS_SELECT =
  "id,name,category,description,story,team_members,address,city,postal_code,phone,email,website,hours,opening_hours,open_holidays,delivery,pickup_today,delivery_hand,delivery_post,delivery_carrier,logo_image_url,banner_image_url,is_published,lat,lng";

const SHOP_SETTINGS_FALLBACK_SELECT =
  "id,name,category,description,address,city,postal_code,phone,hours,delivery,pickup_today,is_published,lat,lng";

function normalizeTeamMembers(value: unknown): ShopTeamMember[] {
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

function serializeTeamMembers(teamMembers: ShopTeamMember[]) {
  return teamMembers
    .map((member) => ({
      name: member.name.trim(),
      role: member.role.trim(),
      image_url: member.imageUrl?.trim() || null,
    }))
    .filter((member) => member.name);
}

function mapShopSettingsRow(row: ShopSettingsRow): ShopSettingsData {
  return {
    ...row,
    teamMembers: normalizeTeamMembers(row.team_members),
  };
}

function mapFallbackShopSettingsRow(
  row: Pick<ShopSettingsRow, "id" | "name" | "category" | "description" | "address" | "city" | "postal_code" | "phone" | "hours" | "delivery" | "pickup_today" | "is_published" | "lat" | "lng">
): ShopSettingsData {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
    story: "",
    team_members: [],
    teamMembers: [],
    address: row.address,
    city: row.city,
    postal_code: row.postal_code ?? null,
    phone: row.phone ?? null,
    email: null,
    website: null,
    hours: row.hours ?? null,
    opening_hours: null,
    open_holidays: false,
    delivery: row.delivery,
    pickup_today: row.pickup_today,
    delivery_hand: null,
    delivery_post: null,
    delivery_carrier: null,
    logo_image_url: null,
    banner_image_url: null,
    is_published: row.is_published,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
  };
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function normalizeShopCategory(category: string): string {
  const normalized = category.trim();
  if (!normalized) return DEFAULT_SHOP_CATEGORY_ID;
  if (CATEGORY_ID_SET.has(normalized)) return normalized;

  const byLabel = CATEGORY_ID_BY_LABEL.get(normalized.toLowerCase());
  if (byLabel) return byLabel;

  throw new Error("Categorie boutique invalide.");
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

async function findLegacyShopByName(shopName: string, accessToken: string): Promise<LegacyShopLookupRow | null> {
  const normalizedName = shopName.trim();
  if (!normalizedName) return null;
  const rows = await requestSupabase<LegacyShopLookupRow[]>(
    `shops?name=eq.${encodeURIComponent(normalizedName)}&select=id,name,owner_user_id&order=created_at.asc&limit=1`,
    { method: "GET" },
    accessToken
  );
  return rows[0] ?? null;
}

async function fetchOwnedShopLookup(userId: string, accessToken: string): Promise<OwnedShopLookupRow | null> {
  const rows = await requestSupabase<OwnedShopLookupRow[]>(
    `shops?owner_user_id=eq.${userId}&select=id,name&order=created_at.asc&limit=1`,
    { method: "GET" },
    accessToken
  );
  return rows[0] ?? null;
}

async function fetchShopSettingsById(shopId: string, accessToken: string): Promise<ShopSettingsData | null> {
  try {
    const rows = await requestSupabase<ShopSettingsRow[]>(
      `shops?id=eq.${shopId}&select=${SHOP_SETTINGS_SELECT}&limit=1`,
      { method: "GET" },
      accessToken
    );
    return rows[0] ? mapShopSettingsRow(rows[0]) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/column|schema cache/i.test(message)) {
      throw error;
    }

    const fallbackRows = await requestSupabase<Array<Pick<ShopSettingsRow, "id" | "name" | "category" | "description" | "address" | "city" | "postal_code" | "phone" | "hours" | "delivery" | "pickup_today" | "is_published" | "lat" | "lng">>>(
      `shops?id=eq.${shopId}&select=${SHOP_SETTINGS_FALLBACK_SELECT}&limit=1`,
      { method: "GET" },
      accessToken
    );
    return fallbackRows[0] ? mapFallbackShopSettingsRow(fallbackRows[0]) : null;
  }
}

async function getOrCreateShop(userId: string, accessToken: string): Promise<ShopSettingsData> {
  const existingLookup = await fetchOwnedShopLookup(userId, accessToken);
  if (existingLookup?.id) {
    const existingShop = await fetchShopSettingsById(existingLookup.id, accessToken);
    if (existingShop) return existingShop;
  }

  const profileRows = await requestSupabase<ProfileRow[]>(
    `profiles?id=eq.${userId}&select=shop_name,shop_address&limit=1`,
    { method: "GET" },
    accessToken
  );
  const profile = profileRows[0];

  const legacyShop = profile?.shop_name
    ? await findLegacyShopByName(profile.shop_name, accessToken)
    : null;
  if (legacyShop && (!legacyShop.owner_user_id || legacyShop.owner_user_id === userId)) {
    if (!legacyShop.owner_user_id) {
      await requestSupabase(
        `shops?id=eq.${legacyShop.id}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            owner_user_id: userId,
          }),
        },
        accessToken
      );
    }

    const claimedShop = await fetchShopSettingsById(legacyShop.id, accessToken);
    if (claimedShop) return claimedShop;
  }

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
        category: DEFAULT_SHOP_CATEGORY_ID,
        category_id: DEFAULT_SHOP_CATEGORY_ID,
        description: "",
        story: "",
        team_members: [],
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
  return mapShopSettingsRow(inserted[0]);
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
  shopStory: string;
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
}): Promise<ShopSettingsData> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const shop = await getOrCreateShop(params.userId, params.accessToken);
  const normalizedCategory = normalizeShopCategory(params.shopCategory);
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
        category: normalizedCategory,
        category_id: normalizedCategory,
        description: params.shopDesc || null,
        story: params.shopStory || null,
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

  const refreshedLookup = await fetchOwnedShopLookup(params.userId, params.accessToken);
  if (!refreshedLookup?.id) {
    throw new Error("Sauvegarde effectuee, mais lecture de verification impossible.");
  }
  const refreshed = await fetchShopSettingsById(refreshedLookup.id, params.accessToken);
  if (!refreshed) {
    throw new Error("Sauvegarde effectuee, mais lecture de verification impossible.");
  }
  return refreshed;
}

export async function saveShopTeamMembers(params: {
  userId: string;
  accessToken: string;
  teamMembers: ShopTeamMember[];
}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const shop = await getOrCreateShop(params.userId, params.accessToken);
  await requestSupabase(
    `shops?id=eq.${shop.id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        team_members: serializeTeamMembers(params.teamMembers),
      }),
    },
    params.accessToken
  );
}
