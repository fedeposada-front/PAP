"use client";

import { Button, StatCard, Logo } from "../ds";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Eye,
  MessageCircle,
  Settings,
  Bell,
  Store,
  Pencil,
  Trash2,
  Power,
  Newspaper,
} from "lucide-react";
import { getLeadStats } from "../../services/leadEvents";
import {
  deleteSellerProduct,
  fetchSellerProducts,
  updateSellerProductPublishStatus,
} from "../../services/sellerProducts";
import type { Product } from "../../types/catalog";
import { getShopHref } from "../../utils/shopRouting";
import {
  createSellerShopNews,
  deleteSellerShopNews,
  fetchSellerShopNews,
  type ShopNewsItem,
  updateSellerShopNewsPublishStatus,
} from "../../services/shopNews";

export function DashboardScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productActionMessage, setProductActionMessage] = useState<string | null>(null);
  const [actingProductId, setActingProductId] = useState<string | null>(null);
  const [news, setNews] = useState<ShopNewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsActionMessage, setNewsActionMessage] = useState<string | null>(null);
  const [actingNewsId, setActingNewsId] = useState<string | null>(null);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDescription, setNewsDescription] = useState("");
  const [newsImageUrl, setNewsImageUrl] = useState("");
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const displayName = user?.shopName || fullName || "Votre boutique";

  const leadStats = useMemo(
    () => getLeadStats({ shopId: user?.id ?? "seller", sinceDays: 30 }),
    [user?.id]
  );

  useEffect(() => {
    if (!user) return;
    if (!user.siretVerified) {
      push("/siret");
    }
  }, [user, push]);

  useEffect(() => {
    if (!user?.id || !accessToken || !user?.siretVerified) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setIsLoadingProducts(true);
    const run = async () => {
      try {
        const nextProducts = await fetchSellerProducts({
          userId: user.id,
          accessToken,
        });
        if (!cancelled) setProducts(nextProducts);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.siretVerified, accessToken]);

  useEffect(() => {
    if (!user?.id || !accessToken || !user?.siretVerified) {
      setNews([]);
      return;
    }
    let cancelled = false;
    setIsLoadingNews(true);
    const run = async () => {
      try {
        const nextNews = await fetchSellerShopNews({
          userId: user.id,
          accessToken,
        });
        if (!cancelled) setNews(nextNews);
      } catch {
        if (!cancelled) setNews([]);
      } finally {
        if (!cancelled) setIsLoadingNews(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.siretVerified, accessToken]);

  if (!user || !user.siretVerified) {
    return null;
  }

  const sellerShopPath = products.length > 0
    ? getShopHref({ id: products[0].shopId, name: displayName })
    : "/settings";

  const refreshProducts = async () => {
    if (!user?.id || !accessToken) return;
    const nextProducts = await fetchSellerProducts({
      userId: user.id,
      accessToken,
    });
    setProducts(nextProducts);
  };

  const refreshNews = async () => {
    if (!user?.id || !accessToken) return;
    const nextNews = await fetchSellerShopNews({
      userId: user.id,
      accessToken,
    });
    setNews(nextNews);
  };

  const handleDeleteProduct = (product: Product) => {
    const run = async () => {
      if (!accessToken) return;
      const soldCount = product.soldCount ?? 0;
      if (soldCount > 0) {
        setProductActionMessage("Suppression impossible: ce produit a déjà été vendu.");
        return;
      }
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Supprimer ce produit définitivement ?");
        if (!confirmed) return;
      }
      setActingProductId(product.id);
      setProductActionMessage(null);
      try {
        await deleteSellerProduct({
          productId: product.id,
          accessToken,
        });
        await refreshProducts();
        setProductActionMessage("Produit supprimé.");
      } catch (error) {
        setProductActionMessage(error instanceof Error ? error.message : "Suppression impossible.");
      } finally {
        setActingProductId(null);
      }
    };
    void run();
  };

  const handleTogglePublish = (product: Product) => {
    const run = async () => {
      if (!accessToken) return;
      const nextPublished = !Boolean(product.isPublished);
      setActingProductId(product.id);
      setProductActionMessage(null);
      try {
        await updateSellerProductPublishStatus({
          productId: product.id,
          accessToken,
          isPublished: nextPublished,
        });
        await refreshProducts();
        setProductActionMessage(nextPublished ? "Produit publié." : "Produit désactivé.");
      } catch (error) {
        setProductActionMessage(error instanceof Error ? error.message : "Mise à jour impossible.");
      } finally {
        setActingProductId(null);
      }
    };
    void run();
  };

  const handleCreateNews = () => {
    const run = async () => {
      if (!user?.id || !accessToken) return;
      const title = newsTitle.trim();
      const description = newsDescription.trim();
      const imageUrl = newsImageUrl.trim();
      if (title.length < 3) {
        setNewsActionMessage("Titre actualité requis (min 3 caractères).");
        return;
      }
      if (!description) {
        setNewsActionMessage("Description actualité requise.");
        return;
      }
      if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
        setNewsActionMessage("Image: utilisez une URL http(s).");
        return;
      }

      setNewsActionMessage(null);
      try {
        await createSellerShopNews({
          userId: user.id,
          accessToken,
          title,
          description,
          imageUrl,
          isPublished: true,
        });
        setNewsTitle("");
        setNewsDescription("");
        setNewsImageUrl("");
        await refreshNews();
        setNewsActionMessage("Actualité publiée.");
      } catch (error) {
        setNewsActionMessage(error instanceof Error ? error.message : "Impossible d'ajouter l'actualité.");
      }
    };
    void run();
  };

  const handleDeleteNews = (item: ShopNewsItem) => {
    const run = async () => {
      if (!accessToken) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Supprimer cette actualité ?");
        if (!confirmed) return;
      }
      setActingNewsId(item.id);
      setNewsActionMessage(null);
      try {
        await deleteSellerShopNews({ newsId: item.id, accessToken });
        await refreshNews();
        setNewsActionMessage("Actualité supprimée.");
      } catch (error) {
        setNewsActionMessage(error instanceof Error ? error.message : "Suppression impossible.");
      } finally {
        setActingNewsId(null);
      }
    };
    void run();
  };

  const handleTogglePublishNews = (item: ShopNewsItem) => {
    const run = async () => {
      if (!accessToken) return;
      setActingNewsId(item.id);
      setNewsActionMessage(null);
      try {
        await updateSellerShopNewsPublishStatus({
          newsId: item.id,
          accessToken,
          isPublished: !item.isPublished,
        });
        await refreshNews();
        setNewsActionMessage(!item.isPublished ? "Actualité publiée." : "Actualité dépubliée.");
      } catch (error) {
        setNewsActionMessage(error instanceof Error ? error.message : "Mise à jour impossible.");
      } finally {
        setActingNewsId(null);
      }
    };
    void run();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="xl" href="/home" />
          <div className="flex items-center gap-3">
            <button className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => push("/settings")}
              className="h-9 px-3 rounded-full border border-border bg-white hover:bg-muted transition-colors inline-flex items-center gap-1.5 text-sm"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Parametres
            </button>
            <button
              onClick={() => push("/settings")}
              className="h-9 px-3 rounded-full bg-green-light inline-flex items-center gap-1.5 max-w-[220px] hover:bg-green-light/80 transition-colors"
              title={displayName}
            >
              <Store className="w-4 h-4 text-green flex-shrink-0" />
              <span className="text-sm truncate">{displayName}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Bonjour, {displayName} 👋</h1>
            <p className="text-muted-foreground text-sm">
              Voici un apercu de votre activite
            </p>
          </div>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => push("/add-product")}
          >
            <span className="hidden sm:inline">Ajouter un produit</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon="💰"
            label="Ventes ce mois"
            value="-"
          />
          <StatCard
            icon="📩"
            label="Demandes (30j)"
            value={String(leadStats.reservationRequest)}
          />
          <StatCard
            icon="👁️"
            label="Vues boutique"
            value={String(leadStats.viewShop)}
          />
          <StatCard
            icon="💬"
            label="Messages"
            value={String(leadStats.clickMessage)}
          />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4>Mes produits</h4>
            <Button size="sm" variant="outline" onClick={() => push("/add-product")}>
              Ajouter
            </Button>
          </div>
          {isLoadingProducts && (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}
          {!isLoadingProducts && products.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun produit pour le moment.
            </p>
          )}
          {!isLoadingProducts && products.length > 0 && (
            <div className="space-y-2">
              {products.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="w-full rounded-xl bg-muted/40 p-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-14 h-14 rounded-lg object-cover border border-border bg-white flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.price.toFixed(2)} € · Stock {product.stock}
                      </p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                            product.status === "published"
                              ? "bg-green-light text-green"
                              : product.status === "draft"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {product.status === "published"
                            ? "Publié"
                            : product.status === "draft"
                              ? "Brouillon"
                              : "Désactivé"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => push(`/product/${product.id}`)}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted flex items-center justify-center"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(product)}
                        disabled={actingProductId === product.id}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted disabled:opacity-50 flex items-center justify-center"
                        title={product.isPublished ? "Désactiver" : "Publier"}
                      >
                        <Power className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        disabled={(product.soldCount ?? 0) > 0 || actingProductId === product.id}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                        title={(product.soldCount ?? 0) > 0 ? "Déjà vendu: suppression impossible" : "Supprimer"}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {productActionMessage && (
            <p className="text-sm text-muted-foreground mt-3">{productActionMessage}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-4 h-4 text-coral" />
            <h4>Actualités de la boutique</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-3">
            <input
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              placeholder="Titre (gras dans le carrousel)"
              className="bg-input-background rounded-xl px-3 py-2 text-sm outline-none"
            />
            <input
              value={newsImageUrl}
              onChange={(e) => setNewsImageUrl(e.target.value)}
              placeholder="URL image https://..."
              className="bg-input-background rounded-xl px-3 py-2 text-sm outline-none"
            />
            <Button size="sm" onClick={handleCreateNews}>
              Publier une actualité
            </Button>
          </div>
          <textarea
            value={newsDescription}
            onChange={(e) => setNewsDescription(e.target.value)}
            placeholder="Description"
            className="w-full bg-input-background rounded-xl px-3 py-2 text-sm outline-none min-h-20 mb-3"
          />

          {isLoadingNews && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {!isLoadingNews && news.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune actualité pour le moment.</p>
          )}

          {!isLoadingNews && news.length > 0 && (
            <div className="space-y-2">
              {news.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-start gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-14 h-14 rounded-lg object-cover border border-border bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg border border-border bg-white flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                            item.isPublished ? "bg-green-light text-green" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.isPublished ? "Publié" : "Brouillon"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePublishNews(item)}
                        disabled={actingNewsId === item.id}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted disabled:opacity-50 flex items-center justify-center"
                        title={item.isPublished ? "Dépublier" : "Publier"}
                      >
                        <Power className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item)}
                        disabled={actingNewsId === item.id}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted disabled:opacity-50 flex items-center justify-center"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {newsActionMessage && (
            <p className="text-sm text-muted-foreground mt-3">{newsActionMessage}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <h4 className="mb-2">Données financières</h4>
          <p className="text-sm text-muted-foreground">
            Aucune donnée financière réelle disponible pour le moment.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <h4 className="mb-2">Commandes</h4>
          <p className="text-sm text-muted-foreground">
            Aucune commande réelle à afficher pour le moment.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { icon: <Plus className="w-5 h-5" />, label: "Ajouter produit", path: "/add-product" },
            { icon: <Eye className="w-5 h-5" />, label: "Voir ma vitrine", path: sellerShopPath },
            { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/messages" },
            { icon: <Settings className="w-5 h-5" />, label: "Paramètres", path: "/settings" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => push(action.path)}
              className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-sm"
            >
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                {action.icon}
              </div>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
