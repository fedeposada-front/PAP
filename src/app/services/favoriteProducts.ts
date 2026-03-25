const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface FavoriteProductRow {
  product_id: string;
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
        : "Erreur favoris produit.";
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchIsFavoriteProduct(params: {
  userId: string;
  productId: string;
  accessToken: string;
}): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;

  const rows = await requestSupabase<FavoriteProductRow[]>(
    `favorite_products?user_id=eq.${params.userId}&product_id=eq.${params.productId}&select=product_id&limit=1`,
    { method: "GET" },
    params.accessToken
  );

  return rows.length > 0;
}

export async function favoriteProduct(params: {
  userId: string;
  productId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;

  await requestSupabase(
    "favorite_products",
    {
      method: "POST",
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify([
        {
          user_id: params.userId,
          product_id: params.productId,
        },
      ]),
    },
    params.accessToken
  );
}

export async function unfavoriteProduct(params: {
  userId: string;
  productId: string;
  accessToken: string;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;

  await requestSupabase(
    `favorite_products?user_id=eq.${params.userId}&product_id=eq.${params.productId}`,
    {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    },
    params.accessToken
  );
}
