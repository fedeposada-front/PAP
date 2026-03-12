export type AdPlacement = string;

export interface SponsoredAd {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  ctaLabel: string;
  targetUrl?: string;
  placement: AdPlacement;
  city: string;
  shopId?: string;
  priority: number;
}

interface AdApiRow {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  target_url: string | null;
  placement: AdPlacement;
  city: string;
  shop_id: string | null;
  priority: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SESSION_STORAGE_KEY = "mcl_ads_session_v1";

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSessionId() {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const next = `ads_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function normalizeAd(row: AdApiRow): SponsoredAd {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    imageUrl: row.image_url ?? undefined,
    ctaLabel: row.cta_label ?? "Decouvrir",
    targetUrl: row.target_url ?? undefined,
    placement: row.placement,
    city: row.city,
    shopId: row.shop_id ?? undefined,
    priority: row.priority ?? 0,
  };
}

function isAdActive(row: AdApiRow) {
  if (!row.is_active) return false;

  const now = Date.now();
  const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

function matchesCity(adCity: string, userCity: string) {
  const normalizedAdCity = adCity.trim().toLowerCase();
  const normalizedUserCity = userCity.trim().toLowerCase();
  return (
    normalizedAdCity === normalizedUserCity ||
    normalizedAdCity === "amiens" ||
    normalizedAdCity === "all"
  );
}

export async function fetchSponsoredAd(
  city: string,
  placement: AdPlacement
): Promise<SponsoredAd | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const rows = await supabaseRequest<AdApiRow[]>(
      "ads?select=id,title,subtitle,image_url,cta_label,target_url,placement,city,shop_id,priority,starts_at,ends_at,is_active&order=priority.desc,created_at.desc"
    );

    const activeRows = rows.filter((row) => isAdActive(row));

    const preferredRow =
      activeRows.find((row) => row.placement === placement && matchesCity(row.city, city)) ??
      activeRows.find((row) => matchesCity(row.city, city)) ??
      activeRows.find((row) => row.placement === placement) ??
      activeRows[0];

    const ad = preferredRow ? normalizeAd(preferredRow) : null;

    return ad;
  } catch {
    return null;
  }
}

export async function trackAdImpression(ad: SponsoredAd) {
  if (!hasSupabaseConfig() || ad.id.startsWith("fallback-")) return;

  try {
    await supabaseRequest("ad_impressions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ad_id: ad.id,
        placement: ad.placement,
        city: ad.city,
        session_id: getSessionId(),
      }),
    });
  } catch {}
}

export async function trackAdClick(ad: SponsoredAd) {
  if (!hasSupabaseConfig() || ad.id.startsWith("fallback-")) return;

  try {
    await supabaseRequest("ad_clicks", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ad_id: ad.id,
        placement: ad.placement,
        city: ad.city,
        session_id: getSessionId(),
      }),
    });
  } catch {}
}
