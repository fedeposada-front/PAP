import { useState } from "react";
import { useParams, useNavigate } from "react-router";
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
import { Button, Badge, Header, BottomNav } from "../ds";
import { PRODUCTS, SHOPS } from "../../data/mock-data";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";

export function ProductScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, items } = useCart();
  const { user, isAuthenticated } = useAuth();
  const product = PRODUCTS.find((p) => p.id === id) || PRODUCTS[0];
  const shop = SHOPS.find((s) => s.id === product.shopId);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  const isInCart = items.some((i) => i.product.id === product.id);

  const handleAddToCart = (goToCart = false) => {
    if (!isInCart) {
      addItem(product, product.pickup ? "pickup" : "delivery");
    }
    if (goToCart) {
      navigate("/cart");
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* Desktop layout */}
      <div className="hidden lg:block">
        <Header
          title=""
          onBack={() => navigate(-1)}
          right={
            <div className="flex gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${liked ? "bg-coral-light" : "bg-muted"}`}
              >
                <Heart className={`w-4 h-4 ${liked ? "text-coral fill-coral" : ""}`} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-muted">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          }
        />
      </div>

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
              onClick={() => navigate(`/shop/${product.shopId}`)}
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

          {/* Shop info card */}
          {shop && (
            <div
              onClick={() => navigate(`/shop/${shop.id}`)}
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
                navigate(`/messages?shop=${product.shopId}`);
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

      <BottomNav active="home" onNavigate={(tab) => {
        if (tab === "home") navigate("/home");
        if (tab === "cart") navigate("/cart");
        if (tab === "messages") navigate("/messages");
        if (tab === "profile") navigate(isAuthenticated && user?.role === "seller" ? "/dashboard" : "/auth");
      }} />
    </div>
  );
}
