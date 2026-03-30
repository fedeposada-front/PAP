import { NextResponse } from "next/server";

import { saveShopStorefront } from "../../../../src/app/services/server/shopStorefront";

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

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const result = await saveShopStorefront({
      accessToken,
      shopName: typeof body?.shopName === "string" ? body.shopName : "",
      shopCategory: typeof body?.shopCategory === "string" ? body.shopCategory : "",
      shopDesc: typeof body?.shopDesc === "string" ? body.shopDesc : "",
      shopStory: typeof body?.shopStory === "string" ? body.shopStory : "",
      shopAddress: typeof body?.shopAddress === "string" ? body.shopAddress : "",
      shopCity: typeof body?.shopCity === "string" ? body.shopCity : "",
      shopPostal: typeof body?.shopPostal === "string" ? body.shopPostal : "",
      shopPhone: typeof body?.shopPhone === "string" ? body.shopPhone : "",
      shopEmail: typeof body?.shopEmail === "string" ? body.shopEmail : "",
      shopWebsite: typeof body?.shopWebsite === "string" ? body.shopWebsite : "",
      schedule: body?.schedule && typeof body.schedule === "object" ? (body.schedule as Record<string, unknown>) : {},
      openHolidays: Boolean(body?.openHolidays),
      pickup: Boolean(body?.pickup),
      delivery: Boolean(body?.delivery),
      deliveryHand: Boolean(body?.deliveryHand),
      deliveryPost: Boolean(body?.deliveryPost),
      deliveryCarrier: Boolean(body?.deliveryCarrier),
      logoImage: typeof body?.logoImage === "string" ? body.logoImage : null,
      bannerImage: typeof body?.bannerImage === "string" ? body.bannerImage : null,
      isPublished: Boolean(body?.isPublished),
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne.";
    const status = /authentification|required/i.test(message)
      ? 401
      : /acces refuse|interdit/i.test(message)
        ? 403
        : /introuvable|invalide|requis|selectionnez|activez/i.test(message)
          ? 400
          : 500;

    return NextResponse.json({ ok: false, message }, { status });
  }
}
