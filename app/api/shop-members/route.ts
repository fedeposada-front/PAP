import { NextResponse } from "next/server";

import { fetchOwnerShopMembers } from "../../../src/app/services/server/shopInvitations";

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

    const shopId = new URL(request.url).searchParams.get("shopId")?.trim() ?? "";
    if (!shopId) {
      return NextResponse.json(
        { ok: false, message: "shopId est requis." },
        { status: 400 }
      );
    }

    const result = await fetchOwnerShopMembers({
      accessToken,
      shopId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required|session invalide/i.test(message)
      ? 401
      : /seul le proprietaire|interdit/i.test(message)
        ? 403
        : /requis|invalide|introuvable/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
