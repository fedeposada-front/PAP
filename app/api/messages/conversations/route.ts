import { NextResponse } from "next/server";

import {
  fetchResolvedAccessibleConversations,
  fetchResolvedConversation,
} from "../../../../src/app/services/server/messages";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function GET(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Authentification requise." },
        { status: 401 }
      );
    }

    const conversationId = new URL(request.url).searchParams.get("conversationId")?.trim() ?? "";
    const result = conversationId
      ? await fetchResolvedConversation({ accessToken, conversationId })
      : await fetchResolvedAccessibleConversations({ accessToken });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required|jwt|token|session invalide/i.test(message)
      ? 401
      : /requis|invalide|introuvable/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
