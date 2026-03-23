"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Header } from "../ds";
import { useAuth } from "../AuthContext";
import {
  fetchNewsFeed,
  likeShopNews,
  unlikeShopNews,
  type FeedNewsItem,
} from "../../services/shopNews";

function formatNewsDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function NewsFeedScreenNext() {
  const router = useRouter();
  const pathname = usePathname();
  const push = (path: string) => router.push(path);
  const { user, accessToken } = useAuth();
  const [items, setItems] = useState<FeedNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingLikeId, setActingLikeId] = useState<string | null>(null);

  const refreshFeed = async () => {
    const nextItems = await fetchNewsFeed({
      accessToken,
      userId: user?.id,
    });
    setItems(nextItems);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const nextItems = await fetchNewsFeed({
          accessToken,
          userId: user?.id,
        });
        if (!cancelled) setItems(nextItems);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  const handleToggleLike = (item: FeedNewsItem) => {
    const run = async () => {
      if (!user?.id || !accessToken) {
        push(`/auth?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const nextLiked = !item.likedByMe;
      setActingLikeId(item.id);
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                likedByMe: nextLiked,
                likeCount: Math.max(0, entry.likeCount + (nextLiked ? 1 : -1)),
              }
            : entry
        )
      );

      try {
        if (nextLiked) {
          await likeShopNews({
            newsId: item.id,
            userId: user.id,
            accessToken,
          });
        } else {
          await unlikeShopNews({
            newsId: item.id,
            userId: user.id,
            accessToken,
          });
        }
      } catch {
        await refreshFeed();
      } finally {
        setActingLikeId(null);
      }
    };
    void run();
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header title="Fil d'actualités" onBack={() => router.back()} />
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune actualité publiée pour le moment.</p>
        ) : (
          <div className="space-y-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl overflow-hidden border border-border/50 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => push(`/shop/${encodeURIComponent(item.shopSlug)}/news/${item.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 p-4">
                    <img
                      src={item.shopImageUrl || item.imageUrl}
                      alt={item.shopName}
                      className="w-11 h-11 rounded-full object-cover border border-border bg-muted"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.shopName}</p>
                      <p className="text-xs text-muted-foreground">{formatNewsDate(item.createdAt)}</p>
                    </div>
                  </div>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-80 object-cover"
                    />
                  ) : (
                    <div className="w-full h-80 bg-muted" />
                  )}
                  <div className="p-4">
                    <p className="font-semibold mb-2">{item.title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
                      {item.description || "Aucune description."}
                    </p>
                  </div>
                </button>
                <div className="px-4 pb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(item)}
                    disabled={actingLikeId === item.id}
                    className={`inline-flex items-center gap-2 text-sm transition-colors ${
                      item.likedByMe ? "text-coral" : "text-muted-foreground hover:text-foreground"
                    } disabled:opacity-50`}
                  >
                    <Heart className={`w-5 h-5 ${item.likedByMe ? "fill-coral" : ""}`} />
                    {item.likeCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => push(`/shop/${encodeURIComponent(item.shopSlug)}`)}
                    className="text-sm text-coral hover:text-coral/80 transition-colors"
                  >
                    Voir la boutique
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
