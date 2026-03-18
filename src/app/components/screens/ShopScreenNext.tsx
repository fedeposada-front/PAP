"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Navigation,
  MessageCircle,
  Heart,
  Share2,
  UserPlus,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Badge, ProductCard, Header } from "../ds";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";
import { fetchProductsByShopId, fetchShopById, fetchShops } from "../../services/catalog";
import type { Product, Shop } from "../../types/catalog";
import { toShopSlug } from "../../utils/shopRouting";
import { getCategoryLabel } from "../../data/catalog";
import { fetchPublicShopNews, type ShopNewsItem } from "../../services/shopNews";
import { fetchShopSettings } from "../../services/shopSettings";
import { fetchSellerProducts } from "../../services/sellerProducts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import {
  fetchIsFollowingShop,
  fetchShopFollowersCount,
  followShop,
  unfollowShop,
} from "../../services/shopFollowers";

export function ShopScreenNext() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const routeParam = decodeURIComponent(params.id ?? "");
  const normalizedRouteParam = routeParam.toLowerCase();
  const isPreviewMode = searchParams.get("preview") === "1";
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const [shop, setShop] = useState<Shop | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const shopProducts = shop ? allProducts.filter((p) => p.shopId === shop.id) : [];
  const shopNewsHref = shop ? `/shop/${encodeURIComponent(shop.slug ?? toShopSlug(shop.name))}/news` : "";
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [newsItems, setNewsItems] = useState<ShopNewsItem[]>([]);
  const { user, accessToken } = useAuth();

  const mapPreviewShop = (shopSettings: Awaited<ReturnType<typeof fetchShopSettings>>): Shop | null => {
    if (!shopSettings) return null;
    return {
      id: shopSettings.id,
      slug: toShopSlug(shopSettings.name),
      name: shopSettings.name,
      category: shopSettings.category,
      image: shopSettings.logo_image_url || "https://placehold.co/640x640?text=MonCadeauLocal",
      bannerImage: shopSettings.banner_image_url || shopSettings.logo_image_url || "https://placehold.co/1280x640?text=MonCadeauLocal",
      rating: 0,
      reviewCount: 0,
      distance: shopSettings.city || "-",
      address: shopSettings.address,
      city: shopSettings.city,
      isOpen: false,
      pickupToday: Boolean(shopSettings.pickup_today),
      openSunday: false,
      delivery: Boolean(shopSettings.delivery),
      hours: shopSettings.hours || "Horaires non renseignés",
      openingHours: shopSettings.opening_hours as Shop["openingHours"],
      phone: shopSettings.phone ?? "",
      description: shopSettings.description ?? "",
      story: shopSettings.story ?? "",
      teamMembers: shopSettings.teamMembers,
      lat: shopSettings.lat ?? Number.NaN,
      lng: shopSettings.lng ?? Number.NaN,
    };
  };

  const isLikelyShopId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        let nextShop: Shop | null = null;
        let nextProducts: Product[] = [];

        if (isPreviewMode) {
          if (!user?.id || !accessToken) {
            throw new Error("Connectez-vous pour voir l'aperçu privé de votre boutique.");
          }
          const [shopSettings, sellerProducts] = await Promise.all([
            fetchShopSettings(user.id, accessToken),
            fetchSellerProducts({ userId: user.id, accessToken }),
          ]);
          nextShop = mapPreviewShop(shopSettings);
          nextProducts = sellerProducts.filter((product) => product.isPublished !== false);
        } else {
          if (isLikelyShopId(routeParam)) {
            nextShop = await fetchShopById(routeParam);
          } else {
            const nextShops = await fetchShops();
            nextShop =
              nextShops.find(
                (s) =>
                  s.id === routeParam ||
                  s.slug === normalizedRouteParam ||
                  toShopSlug(s.name) === normalizedRouteParam
              ) ?? null;
          }

          nextProducts = nextShop ? await fetchProductsByShopId(nextShop.id) : [];
        }

        if (cancelled) return;
        setShop(nextShop);
        setAllProducts(nextProducts);
      } catch (error) {
        if (cancelled) return;
        setShop(null);
        setAllProducts([]);
        setLoadError(error instanceof Error ? error.message : "Impossible de charger la boutique.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [routeParam, normalizedRouteParam, isPreviewMode, user?.id, accessToken]);

  useEffect(() => {
    if (isPreviewMode) return;
    if (!shop) return;
    trackLeadEvent({
      type: "view_shop",
      shopId: shop.id,
      metadata: { source: "shop_screen" },
    });
  }, [shop?.id, isPreviewMode]);

  useEffect(() => {
    if (isPreviewMode) {
      setIsFollowing(false);
      setFollowersCount(0);
      setNewsItems([]);
      return;
    }
    if (!shop?.id) {
      setIsFollowing(false);
      setFollowersCount(0);
      setNewsItems([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const [countResult, newsResult] = await Promise.allSettled([
        fetchShopFollowersCount(shop.id, accessToken),
        fetchPublicShopNews(shop.id),
      ]);
      if (cancelled) return;

      setFollowersCount(countResult.status === "fulfilled" ? countResult.value : 0);
      setNewsItems(newsResult.status === "fulfilled" ? newsResult.value : []);

      if (user?.id && accessToken) {
        try {
          const following = await fetchIsFollowingShop({
            userId: user.id,
            shopId: shop.id,
            accessToken,
          });
          if (!cancelled) setIsFollowing(following);
        } catch {
          if (!cancelled) setIsFollowing(false);
        }
      } else if (!cancelled) {
        setIsFollowing(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [shop?.id, user?.id, accessToken, isPreviewMode]);

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
        <p className="text-muted-foreground">Chargement de la boutique...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Boutique introuvable.</p>
      </div>
    );
  }

  const handleCallShop = () => {
    trackLeadEvent({
      type: "click_call",
      shopId: shop.id,
      metadata: { source: "shop_screen" },
    });
    window.location.href = `tel:${shop.phone.replace(/[^\d+]/g, "")}`;
  };

  const handleRoute = () => {
    trackLeadEvent({
      type: "click_route",
      shopId: shop.id,
      metadata: { source: "shop_screen" },
    });
    const query = encodeURIComponent(`${shop.address}, ${shop.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleMessage = () => {
    trackLeadEvent({
      type: "click_message",
      shopId: shop.id,
      metadata: { source: "shop_screen" },
    });
    push(`/messages?shop=${shop.id}`);
  };

  const toggleFollow = () => {
    const run = async () => {
      if (!shop?.id || !user?.id || !accessToken) {
        push("/auth");
        return;
      }
      const nextFollow = !isFollowing;
      setIsFollowing(nextFollow);
      setFollowersCount((prev) => Math.max(0, prev + (nextFollow ? 1 : -1)));
      try {
        if (nextFollow) {
          await followShop({ userId: user.id, shopId: shop.id, accessToken });
        } else {
          await unfollowShop({ userId: user.id, shopId: shop.id, accessToken });
        }
      } catch {
        setIsFollowing(!nextFollow);
        setFollowersCount((prev) => Math.max(0, prev + (nextFollow ? -1 : 1)));
      }
    };
    void run();
  };

  // Fill with related products if too few
  const displayProducts = shopProducts;
  const days = [
    { key: "lundi", label: "Lundi" },
    { key: "mardi", label: "Mardi" },
    { key: "mercredi", label: "Mercredi" },
    { key: "jeudi", label: "Jeudi" },
    { key: "vendredi", label: "Vendredi" },
    { key: "samedi", label: "Samedi" },
    { key: "dimanche", label: "Dimanche" },
  ] as const;

  const scheduleRows = days.map((day) => {
    const slot = shop.openingHours?.[day.key];
    const hasValidHours =
      Boolean(slot?.open) &&
      typeof slot?.openTime === "string" &&
      typeof slot?.closeTime === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.openTime) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.closeTime) &&
      slot.openTime < slot.closeTime;

    return {
      label: day.label,
      value: hasValidHours ? `${slot!.openTime}-${slot!.closeTime}` : "Fermé",
    };
  });
  const hasDetailedSchedule = scheduleRows.some((row) => row.value !== "Fermé");

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* Hero */}
      <div className="relative">
        <img
          src={shop.bannerImage ?? shop.image}
          alt={shop.name}
          className="w-full h-56 lg:h-72 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="mb-2 w-16 h-16 rounded-xl overflow-hidden border border-white/40 bg-white/80 backdrop-blur">
            <img src={shop.image} alt={`${shop.name} logo`} className="w-full h-full object-cover" />
          </div>
          <h1>{shop.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-white/80">
            <Star className="w-4 h-4 text-coral fill-coral" />
            <span>{shop.rating}</span>
            <span>({shop.reviewCount} avis)</span>
            <span>·</span>
            <MapPin className="w-3.5 h-3.5" />
            <span>{shop.distance}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={toggleFollow}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                isFollowing
                  ? "bg-white text-foreground"
                  : "bg-coral text-white"
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isFollowing ? "Suivi" : "Suivre"}
            </button>
            <span className="text-sm text-white/90">{followersCount} followers</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 lg:max-w-5xl lg:mx-auto lg:w-full lg:flex lg:gap-8 lg:py-6 lg:px-8">
        <div className="flex-1">
          {isPreviewMode && (
            <div className="mx-4 lg:mx-0 mb-4 rounded-2xl border border-bleu/20 bg-bleu-light px-4 py-3 text-sm text-bleu">
              Aperçu privé de votre boutique avant publication.
            </div>
          )}
          {/* Badges */}
          <div className="flex items-center gap-2 px-4 py-3 lg:px-0 overflow-x-auto">
            {shop.isOpen ? (
              <Badge variant="success">
                <Clock className="w-3 h-3" /> Ouvert
              </Badge>
            ) : (
              <Badge variant="default">Fermé</Badge>
            )}
            {shop.pickupToday && (
              <Badge variant="coral">Retrait aujourd'hui</Badge>
            )}
            {shop.openSunday && <Badge variant="warning">Ouvert dimanche</Badge>}
            {shop.delivery && <Badge variant="outline">Livraison</Badge>}
          </div>

          {/* Info card */}
          <div className="mx-4 lg:mx-0 bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-4">
            <h3 className="mb-2">{shop.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {shop.description?.trim() || "Description non renseignée."}
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Secteur / Service</span>
              <span className="text-sm">{getCategoryLabel(shop.category)}</span>
            </div>
          </div>

          <div className="mx-4 lg:mx-0 bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4>Actualités</h4>
              {newsItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => push(shopNewsHref)}
                  className="inline-flex items-center gap-1 text-sm text-coral hover:text-coral/80 transition-colors"
                >
                  Afficher tout
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {newsItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune actualité publiée.</p>
            ) : (
              <Carousel
                opts={{ align: "start", dragFree: true }}
                className="px-1 md:px-10"
              >
                <CarouselContent className="-ml-3">
                  {newsItems.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="pl-3 basis-[85%] sm:basis-[60%] lg:basis-[42%]"
                    >
                      <article className="rounded-xl border border-border/50 bg-white overflow-hidden h-full">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover" />
                        ) : (
                          <div className="w-full h-40 bg-muted" />
                        )}
                        <div className="p-3">
                          <p className="font-semibold mb-1">{item.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {item.description}
                          </p>
                        </div>
                      </article>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {newsItems.length > 1 && (
                  <>
                    <CarouselPrevious className="hidden md:inline-flex left-0 border-border bg-white/95" />
                    <CarouselNext className="hidden md:inline-flex right-0 border-border bg-white/95" />
                  </>
                )}
              </Carousel>
            )}
          </div>

          <div className="mx-4 lg:mx-0 bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-4">
            <h4 className="mb-2">Histoire de la boutique</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {shop.story?.trim() || `${shop.name} partage sa sélection locale avec ses clients.`}
            </p>
          </div>

          <div className="mx-4 lg:mx-0 bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-4">
            <h4 className="mb-3">Équipe</h4>
            {!shop.teamMembers || shop.teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">L'équipe sera bientôt présentée ici.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shop.teamMembers.map((member) => (
                  <div key={`${member.name}-${member.role}`} className="rounded-xl bg-muted/40 px-3 py-3 flex items-center gap-3">
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        className="w-14 h-14 rounded-xl object-cover border border-border bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-border bg-white flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role || "Équipe boutique"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-3 px-4 lg:px-0 mb-6">
            <Button
              fullWidth
              icon={<MessageCircle className="w-4 h-4" />}
              onClick={handleMessage}
            >
              Contacter
            </Button>
            <Button
              fullWidth
              variant="outline"
              icon={<Navigation className="w-4 h-4" />}
              onClick={handleRoute}
            >
              Itinéraire
            </Button>
          </div>

          {/* Products */}
          <div className="px-4 lg:px-0 pb-24 lg:pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3>Produits ({displayProducts.length})</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onClick={() => push(`/product/${product.id}`)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-sm">
            <h4 className="mb-3">Infos pratiques</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-coral mt-0.5" />
                <div>
                  <p>Adresse</p>
                  <p className="text-muted-foreground">
                    {shop.address}, {shop.city}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-coral mt-0.5" />
                <div className="w-full">
                  <p className="mb-1">Horaires</p>
                  {hasDetailedSchedule ? (
                    <div className="space-y-1">
                      {scheduleRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{shop.hours}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-coral mt-0.5" />
                <div>
                  <p>Téléphone</p>
                  <button onClick={handleCallShop} className="text-coral hover:underline">
                    {shop.phone}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-5">
              <Button
                fullWidth
                icon={<MessageCircle className="w-4 h-4" />}
                onClick={handleMessage}
              >
                Contacter la boutique
              </Button>
              <Button
                fullWidth
                variant="outline"
                icon={<Navigation className="w-4 h-4" />}
                onClick={handleRoute}
              >
                Voir l'itinéraire
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
