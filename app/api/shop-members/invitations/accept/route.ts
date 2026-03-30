import { NextResponse } from "next/server";

import { acceptShopMemberInvitation } from "../../../../../src/app/services/server/shopInvitations";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function POST(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Authentification requise." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      token?: unknown;
    } | null;

    const token = readString(body?.token);
    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Token d'invitation requis." },
        { status: 400 }
      );
    }

    const result = await acceptShopMemberInvitation({
      accessToken,
      token,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required|session invalide/i.test(message)
      ? 401
      : /connectez-vous avec l'adresse email invitee|expire|revoquee|invalide|utilisee/i.test(message)
        ? 400
        : /introuvable/i.test(message)
          ? 404
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
