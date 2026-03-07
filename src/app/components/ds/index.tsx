import React from "react";
import {
  Star,
  MapPin,
  Clock,
  Check,
  ChevronRight,
  X,
  Search,
  ShoppingBag,
  MessageCircle,
  User,
} from "lucide-react";

import logoHorizontalImg from "../../../assets/logo horizontal.png";
import giftIconImg from "../../../assets/gift-icon.png";

// ─── CATEGORY ICON ─────────────────────────────────────
export function CategoryIcon({ icon, className = "" }: { icon: string; className?: string }) {
  if (icon === "gift-custom") {
    return <img src={giftIconImg} alt="Cadeau" className={`inline-block object-contain ${className || "w-5 h-5"}`} />;
  }
  return <span className={className}>{icon}</span>;
}

// ─── BUTTONS ───────────────────────────────────────────
export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  onClick,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 cursor-pointer select-none";
  const variants = {
    primary: "bg-coral text-white hover:bg-coral/90 active:scale-[0.98]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-white text-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    accent: "bg-green text-white hover:bg-green/90 active:scale-[0.98]",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5",
    lg: "px-6 py-3.5",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? "w-full" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── BADGE ─────────────────────────────────────────────
export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "coral" | "outline";
  className?: string;
}) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    success: "bg-green-light text-green",
    warning: "bg-bleu-light text-bleu",
    coral: "bg-coral-light text-coral",
    outline: "border border-border text-muted-foreground bg-white",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// ─── CHIP / FILTER ─────────────────────────────────────
export function Chip({
  children,
  active = false,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm whitespace-nowrap transition-all cursor-pointer ${
        active
          ? "bg-coral text-white shadow-sm"
          : "bg-white text-foreground border border-border hover:border-coral/30"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── INPUT ─────────────────────────────────────────────
export function Input({
  placeholder,
  value,
  onChange,
  icon,
  type = "text",
  className = "",
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  icon?: React.ReactNode;
  type?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 bg-input-background rounded-xl px-4 py-3 ${className}`}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ─── PRODUCT CARD ──────────────────────────────────────
export function ProductCard({
  image,
  title,
  price,
  shopName,
  availableToday,
  onClick,
}: {
  image: string;
  title: string;
  price: number;
  shopName: string;
  availableToday?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {availableToday && (
          <div className="absolute top-2.5 left-2.5">
            <Badge variant="success">
              <Check className="w-3 h-3" /> Dispo aujourd'hui
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground mb-0.5">{shopName}</p>
        <p className="text-sm truncate mb-1">{title}</p>
        <p className="text-coral">{price.toFixed(2)} €</p>
      </div>
    </div>
  );
}

// ─── SHOP CARD ────────────────────────────────────────
export function ShopCard({
  image,
  name,
  category,
  distance,
  rating,
  reviewCount,
  isOpen,
  pickupToday,
  onClick,
}: {
  image: string;
  name: string;
  category: string;
  distance: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  pickupToday: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex gap-3.5 bg-white rounded-2xl p-3 shadow-sm border border-border/50 hover:shadow-md transition-shadow cursor-pointer"
    >
      <img
        src={image}
        alt={name}
        className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate">{name}</p>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-coral fill-coral" />
            {rating}
          </span>
          <span>({reviewCount})</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <MapPin className="w-3 h-3" />
            {distance}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {isOpen ? (
            <Badge variant="success">
              <Clock className="w-3 h-3" /> Ouvert
            </Badge>
          ) : (
            <Badge variant="default">Fermé</Badge>
          )}
          {pickupToday && <Badge variant="coral">Retrait aujourd'hui</Badge>}
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV (Mobile) ──────────────────────────────
export function BottomNav({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (tab: string) => void;
}) {
  const tabs = [
    { id: "home", label: "Explorer", icon: MapPin },
    { id: "search", label: "Recherche", icon: Search },
    { id: "cart", label: "Panier", icon: ShoppingBag },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "profile", label: "Profil", icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white border-t border-border px-2 py-1.5 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              active === tab.id ? "text-coral" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── HEADER ────────────────────────────────────────────
export function Header({
  title,
  onBack,
  right,
  transparent = false,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  return (
    <header
      className={`flex items-center justify-between px-4 py-3 ${
        transparent ? "bg-transparent" : "bg-white border-b border-border"
      }`}
    >
      <div className="w-10">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>
      {title && <h4 className="flex-1 text-center">{title}</h4>}
      <div className="w-10 flex justify-end">{right}</div>
    </header>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

// ─── BOTTOM SHEET (simplified) ─────────────────────────
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-auto animate-in slide-in-from-bottom">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-5 border-b border-border">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            {title && <h3>{title}</h3>}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── LOGO ──────────────────────────────────────────────
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const heights = { sm: "h-8", md: "h-10", lg: "h-16", xl: "h-32" };
  return (
    <img
      src={logoHorizontalImg}
      alt="MonCadeauLocal"
      className={`${heights[size]} w-auto object-contain`}
    />
  );
}

// ─── STAT CARD (Seller) ───────────────────────────────
export function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className="text-xs text-green">{trend}</span>
        )}
      </div>
      <p className="text-2xl mb-0.5">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
