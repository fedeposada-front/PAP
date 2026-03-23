"use client";

import { usePathname, useRouter } from "next/navigation";
import { Newspaper, MapPin, MessageCircle, ShoppingBag, User } from "lucide-react";
import { useAuth } from "./AuthContext";

const HIDDEN_ROUTES = new Set([
  "/",
  "/onboarding",
  "/auth",
  "/reset-password",
  "/about",
  "/how-it-works",
  "/legal",
  "/privacy",
]);

export function AppBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  if (!pathname || HIDDEN_ROUTES.has(pathname)) {
    return null;
  }

  const active =
    pathname === "/news" || pathname.includes("/news/")
      ? "news"
      : pathname === "/cart" || pathname === "/checkout"
        ? "cart"
        : pathname === "/messages"
          ? "messages"
          : pathname === "/profile" ||
              pathname === "/dashboard" ||
              pathname === "/settings" ||
              pathname === "/add-product" ||
              pathname === "/siret"
            ? "profile"
            : "home";

  const pushProfile = () => {
    if (!isAuthenticated) {
      router.push("/auth?next=/profile");
      return;
    }
    if (user?.role === "seller") {
      router.push(user.siretVerified ? "/dashboard" : "/siret");
      return;
    }
    router.push("/profile");
  };

  const tabs = [
    { id: "home", label: "Explorer", icon: MapPin, onClick: () => router.push("/home") },
    { id: "news", label: "Feed", icon: Newspaper, onClick: () => router.push("/news") },
    { id: "cart", label: "Panier", icon: ShoppingBag, onClick: () => router.push("/cart") },
    { id: "messages", label: "Messages", icon: MessageCircle, onClick: () => router.push("/messages") },
    { id: "profile", label: "Profil", icon: User, onClick: pushProfile },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white border-t border-border px-2 py-1.5 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={tab.onClick}
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
