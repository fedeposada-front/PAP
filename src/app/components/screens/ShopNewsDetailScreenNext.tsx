"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "../ds";
import { fetchShops } from "../../services/catalog";
import { fetchPublicShopNewsItem, type ShopNewsItem } from "../../services/shopNews";
import type { Shop } from "../../types/catalog";
import { toShopSlug } from "../../utils/shopRouting";

function formatNewsDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ShopNewsDetailScreenNext() {
  const params = useParams<{ id: string; newsId: string }>();
  const routeParam = decodeURIComponent(params.id ?? "");
  const newsId = decodeURIComponent(params.newsId ?? "");
  const normalizedRouteParam = routeParam.toLowerCase();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [newsItem, setNewsItem] = useState<ShopNewsItem | null>(null);
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

        if (!nextShop?.id || !newsId) {
          setNewsItem(null);
          return;
        }

        const nextNewsItem = await fetchPublicShopNewsItem({
          shopId: nextShop.id,
          newsId,
        });
        if (cancelled) return;
        setNewsItem(nextNewsItem);
      } catch {
        if (cancelled) return;
        setShop(null);
        setNewsItem(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [routeParam, normalizedRouteParam, newsId]);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Actualité" onBack={() => router.back()} />
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : !shop || !newsItem ? (
          <p className="text-sm text-muted-foreground">Actualité introuvable.</p>
        ) : (
          <article className="rounded-2xl border border-border/50 bg-white overflow-hidden shadow-sm">
            {newsItem.imageUrl ? (
              <img
                src={newsItem.imageUrl}
                alt={newsItem.title}
                className="w-full h-80 object-cover"
              />
            ) : (
              <div className="w-full h-80 bg-muted" />
            )}
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-2">
                {shop.name} · {formatNewsDate(newsItem.createdAt)}
              </p>
              <h2 className="mb-4">{newsItem.title}</h2>
              <p className="text-base text-muted-foreground whitespace-pre-line leading-7">
                {newsItem.description || "Aucune description."}
              </p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
