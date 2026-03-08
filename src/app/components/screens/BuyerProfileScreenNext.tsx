"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Heart, Package, Star, Phone, LogOut, Save, Store, ChevronRight } from "lucide-react";
import { Button, Header, Input, Badge } from "../ds";
import { useAuth } from "../AuthContext";
import { AddressAutocompleteInput } from "../AddressAutocompleteInput";
import {
  fetchFavoriteProducts,
  fetchFollowedShops,
  type FavoriteProductItem,
  type FollowedShopItem,
} from "../../services/buyerCollections";

const BUYER_PROFILE_STORAGE_KEY = "mcl_buyer_profile_v1";

interface BuyerProfileLocalData {
  address: string;
  phone: string;
  avatarDataUrl: string | null;
}

const DEFAULT_PROFILE_DATA: BuyerProfileLocalData = {
  address: "",
  phone: "",
  avatarDataUrl: null,
};

export function BuyerProfileScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, isAuthenticated, isLoading, accessToken, updateProfile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProductItem[]>([]);
  const [followedShops, setFollowedShops] = useState<FollowedShopItem[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      push("/auth");
      return;
    }
    if (user?.role === "seller") {
      push("/dashboard");
    }
  }, [isLoading, isAuthenticated, user?.role, push]);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");

    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(getStorageKey(user.id));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as BuyerProfileLocalData;
      setAddress(parsed.address ?? "");
      setPhone(parsed.phone ?? "");
      setAvatarDataUrl(parsed.avatarDataUrl ?? null);
    } catch {
      window.localStorage.removeItem(getStorageKey(user.id));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id || !accessToken) {
      setFavoriteProducts([]);
      setFollowedShops([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCollections(true);

    const run = async () => {
      try {
        const [favorites, shops] = await Promise.all([
          fetchFavoriteProducts({ userId: user.id, accessToken }),
          fetchFollowedShops({ userId: user.id, accessToken }),
        ]);
        if (cancelled) return;
        setFavoriteProducts(favorites);
        setFollowedShops(shops);
      } catch {
        if (cancelled) return;
        setFavoriteProducts([]);
        setFollowedShops([]);
      } finally {
        if (!cancelled) setIsLoadingCollections(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, accessToken]);

  if (!isAuthenticated || !user || user.role === "seller") {
    return null;
  }

  const avatarFallback = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || "P";

  const orders = [
    { id: "CMD-1042", label: "Coffret macarons", status: "Retrait aujourd'hui" },
    { id: "CMD-1031", label: "Bougie artisanale", status: "Livree" },
  ];

  const reviews = [
    { shop: "Maison Dupont", rating: 5, text: "Excellent accueil et produit top." },
    { shop: "Atelier Luna", rating: 4, text: "Tres belle qualite, retrait rapide." },
  ];

  const handleAvatarUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const run = async () => {
      const nextFirst = firstName.trim();
      const nextLast = lastName.trim();

      if (!nextFirst || !nextLast) {
        setMessage("Erreur: prénom et nom sont requis.");
        return;
      }

      setIsSaving(true);
      setMessage(null);
      try {
        await updateProfile({ firstName: nextFirst, lastName: nextLast });
        if (typeof window !== "undefined") {
          const localData: BuyerProfileLocalData = {
            address: address.trim(),
            phone: phone.trim(),
            avatarDataUrl,
          };
          window.localStorage.setItem(getStorageKey(user.id), JSON.stringify(localData));
        }
        setMessage("Profil mis a jour.");
      } catch (error) {
        const text = error instanceof Error ? error.message : "Impossible de sauvegarder.";
        setMessage(`Erreur: ${text}`);
      } finally {
        setIsSaving(false);
      }
    };

    void run();
  };

  const handleLogout = () => {
    const run = async () => {
      await logout();
      push("/auth");
    };
    void run();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Mon profil" onBack={() => push("/home")} />

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-4">
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4">
          <div className="flex items-center gap-4 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-coral-light flex items-center justify-center text-coral"
            >
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="Avatar profil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{avatarFallback}</span>
              )}
              <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </button>
            <div>
              <h3 className="mb-1">{firstName} {lastName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input placeholder="Prenom" value={firstName} onChange={setFirstName} />
            <Input placeholder="Nom" value={lastName} onChange={setLastName} />
            <AddressAutocompleteInput
              placeholder="Adresse"
              value={address}
              onChange={setAddress}
            />
            <Input placeholder="Portable" value={phone} onChange={setPhone} icon={<Phone className="w-4 h-4" />} />
            {message && (
              <p className={`text-sm ${message.startsWith("Erreur") ? "text-destructive" : "text-green"}`}>
                {message}
              </p>
            )}
            <Button fullWidth onClick={handleSave} disabled={isSaving} icon={<Save className="w-4 h-4" />}>
              {isSaving ? "Enregistrement..." : "Enregistrer mes infos"}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4">
          <h4 className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-coral" />
            Mes favoris
          </h4>
          <div className="space-y-2">
            {isLoadingCollections && (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            )}
            {!isLoadingCollections && favoriteProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun produit favori pour le moment.</p>
            )}
            {favoriteProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => push(`/product/${product.id}`)}
                className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="truncate">{product.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {product.shopName} · {product.price.toFixed(2)} €
                  </p>
                </div>
                <Badge variant="coral">{product.category}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4">
          <h4 className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-green" />
            Boutiques suivies
          </h4>
          <div className="space-y-2">
            {isLoadingCollections && (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            )}
            {!isLoadingCollections && followedShops.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune boutique suivie pour le moment.</p>
            )}
            {followedShops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => push(`/shop/${shop.id}`)}
                className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="truncate">{shop.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{shop.category}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4">
          <h4 className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-bleu" />
            Mes commandes
          </h4>
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl bg-muted/40 px-3 py-2">
                <p>{order.label}</p>
                <p className="text-xs text-muted-foreground">{order.id} · {order.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4">
          <h4 className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500" />
            Mes evaluations
          </h4>
          <div className="space-y-2">
            {reviews.map((review) => (
              <div key={review.shop} className="rounded-xl bg-muted/40 px-3 py-2">
                <p>{review.shop} · {review.rating}/5</p>
                <p className="text-xs text-muted-foreground">{review.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Button fullWidth variant="outline" onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
          Se deconnecter
        </Button>
      </div>
    </div>
  );
}
  const getStorageKey = (userId: string) => `${BUYER_PROFILE_STORAGE_KEY}:${userId}`;
