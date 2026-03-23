"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { Badge, Button, Header, Logo } from "../ds";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";
import { fetchProductById, fetchShopById } from "../../services/catalog";
import { fetchSellerProducts } from "../../services/sellerProducts";
import { fetchShopSettings } from "../../services/shopSettings";
import type { Product, Shop } from "../../types/catalog";
import { getProductHref, getShopHref } from "../../utils/shopRouting";

type ProductTab = "description" | "features" | "composition" | "returns";

export function ProductScreenNext() {
  const params = useParams<{ id?: string; productId?: string; shopSlug?: string }>();
  const pathname = usePathname();
  const id = params.productId ?? params.id ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { addItem, totalItems } = useCart();
  const { user, accessToken } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<ProductTab>("description");
  const [added, setAdded] = useState(false);
  const [cartNotice, setCartNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [cartPulse, setCartPulse] = useState(false);
  const [liked, setLiked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isPreviewMode = searchParams.get("preview") === "1";
  const addedTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const nextProduct = await (
          isPreviewMode && user?.id && accessToken
            ? fetchSellerProducts({ userId: user.id, accessToken }).then((products) => products.find((p) => p.id === id) ?? null)
            : fetchProductById(id)
        );
        let nextShop: Shop | null = null;
        if (nextProduct) {
          if (isPreviewMode && user?.id && accessToken) {
            const privateShop = await fetchShopSettings(user.id, accessToken);
            if (privateShop && privateShop.id === nextProduct.shopId) {
              nextShop = {
                id: privateShop.id,
                slug: privateShop.slug ?? undefined,
                name: privateShop.name,
                category: privateShop.category,
                image: privateShop.logo_image_url ?? "https://placehold.co/640x640?text=MonCadeauLocal",
                bannerImage: privateShop.banner_image_url ?? privateShop.logo_image_url ?? "https://placehold.co/640x640?text=MonCadeauLocal",
                rating: 0,
                reviewCount: 0,
                distance: privateShop.city || "-",
                address: privateShop.address,
                city: privateShop.city,
                isOpen: false,
                pickupToday: privateShop.pickup_today,
                openSunday: false,
                delivery: privateShop.delivery,
                hours: privateShop.hours ?? "Horaires non renseignés",
                phone: privateShop.phone ?? "",
                description: privateShop.description ?? "",
                story: privateShop.story ?? "",
                teamMembers: privateShop.teamMembers ?? [],
                lat: privateShop.lat ?? Number.NaN,
                lng: privateShop.lng ?? Number.NaN,
              };
            }
          } else {
            nextShop = await fetchShopById(nextProduct.shopId);
          }
        }
        if (cancelled) return;
        setProduct(nextProduct);
        setShop(nextShop);
        setActiveImageIndex(0);
      } catch (error) {
        if (cancelled) return;
        setProduct(null);
        setShop(null);
        setLoadError(error instanceof Error ? error.message : "Impossible de charger le produit.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [id, isPreviewMode, user?.id, accessToken]);

  const productImages = useMemo(() => {
    if (!product) return [];
    const uniqueImages = (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [product.image]).filter(
      (value, index, allValues) => Boolean(value) && allValues.indexOf(value) === index
    );
    return uniqueImages.length > 0 ? uniqueImages : [product.image];
  }, [product]);

  useEffect(() => {
    setActiveImageIndex((prev) => Math.min(prev, Math.max(0, productImages.length - 1)));
  }, [productImages]);

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) window.clearTimeout(addedTimerRef.current);
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPreviewMode || !product) return;

    const canonicalPath = getProductHref({
      id: product.id,
      shopSlug: shop?.slug ?? product.shopSlug,
      shopName: shop?.name ?? product.shopName,
    });

    if (pathname !== canonicalPath) {
      router.replace(canonicalPath);
    }
  }, [isPreviewMode, pathname, product, router, shop?.name, shop?.slug]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Chargement du produit...</p>
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
  const productStock = Number.isFinite(product.stock) ? Math.max(0, product.stock) : 0;
  const maxSelectableQuantity = Math.max(1, productStock);
  const isOutOfStock = productStock <= 0;
  const infoTabs = [
    { id: "features" as const, label: "CARACTÉRISTIQUES", content: product.features?.trim() || "" },
    { id: "composition" as const, label: "COMPOSITION", content: product.composition?.trim() || "" },
  ].filter((tab) => tab.content);
  const currentTab = infoTabs.find((tab) => tab.id === activeTab) ?? infoTabs[0] ?? null;

  const showCartNotice = (type: "success" | "error", message: string) => {
    setCartNotice({ type, message });
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setCartNotice(null), 2600);
  };

  const triggerAddedState = () => {
    setAdded(true);
    setCartPulse(true);

    if (addedTimerRef.current) window.clearTimeout(addedTimerRef.current);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);

    addedTimerRef.current = window.setTimeout(() => setAdded(false), 1800);
    pulseTimerRef.current = window.setTimeout(() => setCartPulse(false), 900);
  };

  const handleAddToCart = (goToCart = false) => {
    const result = addItem(
      product,
      product.pickup ? "pickup" : "delivery",
      effectiveColor || undefined,
      quantity
    );

    if (!result.ok) {
      showCartNotice(
        "error",
        result.reason === "out_of_stock"
          ? "Ce produit n'est plus disponible."
          : `Stock maximum atteint${result.maxQty > 0 ? ` (${result.maxQty})` : ""}.`
      );
      return;
    }

    const addedLabel = result.delta > 1 ? `${result.delta} produits ajoutés au panier.` : "Produit ajouté au panier.";
    const partialLabel =
      result.reason === "stock_limit" && result.delta < quantity
        ? `${result.delta} produit${result.delta > 1 ? "s" : ""} ajouté${result.delta > 1 ? "s" : ""}. Stock maximum atteint.`
        : addedLabel;

    showCartNotice("success", partialLabel);
    triggerAddedState();

    if (result.qty >= result.maxQty && result.maxQty > 0) {
      setQuantity(Math.min(quantity, maxSelectableQuantity));
    }

    if (goToCart) {
      push("/cart");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#dfe8ef] pb-16 text-slate-900">
      {isPreviewMode && product && !product.isPublished && (
        <div className="px-4 pt-4 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Aperçu privé de votre produit avant publication.
          </div>
        </div>
      )}

      <header className="hidden lg:flex items-center justify-between border-b border-white/30 bg-transparent px-8 py-3">
        <Logo size="lg" href="/home" />
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => push("/home")}>
            Explorer
          </Button>
          <button
            onClick={() => push("/cart")}
            className={`relative w-10 h-10 flex items-center justify-center rounded-full bg-muted transition-all hover:bg-muted/80 ${
              cartPulse ? "scale-110 ring-4 ring-coral/15" : ""
            }`}
            aria-label="Panier"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-coral text-white text-[10px] rounded-full flex items-center justify-center ${cartPulse ? "animate-pulse" : ""}`}>
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              if (!user?.id || !accessToken) {
                push(`/auth?next=${encodeURIComponent("/messages")}`);
                return;
              }
              push("/messages");
            }}
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
        </div>
      </header>

      <div className="lg:hidden">
        <Header
          title=""
          onBack={() => router.back()}
          right={
            <div className="flex gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${liked ? "bg-coral-light" : "bg-white border border-border"}`}
              >
                <Heart className={`w-4 h-4 ${liked ? "text-coral fill-coral" : ""}`} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-border">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          }
        />
      </div>

      <div className="flex-1 lg:mx-auto lg:w-full lg:max-w-7xl lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:gap-x-14 lg:gap-y-10 lg:px-8 lg:py-10">
        <section className="px-4 lg:px-0">
          <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
            <img
              src={productImages[activeImageIndex] ?? product.image}
              alt={product.title}
              className="w-full aspect-[4/4.45] object-cover lg:aspect-[0.97/1]"
            />
            {product.availableToday && (
              <div className="absolute left-6 top-6">
                <Badge variant="success" className="rounded-full bg-[#eef8e9] px-5 py-2 text-[0.95rem] text-[#3a8b46] shadow-sm">
                  <Check className="w-4 h-4" /> Disponible aujourd'hui
                </Badge>
              </div>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {productImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`overflow-hidden rounded-2xl border ${index === activeImageIndex ? "border-[#111827] shadow-[0_6px_18px_rgba(15,23,42,0.12)]" : "border-white/70 opacity-80"} flex-shrink-0 bg-white transition-all`}
                >
                  <img src={image} alt={`${product.title} ${index + 1}`} className="h-20 w-20 object-cover sm:h-24 sm:w-24" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="px-4 pt-6 lg:px-0 lg:pt-0">
          <button
            onClick={() =>
              push(
                getShopHref({
                  id: product.shopId,
                  name: product.shopName,
                })
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-[0.92rem] font-medium text-[#f07d86]"
          >
            <Store className="w-4 h-4" />
            {shop?.name ?? product.shopName}
            <ChevronRight className="w-4 h-4" />
          </button>
          <h1 className="max-w-[12ch] text-[2rem] leading-tight tracking-[-0.03em] text-slate-950 lg:text-2xl">
            {product.title}
          </h1>
          <p className="mt-5 text-[1.85rem] tracking-[-0.02em] text-[#f07d86] lg:text-[2rem]">{product.price.toFixed(2)} €</p>

          {cartNotice && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                cartNotice.type === "success"
                  ? "border-green-200 bg-green-50 text-[#2e7d32]"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {cartNotice.message}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[1rem] text-slate-600">
            {product.availableToday && (
              <span className="inline-flex items-center gap-2 text-[#3a8b46]">
                <Check className="w-3 h-3" /> Dispo aujourd'hui
              </span>
            )}
            {product.pickup && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Retrait en boutique
              </span>
            )}
            {product.delivery && (
              <span className="inline-flex items-center gap-2">
                <Truck className="w-3 h-3" /> Livraison
              </span>
            )}
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-[1.05rem] font-semibold text-slate-950">Description</h3>
            <p className="text-[1rem] leading-8 text-slate-500 lg:text-[1.05rem]">
              {product.description}
            </p>
          </div>

          {product.returnConditions?.trim() && (
            <div className="mt-8">
              <h3 className="mb-3 text-[1.05rem] font-semibold text-slate-950">Retour</h3>
              <p className="text-[1rem] leading-8 text-slate-500 whitespace-pre-line lg:text-[1.05rem]">
                {product.returnConditions}
              </p>
            </div>
          )}

          {shop && (
            <div
              onClick={() => push(getShopHref(shop))}
              className="mt-10 cursor-pointer rounded-[1.9rem] border border-white/70 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_16px_30px_rgba(15,23,42,0.10)]"
            >
              <div className="flex items-center gap-3">
                <img src={shop.image} alt={shop.name} className="h-14 w-14 rounded-2xl object-cover" />
                <div className="flex-1">
                  <p className="text-[0.95rem] text-slate-900">{shop.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
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

          <div className="mt-8 space-y-5 pb-8">
            <Button
              fullWidth
              variant="outline"
              size="lg"
              disabled={isOutOfStock}
              icon={added ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
              className={`h-16 rounded-[1.7rem] border-white/70 text-[1.1rem] shadow-[0_10px_24px_rgba(15,23,42,0.06)] ${
                added
                  ? "bg-[#eef8e9] text-[#2e7d32]"
                  : "bg-white"
              }`}
              onClick={() => handleAddToCart(false)}
            >
              {isOutOfStock ? "Rupture de stock" : added ? "Ajouté au panier" : "Ajouter au panier"}
            </Button>
            <Button
              fullWidth
              variant="outline"
              size="lg"
              icon={<MessageCircle className="w-5 h-5" />}
              className="h-16 rounded-[1.7rem] border-white/70 bg-white text-[1.1rem] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              onClick={() => {
                trackLeadEvent({
                  type: "click_message",
                  actorUserId: user?.id,
                  shopId: product.shopId,
                  productId: product.id,
                  metadata: { source: "product_screen" },
                });
                if (!user?.id || !accessToken) {
                  push(`/auth?next=${encodeURIComponent(`/messages?shop=${product.shopId}`)}`);
                  return;
                }
                push(`/messages?shop=${product.shopId}`);
              }}
            >
              Envoyer un message
            </Button>
          </div>
        </section>

        {currentTab && (
          <section className="px-4 pb-10 lg:col-span-2 lg:px-0">
            <div className="border-t border-black/8 pt-8">
              <div className="flex gap-8 border-b border-black/8 pb-3 text-[0.95rem] tracking-[0.06em] text-slate-500">
                {infoTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative whitespace-nowrap pb-2 ${currentTab.id === tab.id ? "text-slate-950" : ""}`}
                  >
                    {tab.label}
                    {currentTab.id === tab.id && (
                      <span className="absolute bottom-[-13px] left-0 h-px w-full bg-slate-950" />
                    )}
                  </button>
                ))}
              </div>
              <div className="pt-6 text-[1rem] leading-8 text-slate-600 whitespace-pre-line">
                {currentTab.content}
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-10 border-t border-black/6 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 items-center rounded-full border border-black/10 bg-white px-2">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className="flex h-8 w-8 items-center justify-center"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="min-w-8 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.min(maxSelectableQuantity, prev + 1))}
              disabled={isOutOfStock || quantity >= productStock}
              className={`flex h-8 w-8 items-center justify-center ${
                isOutOfStock || quantity >= productStock ? "text-slate-300" : ""
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button
            fullWidth
            size="lg"
            disabled={isOutOfStock}
            icon={added ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            className={`rounded-full ${
              added ? "bg-[#2e7d32] hover:bg-[#276c2c]" : "bg-[#ee7f88] hover:bg-[#ea6f7a]"
            }`}
            onClick={() => handleAddToCart(false)}
          >
            {isOutOfStock ? "Rupture de stock" : added ? "Ajouté !" : "Ajouter au panier"}
          </Button>
        </div>
      </div>
    </div>
  );
}
