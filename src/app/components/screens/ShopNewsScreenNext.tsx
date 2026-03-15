"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "../ds";
import { fetchShops } from "../../services/catalog";
import { fetchPublicShopNews, type ShopNewsItem } from "../../services/shopNews";
import type { Shop } from "../../types/catalog";
import { toShopSlug } from "../../utils/shopRouting";

function formatNewsDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function ShopNewsScreenNext() {
  const params = useParams<{ id: string }>();
  const routeParam = decodeURIComponent(params.id ?? "");
  const normalizedRouteParam = routeParam.toLowerCase();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [newsItems, setNewsItems] = useState<ShopNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const shops = await fetchShops();
        const nextShop =
          shops.find(
            (item) =>
              item.id === routeParam ||
              item.slug === normalizedRouteParam ||
              toShopSlug(item.name) === normalizedRouteParam
          ) ?? null;
        if (cancelled) return;
        setShop(nextShop);

        if (!nextShop?.id) {
          setNewsItems([]);
          return;
        }

        const nextNews = await fetchPublicShopNews(nextShop.id);
        if (cancelled) return;
        setNewsItems(nextNews);
      } catch {
        if (cancelled) return;
        setShop(null);
        setNewsItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [routeParam, normalizedRouteParam]);

  if (!isLoading && !shop) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Actualités" onBack={() => router.back()} />
        <div className="px-4 py-10">
          <p className="text-sm text-muted-foreground">Boutique introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Actualités"
        onBack={() => router.back()}
      />
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
        <div className="mb-6">
          <h2>{shop?.name ?? "Boutique"}</h2>
          <p className="text-sm text-muted-foreground">
            Toutes les actualités publiées de la boutique.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : newsItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune actualité publiée.</p>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {newsItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/shop/${encodeURIComponent(shop?.slug ?? toShopSlug(shop?.name ?? ""))}/news/${item.id}`)}
                className="w-full text-left rounded-2xl border border-border/50 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-72 object-cover"
                  />
                ) : (
                  <div className="w-full h-72 bg-muted" />
                )}
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">{formatNewsDate(item.createdAt)}</p>
                  <p className="font-semibold mb-2">{item.title}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
                    {item.description || "Aucune description."}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
