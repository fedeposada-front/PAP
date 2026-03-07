import { MapPin, Star, Clock, Truck, ShoppingBag } from "lucide-react";
import type { Shop, Product } from "../data/mock-data";
import { CATEGORIES } from "../data/mock-data";
import logoImg from "../../assets/logo.png";
import giftIcon from "../../assets/gift-icon.png";

function getCategoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

// Logo Component
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights = { sm: "h-8", md: "h-10", lg: "h-16" };
  return (
    <img
      src={logoImg}
      alt="MonCadeauLocal"
      className={`${heights[size]} w-auto object-contain`}
    />
  );
}

// Gift Icon - renders custom gift image or emoji
export function CategoryIcon({ icon, className = "" }: { icon: string; className?: string }) {
  if (icon === "gift-custom") {
    return <img src={giftIcon} alt="Cadeau" className={`inline-block object-contain ${className || "w-5 h-5"}`} />;
  }
  return <span className={className}>{icon}</span>;
}

// Badge Component
export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "accent" | "muted";
}) {
  const styles = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-bleu-light text-bleu",
    accent: "bg-accent/10 text-accent",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${styles[variant]}`}>
      {children}
    </span>
  );
}

// Product Card
export function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-all text-left w-full group"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.availableToday && (
          <div className="absolute top-2 left-2">
            <Badge variant="success">
              <Clock size={10} />
              Dispo aujourd'hui
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground mb-0.5 truncate">{getCategoryLabel(product.category)}</p>
        <p className="text-sm truncate mb-1">{product.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-primary">{product.price.toFixed(2)} €</span>
          <div className="flex gap-1">
            {product.pickup && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <ShoppingBag size={10} />
              </span>
            )}
            {product.delivery && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Truck size={10} />
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Shop Card
export function ShopCard({
  shop,
  onClick,
}: {
  shop: Shop;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-all text-left w-full flex gap-3 p-3"
    >
      <img
        src={shop.image}
        alt={shop.name}
        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm truncate">{shop.name}</p>
          {shop.isOpen ? (
            <Badge variant="success">Ouvert</Badge>
          ) : (
            <Badge variant="muted">Fermé</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-1">{getCategoryLabel(shop.category)} · {shop.distance}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Star size={12} className="text-coral fill-coral" />
          <span>{shop.rating}</span>
          <span>({shop.reviewCount} avis)</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {shop.pickupToday && <Badge variant="accent">Retrait aujourd'hui</Badge>}
          {shop.delivery && <Badge variant="default">Livraison</Badge>}
          {shop.openSunday && <Badge variant="warning">Dim/JF</Badge>}
        </div>
      </div>
    </button>
  );
}

// Filter Chip
export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-foreground border border-border hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

// Bottom Tab Bar (Mobile)
export function BottomTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = [
    { id: "explore", label: "Explorer", icon: MapPin },
    { id: "search", label: "Recherche", icon: (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> },
    { id: "cart", label: "Panier", icon: ShoppingBag },
    { id: "profile", label: "Profil", icon: (props: any) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} className="w-5 h-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Empty State
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground" />
      </div>
      <h3 className="mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
