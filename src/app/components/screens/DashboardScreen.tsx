import { Button, Badge, StatCard, Logo } from "../ds";
import { PRODUCTS } from "../../data/mock-data";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router";
import {
  Plus,
  Eye,
  Package,
  Euro,
  MessageCircle,
  Settings,
  ChevronRight,
  TrendingUp,
  Bell,
} from "lucide-react";

export function DashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.shopName || user?.lastName || "Maison Dupont";
  const sellerProducts = PRODUCTS.slice(0, 4);

  // Mock seller stats
  const totalSales = 1247.5;
  const sellerFee = totalSales * 0.02;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <button className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full" />
            </button>
            <button className="w-9 h-9 bg-green-light rounded-full flex items-center justify-center">
              <span className="text-sm">BD</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Bonjour, {displayName} 👋</h1>
            <p className="text-muted-foreground text-sm">
              Voici un aperçu de votre activité
            </p>
          </div>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate("/add-product")}
          >
            <span className="hidden sm:inline">Ajouter un produit</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon="💰"
            label="Ventes ce mois"
            value="1 247,50 €"
            trend="+12%"
          />
          <StatCard
            icon="📦"
            label="Commandes"
            value="34"
            trend="+8%"
          />
          <StatCard
            icon="👁️"
            label="Vues boutique"
            value="892"
            trend="+23%"
          />
          <StatCard
            icon="💬"
            label="Messages"
            value="12"
          />
        </div>

        {/* Seller fee info */}
        <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-green" />
              Récapitulatif financier
            </h4>
            <Badge variant="outline">Mars 2026</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-light rounded-xl p-3">
              <p className="text-muted-foreground mb-1">Ventes brutes</p>
              <p className="text-xl text-green">{totalSales.toFixed(2)} €</p>
            </div>
            <div className="bg-coral-light rounded-xl p-3">
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                Commission plateforme
                <Badge variant="coral">2% vendeur</Badge>
              </p>
              <p className="text-xl text-coral">-{sellerFee.toFixed(2)} €</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-muted-foreground mb-1">Net à percevoir</p>
              <p className="text-xl">{(totalSales - sellerFee).toFixed(2)} €</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green" />
            MonCadeauLocal prélève 2% sur chaque vente (côté vendeur). L'acheteur paie également 2% de frais de service.
          </p>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h4 className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Mes produits ({sellerProducts.length})
            </h4>
            <button className="text-sm text-coral flex items-center gap-1">
              Tout voir <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {sellerProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{product.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-coral">
                      {product.price.toFixed(2)} €
                    </span>
                    <Badge
                      variant={product.availableToday ? "success" : "default"}
                    >
                      {product.availableToday ? "En ligne" : "Brouillon"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Stock : {product.stock}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h4>Commandes récentes</h4>
            <button className="text-sm text-coral flex items-center gap-1">
              Tout voir <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {[
              {
                id: "MCL-2026-0847",
                buyer: "Marie D.",
                amount: 53.9,
                status: "Retrait en attente",
                statusVariant: "warning" as const,
                time: "Il y a 15 min",
              },
              {
                id: "MCL-2026-0846",
                buyer: "Thomas L.",
                amount: 45.0,
                status: "Livré",
                statusVariant: "success" as const,
                time: "Il y a 2h",
              },
              {
                id: "MCL-2026-0845",
                buyer: "Sophie M.",
                amount: 28.5,
                status: "Retiré",
                statusVariant: "success" as const,
                time: "Hier",
              },
            ].map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-sm">
                    {order.buyer} · #{order.id.slice(-4)}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{order.amount.toFixed(2)} €</p>
                  <Badge variant={order.statusVariant}>{order.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { icon: <Plus className="w-5 h-5" />, label: "Ajouter produit", path: "/add-product" },
            { icon: <Eye className="w-5 h-5" />, label: "Voir ma vitrine", path: "/shop/s1" },
            { icon: <MessageCircle className="w-5 h-5" />, label: "Messages", path: "/messages" },
            { icon: <Settings className="w-5 h-5" />, label: "Paramètres", path: "/settings" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
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