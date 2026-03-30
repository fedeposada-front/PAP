import { NextResponse } from "next/server";

import {
  createShopMemberInvitation,
  fetchOwnerPendingShopInvitations,
  revokeShopMemberInvitation,
} from "../../../../src/app/services/server/shopInvitations";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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
      shopId?: unknown;
      invitedEmail?: unknown;
      roles?: unknown;
    } | null;

    const shopId = readString(body?.shopId);
    const invitedEmail = readString(body?.invitedEmail);
    const roles = readStringArray(body?.roles);

    if (!shopId || !invitedEmail) {
      return NextResponse.json(
        { ok: false, message: "shopId et invitedEmail sont requis." },
        { status: 400 }
      );
    }

    const result = await createShopMemberInvitation({
      accessToken,
      shopId,
      invitedEmail,
      roles,
      requestOrigin: new URL(request.url).origin,
    });

    return NextResponse.json(
      { ok: result.ok, result, message: result.message },
      { status: result.ok ? 200 : 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required|session invalide/i.test(message)
      ? 401
      : /seul le proprietaire|interdit/i.test(message)
        ? 403
        : /requis|invalide|choisissez/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
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

    const result = await fetchOwnerPendingShopInvitations({
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
        : /requis|invalide/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Authentification requise." },
        { status: 401 }
      );
    }

    const invitationId = new URL(request.url).searchParams.get("invitationId")?.trim() ?? "";
    if (!invitationId) {
      return NextResponse.json(
        { ok: false, message: "invitationId est requis." },
        { status: 400 }
      );
    }

    await revokeShopMemberInvitation({
      accessToken,
      invitationId,
    });

    return NextResponse.json({ ok: true, result: null });
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
