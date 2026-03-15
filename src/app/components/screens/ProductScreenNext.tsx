"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heart,
  Share2,
  MessageCircle,
  ShoppingBag,
  Check,
  MapPin,
  Clock,
  Store,
  Truck,
  ChevronRight,
} from "lucide-react";
import { Button, Badge, Header, Logo } from "../ds";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";
import { fetchProducts, fetchShops } from "../../services/catalog";
import type { Product, Shop } from "../../types/catalog";
import { getShopHref } from "../../utils/shopRouting";

export function ProductScreenNext() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { addItem, items } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoadError(null);
        const [allProducts, allShops] = await Promise.all([fetchProducts(), fetchShops()]);
        const nextProduct = allProducts.find((p) => p.id === id) ?? null;
        const nextShop = nextProduct ? allShops.find((s) => s.id === nextProduct.shopId) ?? null : null;
        if (cancelled) return;
        setProduct(nextProduct);
        setShop(nextShop);
      } catch (error) {
        if (cancelled) return;
        setProduct(null);
        setShop(null);
        setLoadError(error instanceof Error ? error.message : "Impossible de charger le produit.");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Produit introuvable.</p>
      </div>
    );
  }

  const effectiveColor = product.color?.trim() || product.colors?.find((entry) => entry.trim()) || "";
  const isInCart = items.some((i) => i.product.id === product.id && (i.color ?? "") === effectiveColor);

  const handleAddToCart = (goToCart = false) => {
    if (!isInCart) {
      addItem(product, product.pickup ? "pickup" : "delivery", effectiveColor || undefined);
    }
    if (goToCart) {
      push("/cart");
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* Desktop layout */}
      <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white border-b border-border">
        <Logo size="lg" href="/home" />
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => push("/home")}>
            Explorer
          </Button>
          <button
            onClick={() => push("/cart")}
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Panier"
          >
            <ShoppingBag className="w-5 h-5" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>
          <button
            onClick={() => push("/messages")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLiked(!liked)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${liked ? "bg-coral-light" : "bg-muted hover:bg-muted/80"}`}
            aria-label="Favori"
          >
            <Heart className={`w-4 h-4 ${liked ? "text-coral fill-coral" : ""}`} />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Partager"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <Button
            size="sm"
            onClick={() => {
              if (!isAuthenticated) {
                push("/auth");
                return;
              }
              if (user?.role === "seller") {
            push(user.siretVerified ? "/dashboard" : "/siret");
            return;
          }
          push("/profile");
            }}
          >
            {isAuthenticated ? "Mon profil" : "Connexion"}
          </Button>
        </div>
      </header>

      {/* Mobile hero */}
      <div className="lg:hidden relative">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-80 object-cover"
        />
        <div className="absolute top-0 left-0 right-0">
          <Header
            transparent
            onBack={() => router.back()}
            right={
              <div className="flex gap-2">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full backdrop-blur ${liked ? "bg-coral-light" : "bg-white/80"}`}
                >
                  <Heart className={`w-4 h-4 ${liked ? "text-coral fill-coral" : ""}`} />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            }
          />
        </div>
        {product.availableToday && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="success">
              <Check className="w-3 h-3" /> Dispo aujourd'hui
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 lg:max-w-5xl lg:mx-auto lg:w-full lg:flex lg:gap-8 lg:py-6 lg:px-8">
        {/* Desktop image */}
        <div className="hidden lg:block lg:flex-1">
          <div className="rounded-2xl overflow-hidden border border-border/50 relative">
            <img
              src={product.image}
              alt={product.title}
              className="w-full aspect-square object-cover"
            />
            {product.availableToday && (
              <div className="absolute top-4 left-4">
                <Badge variant="success">
                  <Check className="w-3 h-3" /> Disponible aujourd'hui
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 lg:max-w-md">
          {/* Title + Price */}
          <div className="px-4 lg:px-0 pt-4 lg:pt-0">
            <button
              onClick={() =>
                push(
                  getShopHref({
                    id: product.shopId,
                    name: product.shopName,
                  })
                )
              }
              className="text-sm text-coral flex items-center gap-1 mb-1"
            >
              <Store className="w-3.5 h-3.5" />
              {product.shopName}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <h1 className="mb-2">{product.title}</h1>
            <p className="text-3xl text-coral mb-3">
              {product.price.toFixed(2)} €
            </p>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {product.availableToday && (
                <Badge variant="success">
                  <Check className="w-3 h-3" /> Dispo aujourd'hui
                </Badge>
              )}
              {product.pickup && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3" /> Retrait en boutique
                </Badge>
              )}
              {product.delivery && (
                <Badge variant="outline">
                  <Truck className="w-3 h-3" /> Livraison
                </Badge>
              )}
              <Badge variant="default">
                Stock : {product.stock}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <div className="px-4 lg:px-0 mb-4">
            <h4 className="mb-2">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          {product.features?.trim() && (
            <div className="px-4 lg:px-0 mb-4">
              <h4 className="mb-2">Caractéristiques</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.features}
              </p>
            </div>
          )}

          {product.color?.trim() && (
            <div className="px-4 lg:px-0 mb-4">
              <h4 className="mb-2">Couleur</h4>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-6 w-6 rounded-full border border-border"
                  style={{ backgroundColor: product.color }}
                />
                <p className="text-sm text-muted-foreground">{product.color}</p>
              </div>
            </div>
          )}

          {product.composition?.trim() && (
            <div className="px-4 lg:px-0 mb-4">
              <h4 className="mb-2">Composition</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.composition}
              </p>
            </div>
          )}

          {product.returnConditions?.trim() && (
            <div className="px-4 lg:px-0 mb-4">
              <h4 className="mb-2">Conditions de retour</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.returnConditions}
              </p>
            </div>
          )}

          {/* Shop info card */}
          {shop && (
            <div
              onClick={() => push(getShopHref(shop))}
              className="mx-4 lg:mx-0 bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm">{shop.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{shop.distance}</span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{shop.hours}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="px-4 lg:px-0 pb-6">
            <div className="flex gap-3">
              <Button
                fullWidth
                size="lg"
                icon={<ShoppingBag className="w-5 h-5" />}
                onClick={() => handleAddToCart(true)}
              >
                {isInCart ? "Voir le panier" : `Acheter · ${product.price.toFixed(2)} €`}
              </Button>
            </div>
            {!isInCart && (
              <Button
                fullWidth
                variant="outline"
                size="lg"
                icon={added ? <Check className="w-5 h-5 text-green" /> : <ShoppingBag className="w-5 h-5" />}
                className="mt-3"
                onClick={() => handleAddToCart(false)}
              >
                {added ? "Ajouté au panier !" : "Ajouter au panier"}
              </Button>
            )}
            <Button
              fullWidth
              variant="outline"
              size="lg"
              icon={<MessageCircle className="w-5 h-5" />}
              className="mt-3"
              onClick={() => {
                trackLeadEvent({
                  type: "click_message",
                  shopId: product.shopId,
                  productId: product.id,
                  metadata: { source: "product_screen" },
                });
                push(`/messages?shop=${product.shopId}`);
              }}
            >
              Envoyer un message
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile bottom sticky CTA */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 bg-white border-t border-border px-4 py-3 flex gap-3 z-10">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Prix</p>
          <p className="text-xl text-coral">{product.price.toFixed(2)} €</p>
        </div>
        <Button
          size="lg"
          icon={added ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
          onClick={() => handleAddToCart(false)}
        >
          {added ? "Ajouté !" : isInCart ? "Dans le panier" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
