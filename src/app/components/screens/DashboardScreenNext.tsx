"use client";

import { Button, StatCard, Logo } from "../ds";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Copy,
  Plus,
  Eye,
  MessageCircle,
  Settings,
  Store,
  Pencil,
  Trash2,
  Power,
  Newspaper,
  Users,
  LogOut,
  Mail,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { getLeadStats } from "../../services/leadEvents";
import { fetchShopIncomingMessageCount, subscribeToMessages } from "../../services/messages";
import {
  deleteSellerProduct,
  fetchSellerProducts,
  updateSellerProductPublishStatus,
} from "../../services/sellerProducts";
import type { Product, ShopTeamMember } from "../../types/catalog";
import { getProductHref, getShopHref } from "../../utils/shopRouting";
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
import { fetchManagedShopAccess, type ManagedShopAccess } from "../../services/shopAccess";
import {
  ASSIGNABLE_SHOP_MEMBER_ROLES,
  createShopMemberInvitation,
  fetchPendingShopInvitations,
  fetchShopMembers,
  removeShopMember,
  revokeShopInvitation,
  type AssignableShopMemberRole,
  type ShopInvitationListItem,
  type ShopMemberListItem,
  updateShopMemberRoles,
} from "../../services/shopInvitations";
import type { BusinessType } from "../../types/catalog";

const MEMBER_ROLE_META: Record<
  AssignableShopMemberRole,
  { label: string; description: string }
> = {
  manager: {
    label: "Gestion",
    description: "Pilotage global de l'entreprise",
  },
  support: {
    label: "Support",
    description: "Messagerie client et suivi des demandes",
  },
  catalog: {
    label: "Catalogue",
    description: "Produits, services, prix et publication",
  },
  content: {
    label: "Contenu",
    description: "Actualites, story et vitrine publique",
  },
};

function isAssignableShopMemberRole(role: string): role is AssignableShopMemberRole {
  return ASSIGNABLE_SHOP_MEMBER_ROLES.includes(role as AssignableShopMemberRole);
}

function buildEditableMemberRoles(member: ShopMemberListItem) {
  const roles = member.roles.filter(isAssignableShopMemberRole);
  if (isAssignableShopMemberRole(member.primaryRole)) {
    return [member.primaryRole, ...roles.filter((role) => role !== member.primaryRole)];
  }
  return roles;
}

function areRoleArraysEqual(left: AssignableShopMemberRole[], right: AssignableShopMemberRole[]) {
  return left.length === right.length && left.every((role, index) => role === right[index]);
}

export function DashboardScreenNext() {
  const router = useRouter();
  const push = useCallback((path: string) => router.push(path), [router]);
  const { user, accessToken, isLoading: isAuthLoading, logout, switchRole } = useAuth();
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<AssignableShopMemberRole[]>(["support"]);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [invitationEmailSent, setInvitationEmailSent] = useState<boolean | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<ShopInvitationListItem[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);
  const [memberAccessList, setMemberAccessList] = useState<ShopMemberListItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [actingMemberId, setActingMemberId] = useState<string | null>(null);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, AssignableShopMemberRole[]>>({});
  const [shopPublished, setShopPublished] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [shopBusinessType, setShopBusinessType] = useState<BusinessType>("product");
  const [businessTypeConfigured, setBusinessTypeConfigured] = useState<boolean | null>(null);
  const [shopAccess, setShopAccess] = useState<ManagedShopAccess | null>(null);
  const [dashboardResolved, setDashboardResolved] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followers, setFollowers] = useState<ShopFollowerItem[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const displayName = shopName || shopAccess?.shopName || user?.shopName || fullName || "Votre boutique";
  const greetingName = (() => {
    const baseName = (user?.firstName ?? "").trim() || displayName;
    if (!baseName) return "bonjour";
    return baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();
  })();
  const publicShopHref = getShopHref({
    id: shopId ?? user?.id ?? "seller",
    name: displayName,
    slug: shopSlug,
  });
  const previewShopHref = `${publicShopHref}?preview=1`;
  const canManageCatalog = Boolean(shopAccess?.canManageCatalog);
  const canManageContent = Boolean(shopAccess?.canManageContent);
  const canSupport = Boolean(shopAccess?.canSupport);
  const canManageMembers = Boolean(shopAccess?.canManageMembers);
  const canManageSettings = Boolean(shopAccess?.canManageSettings);
  const canOpenSettings = canManageSettings || canManageContent;

  const leadStats = useMemo(
    () => getLeadStats({ shopId: shopId ?? "seller", sinceDays: 30, excludeActorUserId: user?.id }),
    [shopId, user?.id]
  );
  const stats = [
    { icon: "💰", label: "Ventes ce mois", value: "-", onClick: undefined },
    { icon: "📩", label: "Demandes (30j)", value: String(leadStats.reservationRequest), onClick: undefined },
    { icon: "👁️", label: "Vues boutique", value: String(leadStats.viewShop), onClick: undefined },
    { icon: "💬", label: "Messages", value: String(messageCount), onClick: canSupport ? () => push("/messages") : undefined },
    { icon: "👥", label: "Abonnés", value: String(followersCount), onClick: undefined },
  ] as const;

  useEffect(() => {
    if (!user) return;
    if (user.role === "seller") return;

    const run = async () => {
      if (user.roles.includes("seller")) {
        await switchRole("seller");
        return;
      }
      push("/auth?role=seller");
    };

    void run();
  }, [user?.id, user?.role, user?.roles, push, switchRole]);

  useEffect(() => {
    if (!user?.id || !accessToken || user.role !== "seller" || !canManageCatalog) {
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
  }, [user?.id, user?.role, accessToken, canManageCatalog]);

  useEffect(() => {
    if (!user?.id || !accessToken || user.role !== "seller" || !canManageContent) {
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
  }, [user?.id, user?.role, accessToken, canManageContent]);

  useEffect(() => {
    if (!user?.id || user.role !== "seller") {
      setTeamMembers([]);
      setShopPublished(false);
      setShopId(null);
      setShopName("");
      setShopSlug(null);
      setShopBusinessType("product");
      setBusinessTypeConfigured(null);
      setShopAccess(null);
      setDashboardMessage(null);
      setDashboardResolved(false);
      return;
    }
    if (!accessToken) {
      setTeamMembers([]);
      setShopPublished(false);
      setShopId(null);
      setShopName("");
      setShopSlug(null);
      setShopBusinessType("product");
      setBusinessTypeConfigured(null);
      setShopAccess(null);
      setDashboardMessage(
        isAuthLoading
          ? null
          : "Session incomplète. Rechargez la page ou reconnectez-vous pour ouvrir le tableau de bord."
      );
      setDashboardResolved(!isAuthLoading);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        if (!cancelled) setDashboardMessage(null);
        const access = await fetchManagedShopAccess({
          userId: user.id,
          accessToken,
        });
        if (!cancelled) {
          setShopAccess(access);
        }

        if (!access && !user.siretVerified) {
          if (!cancelled) {
            push("/siret");
          }
          return;
        }

        const shop = await fetchShopSettings(user.id, accessToken);
        if (!cancelled) {
          const isConfigured = access?.isOwner ? Boolean(shop?.business_type_configured) : true;
          setShopBusinessType(
            shop?.business_type === "service" || shop?.business_type === "hybrid"
              ? shop.business_type
              : "product"
          );
          setBusinessTypeConfigured(isConfigured);
          if (!isConfigured) {
            push("/onboarding?next=/dashboard");
            return;
          }
          setShopName(shop?.name ?? access?.shopName ?? "");
          setShopSlug(shop?.slug ?? null);
          setTeamMembers(shop?.teamMembers ?? []);
          setShopPublished(Boolean(shop?.is_published));
          setShopId(shop?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setTeamMembers([]);
          setShopPublished(false);
          setShopId(null);
          setShopName("");
          setShopSlug(null);
          setShopBusinessType("product");
          setBusinessTypeConfigured(true);
          setShopAccess(null);
          setDashboardMessage("Impossible de charger l'espace entreprise pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setDashboardResolved(true);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, user?.siretVerified, accessToken, isAuthLoading, push]);

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

  useEffect(() => {
    if (!shopId || !accessToken || !canSupport) {
      setMessageCount(0);
      return;
    }

    let cancelled = false;

    const refreshMessageCount = async () => {
      try {
        const count = await fetchShopIncomingMessageCount({
          shopId,
          accessToken,
          sinceDays: 30,
          excludeSenderUserId: user?.id,
        });
        if (!cancelled) setMessageCount(count);
      } catch {
        if (!cancelled) setMessageCount(0);
      }
    };

    void refreshMessageCount();
    const unsubscribe = subscribeToMessages(() => {
      void refreshMessageCount();
    });
    const intervalId = window.setInterval(() => {
      void refreshMessageCount();
    }, 10000);
    const handleFocus = () => {
      void refreshMessageCount();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [shopId, user?.id, accessToken, canSupport]);

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

  const formatRoleLabel = (role: string) => {
    if (role in MEMBER_ROLE_META) {
      return MEMBER_ROLE_META[role as AssignableShopMemberRole].label;
    }
    if (role === "owner") return "Proprietaire";
    if (role === "member") return "Membre";
    return role;
  };

  const businessTypeLabel =
    shopBusinessType === "service"
      ? "Services"
      : shopBusinessType === "hybrid"
        ? "Produits et services"
        : "Produits";

  const formatInvitationDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  useEffect(() => {
    if (!shopId || !accessToken || !canManageMembers) {
      setPendingInvitations([]);
      setMemberAccessList([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsLoadingInvitations(true);
      setIsLoadingMembers(true);
      try {
        const [nextInvitations, nextMembers] = await Promise.all([
          fetchPendingShopInvitations({ accessToken, shopId }),
          fetchShopMembers({ accessToken, shopId }),
        ]);
        if (!cancelled) {
          setPendingInvitations(nextInvitations);
          setMemberAccessList(nextMembers);
        }
      } catch {
        if (!cancelled) {
          setPendingInvitations([]);
          setMemberAccessList([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInvitations(false);
          setIsLoadingMembers(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [shopId, accessToken, canManageMembers]);

  useEffect(() => {
    setMemberRoleDrafts((prev) => {
      const nextDrafts: Record<string, AssignableShopMemberRole[]> = {};
      for (const member of memberAccessList) {
        nextDrafts[member.id] = prev[member.id] ?? buildEditableMemberRoles(member);
      }
      return nextDrafts;
    });
  }, [memberAccessList]);

  if (!user) {
    return null;
  }

  if (user.role !== "seller" || !dashboardResolved) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
          <div className="rounded-3xl border border-border bg-white px-6 py-8 text-center shadow-sm">
            <h3>Chargement du tableau de bord</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Nous préparons votre espace entreprise.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dashboardMessage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-white p-6 shadow-sm">
            <h3>Tableau de bord indisponible</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {dashboardMessage}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                fullWidth
                variant="accent"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.reload();
                  }
                }}
              >
                Recharger
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => push("/home")}
              >
                Retour à l&apos;accueil
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (businessTypeConfigured === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-white p-6 shadow-sm">
            <h3>Dernière étape avant le tableau de bord</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Choisissez d&apos;abord si votre entreprise propose des produits, des services, ou les deux.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                fullWidth
                variant="accent"
                onClick={() => push("/onboarding?next=/dashboard")}
              >
                Continuer l&apos;onboarding
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => push("/home")}
              >
                Retour à l&apos;accueil
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleOpenSellerPreview = () => {
    push(previewShopHref);
  };

  const handleLogout = () => {
    const run = async () => {
      await logout();
      push("/home");
    };

    void run();
  };

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

  const refreshShopAccess = async () => {
    if (!shopId || !accessToken) return;
    const [nextInvitations, nextMembers] = await Promise.all([
      fetchPendingShopInvitations({ accessToken, shopId }),
      fetchShopMembers({ accessToken, shopId }),
    ]);
    setPendingInvitations(nextInvitations);
    setMemberAccessList(nextMembers);
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
      ? getProductHref({
          id: product.id,
          shopSlug: product.shopSlug,
          shopName: product.shopName,
        })
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

  const toggleInviteRole = (role: AssignableShopMemberRole) => {
    setInviteRoles((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== role);
      }
      return [...prev, role];
    });
    setInvitationMessage(null);
  };

  const handleCopyInvitationLink = () => {
    if (!invitationLink || typeof window === "undefined") return;

    const copy = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(invitationLink);
          setInvitationMessage("Lien d'invitation copie.");
          return;
        }
      } catch {
        // fallback below
      }

      window.prompt("Copiez ce lien d'invitation :", invitationLink);
      setInvitationMessage("Lien d'invitation pret a etre copie.");
    };

    void copy();
  };

  const handleSendInvitation = () => {
    const run = async () => {
      if (!shopId || !accessToken) {
        setInvitationMessage("Session invalide. Rechargez la page.");
        return;
      }

      const normalizedEmail = inviteEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        setInvitationMessage("Adresse email requise.");
        return;
      }
      if (inviteRoles.length === 0) {
        setInvitationMessage("Choisissez au moins un role.");
        return;
      }

      setIsSendingInvitation(true);
      setInvitationMessage(null);
      setInvitationLink(null);
      setInvitationEmailSent(null);
      try {
        const result = await createShopMemberInvitation({
          accessToken,
          shopId,
          invitedEmail: normalizedEmail,
          roles: inviteRoles,
        });
        setInvitationMessage(result.message);
        setInvitationLink(result.invitationUrl);
        setInvitationEmailSent(result.emailSent);
        if (result.ok) {
          setInviteEmail("");
          setInviteRoles(["support"]);
          await refreshShopAccess();
        }
      } catch (error) {
        setInvitationMessage(
          error instanceof Error ? error.message : "Impossible d'envoyer l'invitation."
        );
        setInvitationEmailSent(false);
      } finally {
        setIsSendingInvitation(false);
      }
    };

    void run();
  };

  const handleRevokeInvitation = (invitation: ShopInvitationListItem) => {
    const run = async () => {
      if (!accessToken || !shopId) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(`Revoquer l'invitation envoyee a ${invitation.invitedEmail} ?`);
        if (!confirmed) return;
      }

      setActingInvitationId(invitation.id);
      setInvitationMessage(null);
      try {
        await revokeShopInvitation({
          accessToken,
          invitationId: invitation.id,
        });
        await refreshShopAccess();
        setInvitationMessage("Invitation revoquee.");
      } catch (error) {
        setInvitationMessage(
          error instanceof Error ? error.message : "Impossible de revoquer l'invitation."
        );
      } finally {
        setActingInvitationId(null);
      }
    };

    void run();
  };

  const toggleMemberRole = (member: ShopMemberListItem, role: AssignableShopMemberRole) => {
    setMemberRoleDrafts((prev) => {
      const current = prev[member.id] ?? buildEditableMemberRoles(member);
      if (current.includes(role)) {
        if (current.length === 1) return prev;
        return {
          ...prev,
          [member.id]: current.filter((item) => item !== role),
        };
      }

      return {
        ...prev,
        [member.id]: [...current, role],
      };
    });
    setMemberMessage(null);
  };

  const handleSaveMemberRoles = (member: ShopMemberListItem) => {
    const run = async () => {
      if (!accessToken) return;
      const roles = memberRoleDrafts[member.id] ?? buildEditableMemberRoles(member);
      if (roles.length === 0) {
        setMemberMessage("Choisissez au moins un role.");
        return;
      }

      setActingMemberId(member.id);
      setMemberMessage(null);
      try {
        const updatedMember = await updateShopMemberRoles({
          accessToken,
          memberId: member.id,
          roles,
        });
        setMemberAccessList((prev) =>
          prev.map((item) => (item.id === updatedMember.id ? updatedMember : item))
        );
        setMemberRoleDrafts((prev) => ({
          ...prev,
          [updatedMember.id]: buildEditableMemberRoles(updatedMember),
        }));
        setMemberMessage(`Roles mis a jour pour ${updatedMember.displayName}.`);
      } catch (error) {
        setMemberMessage(
          error instanceof Error ? error.message : "Impossible de mettre a jour les roles."
        );
      } finally {
        setActingMemberId(null);
      }
    };

    void run();
  };

  const handleRemoveMemberAccess = (member: ShopMemberListItem) => {
    const run = async () => {
      if (!accessToken) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(`Retirer ${member.displayName} de l'entreprise ?`);
        if (!confirmed) return;
      }

      setActingMemberId(member.id);
      setMemberMessage(null);
      try {
        await removeShopMember({
          accessToken,
          memberId: member.id,
        });
        setMemberAccessList((prev) => prev.filter((item) => item.id !== member.id));
        setMemberRoleDrafts((prev) => {
          const next = { ...prev };
          delete next[member.id];
          return next;
        });
        setMemberMessage(`${member.displayName} a ete retire de l'entreprise.`);
      } catch (error) {
        setMemberMessage(
          error instanceof Error ? error.message : "Impossible de retirer ce membre."
        );
      } finally {
        setActingMemberId(null);
      }
    };

    void run();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="lg" href="/home" />
          <div className="hidden items-center gap-3 lg:flex">
            {canOpenSettings && (
              <button
                onClick={() => push("/settings")}
                className="h-9 px-3 rounded-full border border-border bg-white hover:bg-muted transition-colors inline-flex items-center gap-1.5 text-sm"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Parametres
              </button>
            )}
            <button
              onClick={handleOpenSellerPreview}
              className="h-9 px-3 rounded-full bg-green-light inline-flex items-center gap-1.5 max-w-[220px] hover:bg-green-light/80 transition-colors"
              title={displayName}
            >
              <Store className="w-4 h-4 text-green flex-shrink-0" />
              <span className="text-sm truncate">{displayName}</span>
            </button>
          </div>
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white transition-colors hover:bg-muted"
                  aria-label="Ouvrir les options vendeur"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl border-border p-1.5">
                <DropdownMenuItem onSelect={handleOpenSellerPreview} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                  Voir ma vitrine
                </DropdownMenuItem>
                {canManageCatalog && (
                  <DropdownMenuItem onSelect={() => push("/add-product")} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                    Ajouter une offre
                  </DropdownMenuItem>
                )}
                {canSupport && (
                  <DropdownMenuItem onSelect={() => push("/messages")} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                    Messages
                  </DropdownMenuItem>
                )}
                {canOpenSettings && (
                  <DropdownMenuItem onSelect={() => push("/settings")} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
                    Paramètres
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-destructive">
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[2rem] leading-[1.05] tracking-tight lg:text-[2.75rem]">
              Bonjour, {greetingName} 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              Voici un aperçu de votre activité
            </p>
          </div>
          {canManageCatalog && (
            <Button
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => push("/add-product")}
              className="shrink-0 rounded-2xl px-4 py-3"
            >
              <span className="hidden sm:inline">Ajouter une offre</span>
              <span className="sm:hidden">Nouvelle offre</span>
            </Button>
          )}
        </div>

        {canManageSettings && (
          <div className="mb-6 rounded-3xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Type d&apos;activité LOVCAL</p>
                <h4 className="mt-1">{businessTypeLabel}</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configurez ici si votre entreprise propose des produits, des services, ou les deux.
                </p>
              </div>
              <Button variant="outline" onClick={() => push("/onboarding?next=/dashboard&edit=1")}>
                Modifier
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {stats.map((item) => {
            const card = (
              <StatCard
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            );

            if (!item.onClick) {
              return <div key={item.label}>{card}</div>;
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="rounded-2xl text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-coral/30"
                aria-label={`Ouvrir ${item.label}`}
              >
                {card}
              </button>
            );
          })}
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

        {canManageCatalog && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4>Mes offres</h4>
            <Button size="sm" variant="outline" onClick={() => push("/add-product")}>
              Ajouter une offre
            </Button>
          </div>
          {!shopPublished && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Vos offres ne seront visibles qu'apres publication de l'entreprise.
            </div>
          )}
          {isLoadingProducts && (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}
          {!isLoadingProducts && products.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune offre pour le moment.
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
                        {product.offerType === "service"
                          ? `A partir de ${product.price.toFixed(2)} €`
                          : `${product.price.toFixed(2)} € · Stock ${product.stock}`}
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
        )}

        {canManageContent && (
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
        )}

        {canManageMembers && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-coral" />
            <h4>Inviter un membre</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Invitez une personne par email pour lui donner un acces interne a votre entreprise.
            Les roles definissent ce qu'elle pourra gerer sur LOVCAL.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
            <input
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value);
                setInvitationMessage(null);
              }}
              placeholder="email@entreprise.fr"
              className="bg-input-background rounded-xl px-3 py-3 text-sm outline-none"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <Button
              onClick={handleSendInvitation}
              disabled={isSendingInvitation || !shopId}
              className="rounded-xl px-5 py-3"
            >
              {isSendingInvitation ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ASSIGNABLE_SHOP_MEMBER_ROLES.map((role) => {
              const isActive = inviteRoles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleInviteRole(role)}
                  className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-coral bg-coral-light text-coral"
                      : "border-border bg-white text-foreground hover:border-coral/30"
                  }`}
                >
                  {MEMBER_ROLE_META[role].label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {inviteRoles.map((role) => (
              <div key={role} className="rounded-xl bg-muted/40 px-3 py-2">
                <p className="text-sm">{MEMBER_ROLE_META[role].label}</p>
                <p className="text-xs text-muted-foreground">{MEMBER_ROLE_META[role].description}</p>
              </div>
            ))}
          </div>

          {invitationMessage && (
            <p className={`mt-4 text-sm ${invitationEmailSent === false ? "text-amber-700" : "text-muted-foreground"}`}>
              {invitationMessage}
            </p>
          )}

          {invitationLink && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                {invitationEmailSent
                  ? "Lien genere pour reference."
                  : "Email non envoye. Vous pouvez transmettre ce lien manuellement."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={invitationLink}
                  readOnly
                  className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm outline-none border border-border"
                />
                <Button variant="outline" onClick={handleCopyInvitationLink} className="rounded-xl">
                  <Copy className="w-4 h-4" />
                  Copier le lien
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h5>Invitations en attente</h5>
              {isLoadingInvitations && <span className="text-xs text-muted-foreground">Chargement...</span>}
            </div>
            {!isLoadingInvitations && pendingInvitations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune invitation en attente pour le moment.
              </p>
            )}
            {pendingInvitations.length > 0 && (
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="rounded-xl bg-muted/40 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate">{invitation.invitedEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          Envoyee le {formatInvitationDate(invitation.createdAt)} · expire le {formatInvitationDate(invitation.expiresAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {invitation.roles.map((role) => (
                            <span key={role} className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs border border-border">
                              {formatRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevokeInvitation(invitation)}
                        disabled={actingInvitationId === invitation.id}
                        className="rounded-xl"
                      >
                        {actingInvitationId === invitation.id ? "Revocation..." : "Revoquer"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}

        {canManageMembers && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-green" />
            <h4>Membres avec acces interne</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Voici les comptes deja rattaches a votre entreprise sur LOVCAL.
          </p>

          {isLoadingMembers && (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          )}

          {!isLoadingMembers && memberAccessList.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun membre interne pour le moment.
            </p>
          )}

          {!isLoadingMembers && memberAccessList.length > 0 && (
            <div className="space-y-2">
              {memberAccessList.map((member) => (
                <div key={member.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate">{member.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            Role principal : {formatRoleLabel(member.primaryRole)}
                          </p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-sm text-muted-foreground">
                          {member.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {ASSIGNABLE_SHOP_MEMBER_ROLES.map((role) => {
                          const selectedRoles = memberRoleDrafts[member.id] ?? buildEditableMemberRoles(member);
                          const isActive = selectedRoles.includes(role);
                          return (
                            <button
                              key={`${member.id}-${role}`}
                              type="button"
                              onClick={() => toggleMemberRole(member, role)}
                              disabled={actingMemberId === member.id}
                              className={`rounded-full border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                                isActive
                                  ? "border-coral bg-coral-light text-coral"
                                  : "border-border bg-white text-foreground hover:border-coral/30"
                              }`}
                            >
                              {MEMBER_ROLE_META[role].label}
                            </button>
                          );
                        })}
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Le role principal reste prioritaire tant qu'il est selectionne.
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveMemberRoles(member)}
                          disabled={
                            actingMemberId === member.id
                            || (memberRoleDrafts[member.id] ?? buildEditableMemberRoles(member)).length === 0
                            || areRoleArraysEqual(
                              memberRoleDrafts[member.id] ?? buildEditableMemberRoles(member),
                              buildEditableMemberRoles(member)
                            )
                          }
                          className="rounded-xl"
                        >
                          {actingMemberId === member.id ? "Enregistrement..." : "Enregistrer les roles"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMemberAccess(member)}
                          disabled={actingMemberId === member.id}
                          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                        >
                          Retirer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {memberMessage && (
            <p className="mt-3 text-sm text-muted-foreground">{memberMessage}</p>
          )}
          </div>
        )}

        {canManageSettings && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4>Equipe visible sur la vitrine</h4>
            <Button size="sm" variant="outline" onClick={handleAddTeamMember}>
              Ajouter
            </Button>
          </div>

          {teamMembers.length === 0 && (
            <p className="text-sm text-muted-foreground mb-3">
              Ajoutez les personnes affichees publiquement sur la vitrine de l'entreprise.
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
              {isSavingTeam ? "Enregistrement..." : "Enregistrer la vitrine equipe"}
            </Button>
          </div>
          </div>
        )}

        {canManageSettings && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <h4 className="mb-2">Données financières</h4>
          <p className="text-sm text-muted-foreground">
            Aucune donnée financière réelle disponible pour le moment.
          </p>
          </div>
        )}

        {canSupport && (
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <h4 className="mb-2">Support client</h4>
          <p className="text-sm text-muted-foreground">
            Accès actif à la messagerie de l'entreprise.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {messageCount > 0
              ? `${messageCount} message${messageCount > 1 ? "s" : ""} à traiter.`
              : "Aucun nouveau message pour le moment."}
          </p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            canManageCatalog ? { icon: <Plus className="w-5 h-5" />, label: "Ajouter une offre", path: "/add-product" } : null,
            { icon: <Eye className="w-5 h-5" />, label: "Voir ma vitrine", path: sellerShopPath },
            canSupport ? { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/messages" } : null,
            canOpenSettings ? { icon: <Settings className="w-5 h-5" />, label: "Paramètres", path: "/settings" } : null,
          ].filter(Boolean).map((action) => (
            <button
              key={action!.label}
              onClick={() => push(action!.path)}
              className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-sm"
            >
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                {action!.icon}
              </div>
              {action!.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
