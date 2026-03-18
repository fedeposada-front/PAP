const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface FollowCountRow {
  user_id: string;
}

interface FollowSingleRow {
  shop_id: string;
}

interface FollowRow {
  user_id: string;
  created_at?: string | null;
}

interface FollowerProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface ShopFollowerItem {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  followedAt: string | null;
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

function encodeInList(ids: string[]) {
  return ids.map((id) => `"${id}"`).join(",");
}

export async function fetchShopFollowersCount(shopId: string, accessToken?: string | null): Promise<number> {
  if (!hasSupabaseConfig()) return 0;
  const path = `followed_shops?shop_id=eq.${shopId}&select=user_id`;

  if (accessToken) {
    try {
      const rows = await requestSupabase<FollowCountRow[]>(
        path,
        { method: "GET" },
        accessToken
      );
      return rows.length;
    } catch {
      // Fallback below for environments where public read is enabled instead.
    }
  }

  const rows = await requestSupabaseAnon<FollowCountRow[]>(path);
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

export async function fetchShopFollowers(params: {
  shopId: string;
  accessToken: string;
}): Promise<ShopFollowerItem[]> {
  if (!hasSupabaseConfig()) return [];

  const followRows = await requestSupabase<FollowRow[]>(
    `followed_shops?shop_id=eq.${params.shopId}&select=user_id,created_at&order=created_at.desc`,
    { method: "GET" },
    params.accessToken
  );
  if (followRows.length === 0) return [];

  const userIds = [...new Set(followRows.map((row) => row.user_id))];

  let profileRows: FollowerProfileRow[] = [];
  try {
    profileRows = await requestSupabase<FollowerProfileRow[]>(
      `profiles?id=in.(${encodeInList(userIds)})&select=id,first_name,last_name`,
      { method: "GET" },
      params.accessToken
    );
  } catch {
    profileRows = [];
  }

  const profileById = new Map(profileRows.map((row) => [row.id, row]));

  return followRows.map((row) => {
    const profile = profileById.get(row.user_id);
    const firstName = profile?.first_name?.trim() ?? "";
    const lastName = profile?.last_name?.trim() ?? "";
    const displayName = `${firstName} ${lastName}`.trim() || "Client";

    return {
      userId: row.user_id,
      firstName,
      lastName,
      displayName,
      followedAt: row.created_at ?? null,
    } satisfies ShopFollowerItem;
  });
}
