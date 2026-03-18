"use client";

import { Button, StatCard, Logo } from "../ds";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Copy,
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
  Users,
} from "lucide-react";
import { getLeadStats } from "../../services/leadEvents";
import {
  deleteSellerProduct,
  fetchSellerProducts,
  updateSellerProductPublishStatus,
} from "../../services/sellerProducts";
import type { Product, ShopTeamMember } from "../../types/catalog";
import { getShopHref } from "../../utils/shopRouting";
import { fetchShopSettings, saveShopTeamMembers } from "../../services/shopSettings";
import {
  createSellerShopNews,
  deleteSellerShopNews,
  fetchSellerShopNews,
  type ShopNewsItem,
  updateSellerShopNews,
  updateSellerShopNewsPublishStatus,
} from "../../services/shopNews";
import { fetchShopFollowers, fetchShopFollowersCount, type ShopFollowerItem } from "../../services/shopFollowers";

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
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const newsFileInputRef = useRef<HTMLInputElement | null>(null);
  const [teamMembers, setTeamMembers] = useState<ShopTeamMember[]>([]);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [shopPublished, setShopPublished] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followers, setFollowers] = useState<ShopFollowerItem[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const displayName = user?.shopName || fullName || "Votre boutique";
  const publicShopHref = getShopHref({
    id: shopId ?? user?.id ?? "seller",
    name: displayName,
  });
  const previewShopHref = `${publicShopHref}?preview=1`;

  const leadStats = useMemo(
    () => getLeadStats({ shopId: shopId ?? "seller", sinceDays: 30 }),
    [shopId]
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
        setProductActionMessage(null);
        const nextProducts = await fetchSellerProducts({
          userId: user.id,
          accessToken,
        });
        if (!cancelled) setProducts(nextProducts);
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setProductActionMessage(error instanceof Error ? error.message : "Impossible de charger les produits.");
        }
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

  useEffect(() => {
    if (!user?.id || !accessToken || !user?.siretVerified) {
      setTeamMembers([]);
      setShopPublished(false);
      setShopId(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const shop = await fetchShopSettings(user.id, accessToken);
        if (!cancelled) {
          setTeamMembers(shop?.teamMembers ?? []);
          setShopPublished(Boolean(shop?.is_published));
          setShopId(shop?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setTeamMembers([]);
          setShopPublished(false);
          setShopId(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.siretVerified, accessToken]);

  useEffect(() => {
    if (!shopId || !accessToken) {
      setFollowersCount(0);
      setFollowers([]);
      return;
    }

    let cancelled = false;
    setIsLoadingFollowers(true);
    const run = async () => {
      try {
        const [count, nextFollowers] = await Promise.all([
          fetchShopFollowersCount(shopId, accessToken),
          fetchShopFollowers({ shopId, accessToken }),
        ]);
        if (!cancelled) {
          setFollowersCount(count);
          setFollowers(nextFollowers);
        }
      } catch {
        if (!cancelled) {
          setFollowersCount(0);
          setFollowers([]);
        }
      } finally {
        if (!cancelled) setIsLoadingFollowers(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [shopId, accessToken]);

  const formatFollowerDate = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  if (!user || !user.siretVerified) {
    return null;
  }

  const sellerShopPath = shopPublished ? publicShopHref : previewShopHref;

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

  const handleDuplicateProduct = (product: Product) => {
    push(`/add-product?duplicate=${encodeURIComponent(product.id)}`);
  };

  const handleEditProduct = (product: Product) => {
    push(`/add-product?edit=${encodeURIComponent(product.id)}`);
  };

  const handlePreviewProduct = (product: Product) => {
    if (typeof window === "undefined") return;
    const href = product.isPublished
      ? `/product/${encodeURIComponent(product.id)}`
      : `/product/${encodeURIComponent(product.id)}?preview=1`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const resetNewsForm = () => {
    setNewsTitle("");
    setNewsDescription("");
    setNewsImageUrl("");
    setEditingNewsId(null);
    if (newsFileInputRef.current) {
      newsFileInputRef.current.value = "";
    }
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
      setNewsActionMessage(null);
      try {
        if (editingNewsId) {
          await updateSellerShopNews({
            newsId: editingNewsId,
            accessToken,
            title,
            description,
            imageUrl,
          });
        } else {
          await createSellerShopNews({
            userId: user.id,
            accessToken,
            title,
            description,
            imageUrl,
            isPublished: true,
          });
        }
        resetNewsForm();
        await refreshNews();
        setNewsActionMessage(editingNewsId ? "Actualité modifiée." : "Actualité publiée.");
      } catch (error) {
        setNewsActionMessage(
          error instanceof Error
            ? error.message
            : editingNewsId
              ? "Impossible de modifier l'actualité."
              : "Impossible d'ajouter l'actualité."
        );
      }
    };
    void run();
  };

  const handleNewsImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNewsActionMessage("Selectionnez un fichier image.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewsImageUrl(reader.result);
        setNewsActionMessage(null);
      }
    };
    reader.readAsDataURL(file);
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
        if (editingNewsId === item.id) {
          resetNewsForm();
        }
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

  const handleEditNews = (item: ShopNewsItem) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsDescription(item.description);
    setNewsImageUrl(item.imageUrl);
    setNewsActionMessage("Mode modification actif.");
  };

  const handleAddTeamMember = () => {
    setTeamMembers((prev) => [...prev, { name: "", role: "", imageUrl: "" }]);
    setTeamMessage(null);
  };

  const handleUpdateTeamMember = (index: number, patch: Partial<ShopTeamMember>) => {
    setTeamMembers((prev) =>
      prev.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member
      )
    );
    setTeamMessage(null);
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, memberIndex) => memberIndex !== index));
    setTeamMessage(null);
  };

  const handleTeamImageUpload = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setTeamMessage("Selectionnez une image pour le membre de l'equipe.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleUpdateTeamMember(index, { imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTeam = () => {
    const run = async () => {
      if (!user?.id || !accessToken) return;
      const normalizedTeamMembers = teamMembers
        .map((member) => ({
          name: member.name.trim(),
          role: member.role?.trim() || "",
          imageUrl: member.imageUrl?.trim() || "",
        }))
        .filter((member) => member.name);

      if (normalizedTeamMembers.length === 0) {
        setTeamMessage("Ajoutez au moins une personne dans l'equipe.");
        return;
      }

      setIsSavingTeam(true);
      setTeamMessage(null);
      try {
        await saveShopTeamMembers({
          userId: user.id,
          accessToken,
          teamMembers: normalizedTeamMembers,
        });
        setTeamMembers(normalizedTeamMembers);
        setTeamMessage("Equipe enregistree.");
      } catch (error) {
        setTeamMessage(error instanceof Error ? error.message : "Impossible d'enregistrer l'equipe.");
      } finally {
        setIsSavingTeam(false);
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
onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(previewShopHref, "_blank", "noopener,noreferrer");
                  }
                }}              className="h-9 px-3 rounded-full bg-green-light inline-flex items-center gap-1.5 max-w-[220px] hover:bg-green-light/80 transition-colors"
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

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
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
          <StatCard
            icon="👥"
            label="Abonnés"
            value={String(followersCount)}
          />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-green" />
            <h4>Suivi de l'entreprise</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {followersCount === 0 ? "Aucun client ne suit encore votre boutique." : `${followersCount} client${followersCount > 1 ? "s" : ""} suivent votre boutique.`}
          </p>
          {isLoadingFollowers && (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}
          {!isLoadingFollowers && followers.length === 0 && (
            <p className="text-sm text-muted-foreground">Le suivi apparaîtra ici dès les premiers abonnements.</p>
          )}
          {!isLoadingFollowers && followers.length > 0 && (
            <div className="space-y-2">
              {followers.slice(0, 8).map((follower) => (
                <div key={`${follower.userId}-${follower.followedAt ?? "na"}`} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate">{follower.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {follower.followedAt ? `Suit la boutique depuis le ${formatFollowerDate(follower.followedAt)}` : "Client abonné"}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm text-muted-foreground border border-border">
                    {follower.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4>Mes produits</h4>
            <Button size="sm" variant="outline" onClick={() => push("/add-product")}>
              Ajouter
            </Button>
          </div>
          {!shopPublished && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Vos produits ne seront visibles qu'après publication de la boutique.
            </div>
          )}
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
                        onClick={() => handlePreviewProduct(product)}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted flex items-center justify-center"
                        title={product.isPublished ? "Voir la fiche produit" : "Voir l'aperçu privé"}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDuplicateProduct(product)}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted flex items-center justify-center"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
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
              ref={newsFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleNewsImageUpload}
            />
            <button
              type="button"
              onClick={() => newsFileInputRef.current?.click()}
              className="bg-input-background rounded-xl px-3 py-2 text-sm outline-none text-left hover:bg-muted transition-colors"
            >
              {newsImageUrl ? "Image selectionnee" : "Ouvrir un fichier image"}
            </button>
            <Button size="sm" onClick={handleCreateNews}>
              {editingNewsId ? "Enregistrer" : "Publier une actualité"}
            </Button>
          </div>
          {editingNewsId && (
            <div className="mb-3">
              <button
                type="button"
                onClick={resetNewsForm}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler la modification
              </button>
            </div>
          )}
          {newsImageUrl && (
            <div className="mb-3">
              <img
                src={newsImageUrl}
                alt="Apercu actualite"
                className="w-20 h-20 rounded-xl object-cover border border-border bg-white"
              />
            </div>
          )}
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
                        onClick={() => handleEditNews(item)}
                        disabled={actingNewsId === item.id}
                        className="w-8 h-8 rounded-md bg-white border border-border hover:bg-muted disabled:opacity-50 flex items-center justify-center"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
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
          <div className="flex items-center justify-between mb-3">
            <h4>Équipe de la boutique</h4>
            <Button size="sm" variant="outline" onClick={handleAddTeamMember}>
              Ajouter
            </Button>
          </div>

          {teamMembers.length === 0 && (
            <p className="text-sm text-muted-foreground mb-3">
              Ajoutez les personnes qui représentent votre boutique.
            </p>
          )}

          <div className="space-y-3">
            {teamMembers.map((member, index) => (
              <div key={index} className="rounded-xl bg-muted/40 p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="relative w-16 h-16 rounded-2xl overflow-hidden border border-border bg-white cursor-pointer flex items-center justify-center">
                    {member.imageUrl ? (
                      <img src={member.imageUrl} alt={member.name || "Membre"} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleTeamImageUpload(event, index)}
                    />
                  </label>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={member.name}
                      onChange={(event) => handleUpdateTeamMember(index, { name: event.target.value })}
                      placeholder="Nom"
                      className="bg-input-background rounded-xl px-3 py-2 text-sm outline-none"
                    />
                    <input
                      value={member.role ?? ""}
                      onChange={(event) => handleUpdateTeamMember(index, { role: event.target.value })}
                      placeholder="Fonction"
                      className="bg-input-background rounded-xl px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTeamMember(index)}
                    className="w-9 h-9 rounded-md bg-white border border-border hover:bg-muted flex items-center justify-center self-start"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{teamMessage}</p>
            <Button size="sm" onClick={handleSaveTeam} disabled={isSavingTeam}>
              {isSavingTeam ? "Enregistrement..." : "Enregistrer l'équipe"}
            </Button>
          </div>
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
