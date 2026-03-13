const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface FollowCountRow {
  user_id: string;
}

interface FollowSingleRow {
  shop_id: string;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function requestSupabase<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur suivi boutique.";
    throw new Error(message);
  }
  return payload as T;
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
    throw new Error("Erreur lecture followers.");
  }
  return payload as T;
}

export async function fetchShopFollowersCount(shopId: string): Promise<number> {
  if (!hasSupabaseConfig()) return 0;
  const rows = await requestSupabaseAnon<FollowCountRow[]>(
    `followed_shops?shop_id=eq.${shopId}&select=user_id`
  );
  return rows.length;
}

export async function fetchIsFollowingShop(params: {
  userId: string;
  shopId: string;
  accessToken: string;
}): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  const rows = await requestSupabase<FollowSingleRow[]>(
    `followed_shops?user_id=eq.${params.userId}&shop_id=eq.${params.shopId}&select=shop_id&limit=1`,
    { method: "GET" },
    params.accessToken
  );
  return rows.length > 0;
}

export async function followShop(params: {
  userId: string;
  shopId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;
  await requestSupabase(
    "followed_shops",
    {
      method: "POST",
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify([{
        user_id: params.userId,
        shop_id: params.shopId,
      }]),
    },
    params.accessToken
  );
}

export async function unfollowShop(params: {
  userId: string;
  shopId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;
  await requestSupabase(
    `followed_shops?user_id=eq.${params.userId}&shop_id=eq.${params.shopId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
    params.accessToken
  );
}
