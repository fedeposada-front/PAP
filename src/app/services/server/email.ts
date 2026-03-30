export type TransactionalEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type TransactionalEmailResult =
  | {
      ok: true;
      provider: "resend" | "brevo";
      providerMessageId: string | null;
    }
  | {
      ok: false;
      provider: "resend" | "brevo" | null;
      code: "provider_missing" | "send_failed";
      message: string;
    };

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER?.trim().toLowerCase() ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? "";
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim() ?? "";

function getEmailProvider(): "resend" | "brevo" | null {
  if (EMAIL_PROVIDER === "resend" || EMAIL_PROVIDER === "brevo") {
    return EMAIL_PROVIDER;
  }
  if (RESEND_API_KEY) return "resend";
  if (BREVO_API_KEY) return "brevo";
  return null;
}

async function sendWithResend(params: TransactionalEmailParams): Promise<TransactionalEmailResult> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return {
      ok: false,
      provider: "resend",
      code: "provider_missing",
      message: "Configuration Resend manquante.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      provider: "resend",
      code: "send_failed",
      message:
        payload?.error?.message
        ?? payload?.message
        ?? "Echec de l'envoi Resend.",
    };
  }

  return {
    ok: true,
    provider: "resend",
    providerMessageId: payload?.id ?? null,
  };
}

async function sendWithBrevo(params: TransactionalEmailParams): Promise<TransactionalEmailResult> {
  if (!BREVO_API_KEY || !EMAIL_FROM) {
    return {
      ok: false,
      provider: "brevo",
      code: "provider_missing",
      message: "Configuration Brevo manquante.",
    };
  }

  const match = EMAIL_FROM.match(/^(.*)<([^>]+)>$/);
  const senderName = match?.[1]?.trim().replace(/^"|"$/g, "") || "Lovcal";
  const senderEmail = match?.[2]?.trim() || EMAIL_FROM;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { messageId?: string; code?: string; message?: string }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      provider: "brevo",
      code: "send_failed",
      message: payload?.message ?? payload?.code ?? "Echec de l'envoi Brevo.",
    };
  }

  return {
    ok: true,
    provider: "brevo",
    providerMessageId: payload?.messageId ?? null,
  };
}

export async function sendTransactionalEmail(
  params: TransactionalEmailParams
): Promise<TransactionalEmailResult> {
  const provider = getEmailProvider();

  if (!provider || !EMAIL_FROM) {
    return {
      ok: false,
      provider,
      code: "provider_missing",
      message: "Aucun provider email configure.",
    };
  }

  if (provider === "resend") {
    return sendWithResend(params);
  }

  return sendWithBrevo(params);
}
