import { sendTransactionalEmail } from "./email";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const APP_URL = process.env.APP_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

const MAX_NOTIFICATION_ATTEMPTS = 3;
const RETRY_DELAYS_MINUTES = [5, 15];

type NotificationStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "provider_missing";

interface NotificationJobRow {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  status: NotificationStatus;
  attempt_count: number;
  scheduled_at: string;
  processed_at: string | null;
  provider: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
}

interface ConversationRow {
  id: string;
  buyer_user_id: string;
  buyer_display_name: string | null;
  shop_id: string;
}

interface ShopRow {
  id: string;
  name: string;
  owner_user_id: string | null;
}

interface AuthUserResponse {
  id: string;
  email?: string | null;
}

type ProcessedJobResult = {
  messageId: string;
  status: NotificationStatus | "not_found" | "skipped";
  detail?: string;
};

function hasServerSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAppUrl(requestOrigin?: string) {
  return APP_URL || requestOrigin || "http://localhost:3000";
}

function buildConversationUrl(baseUrl: string, conversationId: string) {
  return `${baseUrl.replace(/\/$/, "")}/messages?conversation=${encodeURIComponent(conversationId)}`;
}

function buildRetryDate(attemptCount: number) {
  const delayMinutes =
    RETRY_DELAYS_MINUTES[Math.min(Math.max(attemptCount - 1, 0), RETRY_DELAYS_MINUTES.length - 1)];
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

function buildReplyEmail(params: {
  senderLabel: string;
  recipientLabel: string;
  messageBody: string;
  conversationUrl: string;
}) {
  const safeSender = escapeHtml(params.senderLabel);
  const safeRecipient = escapeHtml(params.recipientLabel);
  const safeBody = escapeHtml(params.messageBody).replaceAll("\n", "<br />");

  return {
    subject: `Nouveau message de ${params.senderLabel} sur Lovcal`,
    text: [
      `Bonjour ${params.recipientLabel},`,
      "",
      `${params.senderLabel} vous a envoye un nouveau message sur Lovcal :`,
      "",
      params.messageBody,
      "",
      `Repondre : ${params.conversationUrl}`,
    ].join("\n"),
    html: [
      `<p>Bonjour ${safeRecipient},</p>`,
      `<p><strong>${safeSender}</strong> vous a envoye un nouveau message sur Lovcal :</p>`,
      `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #ef6f79;background:#fff5f5;border-radius:8px;">${safeBody}</blockquote>`,
      `<p><a href="${escapeHtml(params.conversationUrl)}" style="display:inline-block;padding:12px 18px;background:#ef6f79;color:#ffffff;text-decoration:none;border-radius:999px;">Voir la conversation</a></p>`,
    ].join(""),
  };
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

async function requestSupabaseAuthAdmin<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur auth admin Supabase.";
    throw new Error(message);
  }

  return payload as T;
}

async function fetchAuthenticatedUser(accessToken: string): Promise<AuthUserResponse | null> {
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
  const payload = (await response.json().catch(() => null)) as AuthUserResponse | null;
  return payload;
}

async function fetchNotificationJobByMessageId(messageId: string) {
  const rows = await requestSupabaseRest<NotificationJobRow[]>(
    `message_email_notifications?message_id=eq.${messageId}&select=id,message_id,conversation_id,sender_user_id,recipient_user_id,status,attempt_count,scheduled_at,processed_at,provider,provider_message_id,last_error,created_at&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchPendingNotificationJobs(limit: number) {
  const nowIso = new Date().toISOString();
  return requestSupabaseRest<NotificationJobRow[]>(
    `message_email_notifications?status=eq.pending&scheduled_at=lte.${encodeURIComponent(nowIso)}&select=id,message_id,conversation_id,sender_user_id,recipient_user_id,status,attempt_count,scheduled_at,processed_at,provider,provider_message_id,last_error,created_at&order=scheduled_at.asc&limit=${limit}`
  );
}

async function claimNotificationJob(job: NotificationJobRow) {
  const rows = await requestSupabaseRest<NotificationJobRow[]>(
    `message_email_notifications?id=eq.${job.id}&status=eq.pending&select=id,message_id,conversation_id,sender_user_id,recipient_user_id,status,attempt_count,scheduled_at,processed_at,provider,provider_message_id,last_error,created_at`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "processing",
        attempt_count: job.attempt_count + 1,
        last_error: null,
      }),
    }
  );
  return rows[0] ?? null;
}

async function updateNotificationJob(jobId: string, patch: Record<string, unknown>) {
  await requestSupabaseRest(
    `message_email_notifications?id=eq.${jobId}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    }
  );
}

async function fetchMessage(messageId: string) {
  const rows = await requestSupabaseRest<MessageRow[]>(
    `messages?id=eq.${messageId}&select=id,conversation_id,sender_user_id,body,created_at&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchConversation(conversationId: string) {
  const rows = await requestSupabaseRest<ConversationRow[]>(
    `conversations?id=eq.${conversationId}&select=id,buyer_user_id,buyer_display_name,shop_id&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchShop(shopId: string) {
  const rows = await requestSupabaseRest<ShopRow[]>(
    `shops?id=eq.${shopId}&select=id,name,owner_user_id&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchAuthUserEmail(userId: string) {
  const payload = await requestSupabaseAuthAdmin<{ user?: AuthUserResponse; email?: string | null }>(
    `users/${userId}`
  );
  return payload.user?.email?.trim() || payload.email?.trim() || null;
}

async function handleNotificationFailure(job: NotificationJobRow, errorMessage: string): Promise<ProcessedJobResult> {
  if (job.attempt_count >= MAX_NOTIFICATION_ATTEMPTS) {
    await updateNotificationJob(job.id, {
      status: "failed",
      processed_at: new Date().toISOString(),
      last_error: errorMessage,
    });
    return { messageId: job.message_id, status: "failed", detail: errorMessage };
  }

  await updateNotificationJob(job.id, {
    status: "pending",
    scheduled_at: buildRetryDate(job.attempt_count),
    processed_at: null,
    last_error: errorMessage,
  });
  return { messageId: job.message_id, status: "pending", detail: errorMessage };
}

async function processJob(job: NotificationJobRow, requestOrigin?: string): Promise<ProcessedJobResult> {
  const claimedJob = await claimNotificationJob(job);
  if (!claimedJob) {
    return {
      messageId: job.message_id,
      status: "skipped",
      detail: "Job deja traite ou en cours.",
    };
  }

  try {
    const [message, conversation] = await Promise.all([
      fetchMessage(claimedJob.message_id),
      fetchConversation(claimedJob.conversation_id),
    ]);

    if (!message || !conversation) {
      await updateNotificationJob(claimedJob.id, {
        status: "failed",
        processed_at: new Date().toISOString(),
        last_error: "Message ou conversation introuvable.",
      });
      return {
        messageId: claimedJob.message_id,
        status: "failed",
        detail: "Message ou conversation introuvable.",
      };
    }

    const shop = await fetchShop(conversation.shop_id);
    if (!shop) {
      await updateNotificationJob(claimedJob.id, {
        status: "failed",
        processed_at: new Date().toISOString(),
        last_error: "Boutique introuvable.",
      });
      return {
        messageId: claimedJob.message_id,
        status: "failed",
        detail: "Boutique introuvable.",
      };
    }

    const recipientEmail = await fetchAuthUserEmail(claimedJob.recipient_user_id);
    if (!recipientEmail) {
      return handleNotificationFailure(claimedJob, "Aucun email destinataire trouve.");
    }

    const isBuyerMessage = message.sender_user_id === conversation.buyer_user_id;
    const senderLabel = isBuyerMessage
      ? (conversation.buyer_display_name?.trim() || "Client")
      : shop.name;
    const recipientLabel = isBuyerMessage ? shop.name : (conversation.buyer_display_name?.trim() || "Client");
    const conversationUrl = buildConversationUrl(
      getAppUrl(requestOrigin),
      conversation.id
    );
    const emailContent = buildReplyEmail({
      senderLabel,
      recipientLabel,
      messageBody: message.body,
      conversationUrl,
    });

    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (!result.ok) {
      if (result.code === "provider_missing") {
        await updateNotificationJob(claimedJob.id, {
          status: "provider_missing",
          processed_at: new Date().toISOString(),
          provider: result.provider,
          last_error: result.message,
        });
        return {
          messageId: claimedJob.message_id,
          status: "provider_missing",
          detail: result.message,
        };
      }

      return handleNotificationFailure(claimedJob, result.message);
    }

    await updateNotificationJob(claimedJob.id, {
      status: "sent",
      processed_at: new Date().toISOString(),
      provider: result.provider,
      provider_message_id: result.providerMessageId,
      last_error: null,
    });

    return { messageId: claimedJob.message_id, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue.";
    return handleNotificationFailure(claimedJob, message);
  }
}

export async function processMessageEmailNotificationByMessageId(params: {
  messageId: string;
  requesterUserId: string;
  requestOrigin?: string;
}): Promise<ProcessedJobResult> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const job = await fetchNotificationJobByMessageId(params.messageId);
  if (!job) {
    return { messageId: params.messageId, status: "not_found", detail: "Aucun job trouve." };
  }

  if (job.sender_user_id !== params.requesterUserId) {
    throw new Error("Action interdite pour ce message.");
  }

  if (job.status !== "pending") {
    return {
      messageId: job.message_id,
      status: job.status,
      detail: job.last_error ?? undefined,
    };
  }

  return processJob(job, params.requestOrigin);
}

export async function processPendingMessageEmailNotifications(params?: {
  limit?: number;
  requestOrigin?: string;
}): Promise<ProcessedJobResult[]> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const jobs = await fetchPendingNotificationJobs(params?.limit ?? 10);
  const results: ProcessedJobResult[] = [];

  for (const job of jobs) {
    results.push(await processJob(job, params?.requestOrigin));
  }

  return results;
}

export async function authenticateMessageNotificationRequest(accessToken: string) {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }
  return fetchAuthenticatedUser(accessToken);
}
