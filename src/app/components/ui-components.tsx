import React from "react";
import { Star, MapPin, Clock, Check, Truck, ShoppingBag } from "lucide-react";

// Badge component
export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "green" | "coral" | "outline" | "muted";
  className?: string;
}) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    green: "bg-green-light text-green",
    coral: "bg-coral-light text-coral",
    outline: "border border-border text-foreground bg-white",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.75rem] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Chip / Filter chip
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
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[0.875rem] transition-all whitespace-nowrap cursor-pointer ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-white text-foreground border border-border hover:bg-secondary"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// Star rating
export function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-coral text-coral" />
      <span className="text-[0.8125rem] text-foreground">{rating}</span>
      {count !== undefined && (
        <span className="text-[0.8125rem] text-muted-foreground">({count})</span>
      )}
    </div>
  );
}

// Product card
export function ProductCard({
  image,
  name,
  price,
  shopName,
  availableToday,
  onClick,
}: {
  image: string;
  name: string;
  price: number;
  shopName: string;
  availableToday: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-border/50 hover:shadow-md transition-shadow cursor-pointer text-left w-full"
    >
      <div className="relative aspect-square overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover" />
        {availableToday && (
          <div className="absolute top-2 left-2">
            <Badge variant="green">
              <Check className="w-3 h-3" />
              Dispo aujourd'hui
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <p className="text-[0.8125rem] text-muted-foreground truncate">{shopName}</p>
        <p className="text-[0.9375rem] text-foreground truncate">{name}</p>
        <p className="text-[1rem] text-primary">{price.toFixed(2)} €</p>
      </div>
    </button>
  );
}

// Shop card (for list view)
export function ShopCard({
  image,
  name,
  category,
  rating,
  reviewCount,
  distance,
  isOpen,
  pickupToday,
  address,
  onClick,
}: {
  image: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: string;
  isOpen: boolean;
  pickupToday: boolean;
  address: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex gap-3 p-3 bg-white rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left w-full"
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[0.9375rem] text-foreground truncate">{name}</span>
          <Badge variant="muted">{category}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <StarRating rating={rating} count={reviewCount} />
          <span className="text-[0.8125rem] text-muted-foreground">· {distance}</span>
        </div>
        <div className="flex items-center gap-1 text-[0.8125rem] text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{address}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isOpen ? (
            <Badge variant="green">Ouvert</Badge>
          ) : (
            <Badge variant="muted">Fermé</Badge>
          )}
          {pickupToday && (
            <Badge variant="coral">
              <Clock className="w-3 h-3" />
              Retrait aujourd'hui
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// Button
export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  onClick,
  disabled = false,
  icon,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-white text-foreground hover:bg-secondary",
    ghost: "text-foreground hover:bg-secondary",
    accent: "bg-accent text-accent-foreground hover:opacity-90 shadow-sm",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-[0.8125rem]",
    md: "px-5 py-2.5 text-[0.9375rem]",
    lg: "px-6 py-3.5 text-[1rem]",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        variants[variant]
      } ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

// Input
export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  icon,
  className = "",
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  type?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-[0.875rem] text-foreground">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full bg-input-background rounded-xl border border-border/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition ${
            icon ? "pl-10" : ""
          }`}
        />
      </div>
    </div>
  );
}

// Delivery option selector
export function DeliveryOption({
  type,
  selected,
  onClick,
  available,
}: {
  type: "pickup" | "delivery";
  selected: boolean;
  onClick: () => void;
  available: boolean;
}) {
  const config = {
    pickup: {
      icon: <ShoppingBag className="w-5 h-5" />,
      title: "Retrait en boutique",
      subtitle: "Gratuit · Aujourd'hui",
    },
    delivery: {
      icon: <Truck className="w-5 h-5" />,
      title: "Livraison",
      subtitle: "Frais selon vendeur",
    },
  };
  const { icon, title, subtitle } = config[type];

  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer w-full text-left ${
        selected
          ? "border-primary bg-coral-light"
          : available
          ? "border-border bg-white hover:border-primary/30"
          : "border-border/50 bg-muted/50 opacity-50 cursor-not-allowed"
      }`}
    >
      <div
        className={`${selected ? "text-primary" : "text-muted-foreground"}`}
      >
        {icon}
      </div>
      <div>
        <p className={`text-[0.9375rem] ${selected ? "text-primary" : "text-foreground"}`}>
          {title}
        </p>
        <p className="text-[0.8125rem] text-muted-foreground">{subtitle}</p>
      </div>
      {selected && (
        <div className="ml-auto">
          <Check className="w-5 h-5 text-primary" />
        </div>
      )}
    </button>
  );
}

// Bottom Navigation (Mobile)
export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = [
    { id: "home", label: "Explorer", icon: "🗺️" },
    { id: "search", label: "Recherche", icon: "🔍" },
    { id: "cart", label: "Panier", icon: "🛒" },
    { id: "messages", label: "Messages", icon: "💬" },
    { id: "profile", label: "Profil", icon: "👤" },
  ];

  return (
    <div className="flex items-center justify-around bg-white border-t border-border py-2 px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 cursor-pointer transition-colors ${
            activeTab === tab.id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className="text-[1.125rem]">{tab.icon}</span>
          <span className="text-[0.6875rem]">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}