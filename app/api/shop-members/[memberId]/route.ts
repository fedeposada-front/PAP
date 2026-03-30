import { NextResponse } from "next/server";

import {
  removeShopMember,
  updateShopMemberRoles,
} from "../../../../src/app/services/server/shopInvitations";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Authentification requise." },
        { status: 401 }
      );
    }

    const { memberId } = await context.params;
    if (!memberId?.trim()) {
      return NextResponse.json(
        { ok: false, message: "memberId est requis." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as { roles?: unknown } | null;
    const roles = readStringArray(body?.roles);

    const result = await updateShopMemberRoles({
      accessToken,
      shopMemberId: memberId,
      roles,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required|session invalide/i.test(message)
      ? 401
      : /seul le proprietaire|interdit/i.test(message)
        ? 403
        : /requis|invalide|introuvable|choisissez/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Authentification requise." },
        { status: 401 }
      );
    }

    const { memberId } = await context.params;
    if (!memberId?.trim()) {
      return NextResponse.json(
        { ok: false, message: "memberId est requis." },
        { status: 400 }
      );
    }

    await removeShopMember({
      accessToken,
      shopMemberId: memberId,
    });

    return NextResponse.json({ ok: true, result: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required|session invalide/i.test(message)
      ? 401
      : /seul le proprietaire|interdit/i.test(message)
        ? 403
        : /requis|invalide|introuvable|ne peut pas/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
