"use client";

import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Badge, ProductCard, Header, BottomNav } from "../ds";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";
import { fetchProducts, fetchShops } from "../../services/catalog";
import type { Product, Shop } from "../../types/catalog";
import { toShopSlug } from "../../utils/shopRouting";
import { getCategoryLabel } from "../../data/catalog";
import { fetchPublicShopNews, type ShopNewsItem } from "../../services/shopNews";
import {
  fetchIsFollowingShop,
  fetchShopFollowersCount,
  followShop,
  unfollowShop,
} from "../../services/shopFollowers";

export function ShopScreenNext() {
  const params = useParams<{ id: string }>();
  const routeParam = decodeURIComponent(params.id ?? "");
  const normalizedRouteParam = routeParam.toLowerCase();
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const [shop, setShop] = useState<Shop | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const shopProducts = shop ? allProducts.filter((p) => p.shopId === shop.id) : [];
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [newsItems, setNewsItems] = useState<ShopNewsItem[]>([]);
  const { user, isAuthenticated, accessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [nextShops, nextProducts] = await Promise.all([fetchShops(), fetchProducts()]);
      const nextShop =
        nextShops.find(
          (s) =>
            s.id === routeParam ||
            s.slug === normalizedRouteParam ||
            toShopSlug(s.name) === normalizedRouteParam
        ) ?? null;
      if (cancelled) return;
      setShop(nextShop);
      setAllProducts(nextProducts);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [routeParam, normalizedRouteParam]);

  useEffect(() => {
    if (!shop) return;
    trackLeadEvent({
      type: "view_shop",
      shopId: shop.id,
      metadata: { source: "shop_screen" },
    });
  }, [shop?.id]);

  useEffect(() => {
    if (!shop?.id) {
      setIsFollowing(false);
      setFollowersCount(0);
      setNewsItems([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const [count, news] = await Promise.all([
          fetchShopFollowersCount(shop.id),
          fetchPublicShopNews(shop.id),
        ]);
        if (cancelled) return;
        setFollowersCount(count);
        setNewsItems(news);
      } catch {
        if (cancelled) return;
        setFollowersCount(0);
        setNewsItems([]);
      }

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
  }, [shop?.id, user?.id, accessToken]);

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

  const teamMembers = [
    { name: "Équipe boutique", role: "Accueil & conseil" },
    { name: "Atelier", role: "Sélection & préparation" },
  ];

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
            <h4 className="mb-2">Actualités</h4>
            {newsItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune actualité publiée.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
                {newsItems.map((item) => (
                  <article
                    key={item.id}
                    className="min-w-[260px] max-w-[320px] snap-start rounded-xl border border-border/50 bg-white overflow-hidden"
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-muted" />
                    )}
                    <div className="p-3">
                      <p className="font-semibold mb-1">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mx-4 lg:mx-0 bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-4">
            <h4 className="mb-2">Équipe & histoire</h4>
            <p className="text-sm text-muted-foreground mb-3">
              {shop.name} partage sa sélection locale avec une équipe de passionnés.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teamMembers.map((member) => (
                <div key={member.name} className="rounded-xl bg-muted/40 px-3 py-2">
                  <p className="text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
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

      <BottomNav active="home" onNavigate={(tab) => {
        if (tab === "home") push("/home");
        if (tab === "cart") push("/cart");
        if (tab === "messages") push("/messages");
        if (tab === "profile") {
          if (!isAuthenticated) {
            push("/auth");
            return;
          }
          if (user?.role === "seller") {
            push(user.siretVerified ? "/dashboard" : "/siret");
            return;
          }
          push("/profile");
        }
      }} />
    </div>
  );
}
