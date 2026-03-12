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
} from "lucide-react";
import { getLeadStats } from "../../services/leadEvents";
import { fetchSellerProducts } from "../../services/sellerProducts";
import type { Product } from "../../types/catalog";

export function DashboardScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
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

  if (!user || !user.siretVerified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="xl" />
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
                <button
                  key={product.id}
                  onClick={() => push(`/product/${product.id}`)}
                  className="w-full rounded-xl bg-muted/40 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                >
                  <p className="truncate">{product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.price.toFixed(2)} € · Stock {product.stock}
                  </p>
                </button>
              ))}
            </div>
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
            { icon: <Eye className="w-5 h-5" />, label: "Voir ma vitrine", path: "/shop/s1" },
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
