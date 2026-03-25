const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const MESSAGES_UPDATED_EVENT = "mcl_messages_updated";

interface ConversationRow {
  id: string;
  buyer_user_id: string;
  buyer_display_name: string | null;
  shop_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface MessageConversation {
  id: string;
  buyerUserId: string;
  buyerDisplayName: string;
  shopId: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function mapConversationRow(row: ConversationRow): MessageConversation {
  return {
    id: row.id,
    buyerUserId: row.buyer_user_id,
    buyerDisplayName: row.buyer_display_name?.trim() || "Client",
    shopId: row.shop_id,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview ?? null,
    createdAt: row.created_at,
  };
}

function mapMessageRow(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    text: row.body,
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
  };
}

function encodeInList(values: string[]) {
  return values.map((value) => `"${value}"`).join(",");
}

function emitMessagesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MESSAGES_UPDATED_EVENT));
}

async function requestSupabase<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
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

export function subscribeToMessages(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(MESSAGES_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(MESSAGES_UPDATED_EVENT, listener);
  };
}

export async function fetchAccessibleConversations(params: {
  accessToken: string;
}): Promise<MessageConversation[]> {
  if (!hasSupabaseConfig()) return [];

  const rows = await requestSupabase<ConversationRow[]>(
    "conversations?select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at&order=last_message_at.desc",
    { method: "GET" },
    params.accessToken
  );

  return rows.map(mapConversationRow);
}

export async function fetchConversation(params: {
  conversationId: string;
  accessToken: string;
}): Promise<MessageConversation | null> {
  if (!hasSupabaseConfig()) return null;

  const rows = await requestSupabase<ConversationRow[]>(
    `conversations?id=eq.${params.conversationId}&select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at&limit=1`,
    { method: "GET" },
    params.accessToken
  );

  return rows[0] ? mapConversationRow(rows[0]) : null;
}

export async function ensureBuyerConversation(params: {
  buyerUserId: string;
  buyerDisplayName: string;
  shopId: string;
  accessToken: string;
}): Promise<MessageConversation> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const existing = await requestSupabase<ConversationRow[]>(
    `conversations?buyer_user_id=eq.${params.buyerUserId}&shop_id=eq.${params.shopId}&select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at&limit=1`,
    { method: "GET" },
    params.accessToken
  );
  if (existing[0]) return mapConversationRow(existing[0]);

  try {
    const inserted = await requestSupabase<ConversationRow[]>(
      "conversations?select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([
          {
            buyer_user_id: params.buyerUserId,
            buyer_display_name: params.buyerDisplayName.trim() || "Client",
            shop_id: params.shopId,
          },
        ]),
      },
      params.accessToken
    );

    if (!inserted[0]) {
      throw new Error("Conversation introuvable apres creation.");
    }

    emitMessagesUpdated();
    return mapConversationRow(inserted[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!/duplicate|unique|already exists/i.test(message)) throw error;

    const retryRows = await requestSupabase<ConversationRow[]>(
      `conversations?buyer_user_id=eq.${params.buyerUserId}&shop_id=eq.${params.shopId}&select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at&limit=1`,
      { method: "GET" },
      params.accessToken
    );
    if (!retryRows[0]) throw error;
    return mapConversationRow(retryRows[0]);
  }
}

export async function fetchConversationMessages(params: {
  conversationId: string;
  accessToken: string;
}): Promise<ConversationMessage[]> {
  if (!hasSupabaseConfig()) return [];

  const rows = await requestSupabase<MessageRow[]>(
    `messages?conversation_id=eq.${params.conversationId}&select=id,conversation_id,sender_user_id,body,created_at,read_at&order=created_at.asc`,
    { method: "GET" },
    params.accessToken
  );

  return rows.map(mapMessageRow);
}

export async function sendConversationMessage(params: {
  conversationId: string;
  senderUserId: string;
  text: string;
  accessToken: string;
}): Promise<ConversationMessage> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  const rows = await requestSupabase<MessageRow[]>(
    "messages?select=id,conversation_id,sender_user_id,body,created_at,read_at",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          conversation_id: params.conversationId,
          sender_user_id: params.senderUserId,
          body: params.text.trim(),
        },
      ]),
    },
    params.accessToken
  );

  if (!rows[0]) {
    throw new Error("Message non cree.");
  }

  emitMessagesUpdated();
  return mapMessageRow(rows[0]);
}

export async function fetchShopIncomingMessageCount(params: {
  shopId: string;
  accessToken: string;
  sinceDays?: number;
  excludeSenderUserId?: string;
}): Promise<number> {
  if (!hasSupabaseConfig()) return 0;

  const conversations = await requestSupabase<ConversationRow[]>(
    `conversations?shop_id=eq.${params.shopId}&select=id,buyer_user_id,buyer_display_name,shop_id,last_message_at,last_message_preview,created_at`,
    { method: "GET" },
    params.accessToken
  );
  if (conversations.length === 0) return 0;

  const sinceDays = params.sinceDays ?? 30;
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const conversationIds = conversations.map((conversation) => conversation.id);
  const buyerByConversationId = new Map(
    conversations.map((conversation) => [conversation.id, conversation.buyer_user_id])
  );

  const rows = await requestSupabase<Array<Pick<MessageRow, "conversation_id" | "sender_user_id" | "created_at">>>(
    `messages?conversation_id=in.(${encodeInList(conversationIds)})&select=conversation_id,sender_user_id,created_at&created_at=gte.${encodeURIComponent(sinceIso)}`,
    { method: "GET" },
    params.accessToken
  );

  return rows.filter((row) => {
    const buyerUserId = buyerByConversationId.get(row.conversation_id);
    if (!buyerUserId) return false;
    if (row.sender_user_id !== buyerUserId) return false;
    if (params.excludeSenderUserId && row.sender_user_id === params.excludeSenderUserId) return false;
    return true;
  }).length;
}
