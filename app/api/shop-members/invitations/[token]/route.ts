import { NextResponse } from "next/server";

import { fetchShopInvitationPreviewByToken } from "../../../../../src/app/services/server/shopInvitations";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const invitation = await fetchShopInvitationPreviewByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { ok: false, message: "Invitation introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, invitation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /introuvable/i.test(message) ? 404 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
