import { NextResponse } from "next/server";

type AnyRecord = Record<string, unknown>;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildCompanyName(item: AnyRecord): string {
  return (
    readString(item.nom_complet) ||
    readString(item.nom_raison_sociale) ||
    readString(item.denomination) ||
    readString(item.enseigne) ||
    "Entreprise"
  );
}

function buildAddress(item: AnyRecord): string {
  const siege = (item.siege as AnyRecord | undefined) ?? {};
  const numero = readString(siege.numero_voie);
  const type = readString(siege.type_voie);
  const voie = readString(siege.libelle_voie);
  const cp = readString(siege.code_postal);
  const ville = readString(siege.libelle_commune);

  const street = [numero, type, voie].filter(Boolean).join(" ").trim();
  return [street, cp, ville].filter(Boolean).join(", ");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { siret?: string } | null;
    const siret = (body?.siret ?? "").replace(/\s/g, "");

    if (!/^\d{14}$/.test(siret)) {
      return NextResponse.json(
        { ok: false, message: "Le SIRET doit contenir 14 chiffres." },
        { status: 400 }
      );
    }

    const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
    url.searchParams.set("q", siret);
    url.searchParams.set("per_page", "10");

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: "Impossible de joindre l'API SIRET." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as { results?: AnyRecord[] };
    const results = Array.isArray(payload.results) ? payload.results : [];

    const match = results.find((item) => {
      const rawSiret =
        readString(item.siret) ||
        readString((item.siege as AnyRecord | undefined)?.siret);
      return rawSiret.replace(/\s/g, "") === siret;
    });

    if (!match) {
      return NextResponse.json(
        { ok: false, message: "SIRET introuvable dans la base officielle." },
        { status: 404 }
      );
    }

    const companyName = buildCompanyName(match);
    const address = buildAddress(match);
    const city = readString((match.siege as AnyRecord | undefined)?.libelle_commune);

    return NextResponse.json({
      ok: true,
      siret,
      companyName,
      address,
      city,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Erreur interne pendant la verification SIRET." },
      { status: 500 }
    );
  }
}
