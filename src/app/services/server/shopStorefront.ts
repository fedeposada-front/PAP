import { CATEGORY_SUBCATEGORIES } from "../../data/catalog";
import { fetchManagedShopAccess, type ManagedShopAccess } from "../shopAccess";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DEFAULT_SHOP_CATEGORY_ID = "artisanat";
const CATEGORY_ID_SET = new Set(CATEGORY_SUBCATEGORIES.map((category) => category.id));
const CATEGORY_ID_BY_LABEL = new Map(
  CATEGORY_SUBCATEGORIES.map((category) => [category.label.toLowerCase(), category.id] as const)
);

interface AuthenticatedUserResponse {
  id: string;
}

interface ShopOwnerRow {
  id: string;
  owner_user_id: string | null;
}

interface AddressFeature {
  geometry?: {
    coordinates?: [number, number];
  };
}

export interface SaveShopStorefrontPayload {
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
}

function hasServerSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

function normalizeShopCategory(category: string) {
  const normalized = category.trim();
  if (!normalized) return DEFAULT_SHOP_CATEGORY_ID;
  if (CATEGORY_ID_SET.has(normalized)) return normalized;

  const byLabel = CATEGORY_ID_BY_LABEL.get(normalized.toLowerCase());
  if (byLabel) return byLabel;

  throw new Error("Categorie boutique invalide.");
}

async function requestSupabaseRest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
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

async function fetchAuthenticatedUser(accessToken: string): Promise<AuthenticatedUserResponse | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as AuthenticatedUserResponse | null;
  return payload;
}

async function fetchShopOwner(shopId: string) {
  const rows = await requestSupabaseRest<ShopOwnerRow[]>(
    `shops?id=eq.${shopId}&select=id,owner_user_id&limit=1`
  );
  return rows[0] ?? null;
}

async function geocodeShopAddress(params: {
  address: string;
  city?: string;
  postalCode?: string;
}) {
  const address = params.address.trim();
  if (!address) return null;

  const query = new URLSearchParams({
    q: [address, params.postalCode?.trim(), params.city?.trim()].filter(Boolean).join(" "),
    limit: "1",
  });
  if (params.city?.trim()) query.set("city", params.city.trim());
  if (params.postalCode?.trim()) query.set("postcode", params.postalCode.trim());

  try {
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${query.toString()}`, {
      cache: "no-store",
    });
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

function canEditStorefront(access: ManagedShopAccess | null) {
  return Boolean(access?.canManageContent || access?.canManageSettings);
}

function canEditStorefrontOperations(access: ManagedShopAccess | null) {
  return Boolean(access?.isOwner || access?.roles.includes("manager"));
}

function validatePayload(params: SaveShopStorefrontPayload) {
  const errors: string[] = [];
  if (params.shopName.trim().length < 2) errors.push("Nom de boutique requis (min 2 caracteres).");
  if (params.shopCategory.trim().length < 2) errors.push("Categorie boutique requise.");
  if (params.shopAddress.trim().length < 6) errors.push("Adresse invalide.");
  if (!/^[0-9]{5}$/.test(params.shopPostal.trim())) errors.push("Code postal invalide (5 chiffres).");
  if (params.shopCity.trim().length < 2) errors.push("Ville invalide.");
  if (params.shopPhone.trim() && !/^[0-9+() .-]{8,20}$/.test(params.shopPhone.trim())) errors.push("Telephone invalide.");
  if (params.shopEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.shopEmail.trim())) errors.push("E-mail invalide.");
  if (params.shopWebsite.trim() && !/^https?:\/\//i.test(params.shopWebsite.trim())) {
    errors.push("Site web: utilisez une URL http(s).");
  }
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export async function saveShopStorefront(params: SaveShopStorefrontPayload) {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const authUser = await fetchAuthenticatedUser(params.accessToken);
  if (!authUser?.id) {
    throw new Error("Authentification requise.");
  }

  const access = await fetchManagedShopAccess({
    userId: authUser.id,
    accessToken: params.accessToken,
  });
  if (!access?.shopId) {
    throw new Error("Entreprise introuvable.");
  }
  if (!canEditStorefront(access)) {
    throw new Error("Acces refuse a la vitrine.");
  }

  validatePayload(params);

  const normalizedCategory = normalizeShopCategory(params.shopCategory);
  const coords = await geocodeShopAddress({
    address: params.shopAddress,
    city: params.shopCity,
    postalCode: params.shopPostal,
  });
  const shop = await fetchShopOwner(access.shopId);
  if (!shop) {
    throw new Error("Entreprise introuvable.");
  }

  const patchPayload: Record<string, unknown> = {
    name: params.shopName.trim(),
    category: normalizedCategory,
    category_id: normalizedCategory,
    description: params.shopDesc.trim() || null,
    story: params.shopStory.trim() || null,
    address: params.shopAddress.trim(),
    city: params.shopCity.trim(),
    postal_code: params.shopPostal.trim() || null,
    phone: params.shopPhone.trim() || null,
    email: params.shopEmail.trim() || null,
    website: params.shopWebsite.trim() || null,
    opening_hours: params.schedule,
    open_holidays: params.openHolidays,
    logo_image_url: params.logoImage,
    banner_image_url: params.bannerImage,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };

  if (canEditStorefrontOperations(access)) {
    patchPayload.pickup_today = params.pickup;
    patchPayload.delivery = params.delivery;
    patchPayload.delivery_hand = params.delivery && params.deliveryHand;
    patchPayload.delivery_post = params.delivery && params.deliveryPost;
    patchPayload.delivery_carrier = params.delivery && params.deliveryCarrier;
    patchPayload.is_published = params.isPublished;

    if (params.delivery && !params.deliveryHand && !params.deliveryPost && !params.deliveryCarrier) {
      throw new Error("Selectionnez au moins un mode de livraison.");
    }
    if (!params.pickup && !params.delivery) {
      throw new Error("Activez au moins Retrait ou Livraison.");
    }
  }

  await requestSupabaseRest(`shops?id=eq.${access.shopId}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patchPayload),
  });

  if (shop.owner_user_id) {
    await requestSupabaseRest(`profiles?id=eq.${shop.owner_user_id}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        shop_name: params.shopName.trim(),
        shop_address: params.shopAddress.trim(),
      }),
    });
  }

  return {
    ok: true,
    shopId: access.shopId,
    canEditOperations: canEditStorefrontOperations(access),
  };
}
