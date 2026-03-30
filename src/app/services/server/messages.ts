const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

interface ConversationRow {
  id: string;
  buyer_user_id: string;
  buyer_display_name: string | null;
  shop_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  city: string | null;
}

export interface ResolvedMessageConversation {
  id: string;
  buyerUserId: string;
  buyerDisplayName: string;
  buyerFullName: string | null;
  buyerNickname: string | null;
  buyerEmail: string | null;
  buyerCity: string | null;
  buyerRating: number | null;
  buyerReviewCount: number;
  shopId: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  createdAt: string;
}

function hasServerSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

function encodeInList(values: string[]) {
  return values.map((value) => `"${value}"`).join(",");
}

async function requestSupabaseRest<T>(
  path: string,
  init: RequestInit,
  options: {
    accessToken?: string;
    serviceRole?: boolean;
  } = {}
): Promise<T> {
  const serviceRole = options.serviceRole === true;
  const apiKey = serviceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const bearerToken = serviceRole ? SUPABASE_SERVICE_ROLE_KEY : options.accessToken ?? "";

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur messagerie.";
    throw new Error(message);
  }

  return payload as T;
}

function getMeaningfulFallbackLabel(value: string | null) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (normalized.toLowerCase() === "client") return "";
  return normalized;
}

function formatBuyerDisplayName(
  profile: ProfileRow | null | undefined,
  fallback: string | null,
  userId: string,
  email: string | null
) {
  const firstName = profile?.first_name?.trim() ?? "";
  const lastName = profile?.last_name?.trim() ?? "";
  const nickname = profile?.nickname?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || nickname || getMeaningfulFallbackLabel(fallback) || email || `Client ${userId.slice(0, 6)}`;
}

function formatBuyerFullName(profile: ProfileRow | null | undefined) {
  const firstName = profile?.first_name?.trim() ?? "";
  const lastName = profile?.last_name?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || null;
}

function formatBuyerNickname(profile: ProfileRow | null | undefined) {
  const nickname = profile?.nickname?.trim() ?? "";
  return nickname || null;
}

async function fetchAuthUserEmail(userId: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object") {
      return null;
    }

    const directEmail =
      "email" in payload && typeof payload.email === "string" ? payload.email.trim() : "";
    if (directEmail) return directEmail;

    const nestedUser =
      "user" in payload && payload.user && typeof payload.user === "object"
        ? (payload.user as { email?: string | null })
        : null;
    const nestedEmail = nestedUser?.email?.trim() ?? "";
    return nestedEmail || null;
  } catch {
    return null;
  }
}

async function resolveConversationRows(rows: ConversationRow[]) {
  if (rows.length === 0) return [];

  const buyerIds = [...new Set(rows.map((row) => row.buyer_user_id).filter(Boolean))];
  let profiles: ProfileRow[] = [];

  if (buyerIds.length > 0) {
    try {
      profiles = await requestSupabaseRest<ProfileRow[]>(
        `profiles?id=in.(${encodeInList(buyerIds)})&select=id,first_name,last_name,nickname,city`,
        { method: "GET" },
        { serviceRole: true }
      );
    } catch {
      const fallbackProfiles = await requestSupabaseRest<Array<Pick<ProfileRow, "id" | "first_name" | "last_name">>>(
        `profiles?id=in.(${encodeInList(buyerIds)})&select=id,first_name,last_name`,
        { method: "GET" },
        { serviceRole: true }
      );

      profiles = fallbackProfiles.map((profile) => ({
        ...profile,
        nickname: null,
        city: null,
      }));
    }
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const emailFallbackIds = buyerIds.filter((buyerId) => {
    const profile = profileById.get(buyerId);
    const firstName = profile?.first_name?.trim() ?? "";
    const lastName = profile?.last_name?.trim() ?? "";
    return !`${firstName} ${lastName}`.trim();
  });
  const emailEntries = await Promise.all(
    emailFallbackIds.map(async (buyerId) => [buyerId, await fetchAuthUserEmail(buyerId)] as const)
  );
  const emailById = new Map(emailEntries);

  return rows.map<ResolvedMessageConversation>((row) => ({
    id: row.id,
    buyerUserId: row.buyer_user_id,
    buyerDisplayName: formatBuyerDisplayName(
      profileById.get(row.buyer_user_id),
      row.buyer_display_name,
      row.buyer_user_id,
      emailById.get(row.buyer_user_id) ?? null
    ),
    buyerFullName: formatBuyerFullName(profileById.get(row.buyer_user_id)),
    buyerNickname: formatBuyerNickname(profileById.get(row.buyer_user_id)),
    buyerEmail: emailById.get(row.buyer_user_id) ?? null,
    buyerCity: profileById.get(row.buyer_user_id)?.city?.trim() || null,
    buyerRating: null,
    buyerReviewCount: 0,
    shopId: row.shop_id,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview ?? null,
    createdAt: row.created_at,
  }));
}

export async function fetchResolvedAccessibleConversations(params: {
  accessToken: string;
}): Promise<ResolvedMessageConversation[]> {
  if (!hasServerSupabaseConfig()) return [];

  const rows = await requestSupabaseRest<ConversationRow[]>(
    "conversations?select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at&order=last_message_at.desc",
    { method: "GET" },
    { accessToken: params.accessToken }
  );

  return resolveConversationRows(rows);
}

export async function fetchResolvedConversation(params: {
  accessToken: string;
  conversationId: string;
}): Promise<ResolvedMessageConversation | null> {
  if (!hasServerSupabaseConfig()) return null;

  const rows = await requestSupabaseRest<ConversationRow[]>(
    `conversations?id=eq.${params.conversationId}&select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at&limit=1`,
    { method: "GET" },
    { accessToken: params.accessToken }
  );

  const resolved = await resolveConversationRows(rows);
  return resolved[0] ?? null;
}
