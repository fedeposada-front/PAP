import { useParams, useNavigate } from "react-router";
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Navigation,
  MessageCircle,
  Heart,
  Share2,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button, Badge, ProductCard, Header, BottomNav } from "../ds";
import { SHOPS, PRODUCTS } from "../../data/mock-data";
import { useAuth } from "../AuthContext";

export function ShopScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shop = SHOPS.find((s) => s.id === id) || SHOPS[0];
  const shopProducts = PRODUCTS.filter((p) => p.shopId === shop.id);
  const [liked, setLiked] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Fill with related products if too few
  const displayProducts = shopProducts.length >= 3
    ? shopProducts
    : [
        ...shopProducts,
        ...PRODUCTS.filter((p) => p.shopId !== shop.id).slice(0, 3 - shopProducts.length),
      ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* Hero */}
      <div className="relative">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-full h-56 lg:h-72 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-0 left-0 right-0">
          <Header
            transparent
            onBack={() => navigate(-1)}
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
          <h1>{shop.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-white/80">
            <Star className="w-4 h-4 text-coral fill-coral" />
            <span>{shop.rating}</span>
            <span>({shop.reviewCount} avis)</span>
            <span>·</span>
            <MapPin className="w-3.5 h-3.5" />
            <span>{shop.distance}</span>
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
            <p className="text-sm text-muted-foreground mb-3">
              {shop.description}
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {shop.address}, {shop.city}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{shop.hours}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{shop.phone}</span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 px-4 lg:px-0 mb-6">
            <Button
              fullWidth
              icon={<MessageCircle className="w-4 h-4" />}
              onClick={() => navigate(`/messages?shop=${shop.id}`)}
            >
              Contacter
            </Button>
            <Button
              fullWidth
              variant="outline"
              icon={<Navigation className="w-4 h-4" />}
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
                  onClick={() => navigate(`/product/${product.id}`)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-sm sticky top-4">
            <h4 className="mb-3">Infos pratiques</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-coral mt-0.5" />
                <div>
                  <p>Horaires</p>
                  <p className="text-muted-foreground">{shop.hours}</p>
                </div>
              </div>
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
                <Phone className="w-4 h-4 text-coral mt-0.5" />
                <div>
                  <p>Téléphone</p>
                  <p className="text-muted-foreground">{shop.phone}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-5">
              <Button
                fullWidth
                icon={<MessageCircle className="w-4 h-4" />}
                onClick={() => navigate(`/messages?shop=${shop.id}`)}
              >
                Contacter la boutique
              </Button>
              <Button
                fullWidth
                variant="outline"
                icon={<Navigation className="w-4 h-4" />}
              >
                Voir l'itinéraire
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="home" onNavigate={(tab) => {
        if (tab === "home") navigate("/home");
        if (tab === "cart") navigate("/cart");
        if (tab === "messages") navigate("/messages");
        if (tab === "profile") navigate(isAuthenticated && user?.role === "seller" ? "/dashboard" : "/auth");
      }} />
    </div>
  );
}