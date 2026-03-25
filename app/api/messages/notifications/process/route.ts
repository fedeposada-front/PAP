import { NextResponse } from "next/server";
import {
  authenticateMessageNotificationRequest,
  processMessageEmailNotificationByMessageId,
  processPendingMessageEmailNotifications,
} from "../../../../../src/app/services/server/messageEmailNotifications";

const NOTIFICATION_WORKER_SECRET = process.env.NOTIFICATION_WORKER_SECRET?.trim() ?? "";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      messageId?: unknown;
      limit?: unknown;
    } | null;
    const messageId = readString(body?.messageId);
    const limit = readPositiveInteger(body?.limit, 10);
    const requestOrigin = new URL(request.url).origin;
    const workerSecret = readString(request.headers.get("x-notification-worker-secret"));

    if (NOTIFICATION_WORKER_SECRET && workerSecret === NOTIFICATION_WORKER_SECRET) {
      const results = await processPendingMessageEmailNotifications({
        limit,
        requestOrigin,
      });
      return NextResponse.json({ ok: true, results });
    }

    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Authentification requise." },
        { status: 401 }
      );
    }

    if (!messageId) {
      return NextResponse.json(
        { ok: false, message: "messageId requis." },
        { status: 400 }
      );
    }

    const authUser = await authenticateMessageNotificationRequest(accessToken);
    if (!authUser?.id) {
      return NextResponse.json(
        { ok: false, message: "Session invalide." },
        { status: 401 }
      );
    }

    const result = await processMessageEmailNotificationByMessageId({
      messageId,
      requesterUserId: authUser.id,
      requestOrigin,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /interdite/i.test(message) ? 403 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
