import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Trash2,
  MapPin,
  Truck,
  Minus,
  Plus,
} from "lucide-react";
import { Button, Badge, Header, BottomNav } from "../ds";
import { PRODUCTS } from "../../data/mock-data";

export function CartScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState([
    { product: PRODUCTS[0], qty: 1, mode: "pickup" as "pickup" | "delivery" },
    { product: PRODUCTS[2], qty: 1, mode: "delivery" as "pickup" | "delivery" },
  ]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  );
  const buyerFee = subtotal * 0.02;
  const total = subtotal + buyerFee;

  const updateQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item, i) =>
          i === index ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const toggleMode = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              mode: item.mode === "pickup" ? "delivery" : "pickup",
            }
          : item
      )
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Panier" onBack={() => navigate(-1)} />

      <div className="flex-1 lg:max-w-4xl lg:mx-auto lg:w-full lg:flex lg:gap-8 lg:py-6 lg:px-8">
        {/* Items */}
        <div className="flex-1 px-4 lg:px-0 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-5xl mb-4">🛒</span>
              <h3 className="mb-2">Votre panier est vide</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Explorez les boutiques locales pour trouver le cadeau parfait
              </p>
              <Button onClick={() => navigate("/home")}>
                Explorer les boutiques
              </Button>
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.product.id}
                className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm"
              >
                <div className="flex gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {item.product.shopName}
                    </p>
                    <p className="text-sm truncate">{item.product.title}</p>
                    <p className="text-coral mt-0.5">
                      {item.product.price.toFixed(2)} €
                    </p>
                  </div>
                  <button
                    onClick={() => updateQty(index, -item.qty)}
                    className="text-muted-foreground hover:text-destructive self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Qty + mode */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQty(index, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-border"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(index, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMode(index)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                        item.mode === "pickup"
                          ? "bg-coral-light text-coral"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      Retrait
                    </button>
                    <button
                      onClick={() => toggleMode(index)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                        item.mode === "delivery"
                          ? "bg-coral-light text-coral"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      Livraison
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary sidebar (desktop) */}
        {items.length > 0 && (
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-sm sticky top-4">
              <h3 className="mb-4">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Sous-total ({items.reduce((s, i) => s + i.qty, 0)} articles)
                  </span>
                  <span>{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Frais de service (2%)
                    <span className="text-xs bg-coral-light text-coral px-1.5 py-0.5 rounded">
                      acheteur
                    </span>
                  </span>
                  <span>{buyerFee.toFixed(2)} €</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-lg">
                  <span>Total</span>
                  <span className="text-coral">{total.toFixed(2)} €</span>
                </div>
              </div>
              <Button
                fullWidth
                size="lg"
                className="mt-5"
                onClick={() => navigate("/checkout")}
              >
                Commander
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Paiement sécurisé · Remboursement possible
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom */}
      {items.length > 0 && (
        <div className="lg:hidden bg-white border-t border-border px-4 py-3">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="text-muted-foreground">Sous-total</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              Frais de service (2%)
              <Badge variant="coral">acheteur</Badge>
            </span>
            <span className="text-muted-foreground">{buyerFee.toFixed(2)} €</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span>Total</span>
            <span className="text-xl text-coral">{total.toFixed(2)} €</span>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate("/checkout")}>
            Commander · {total.toFixed(2)} €
          </Button>
        </div>
      )}

      <BottomNav active="cart" onNavigate={(tab) => {
        if (tab === "home") navigate("/home");
        if (tab === "cart") navigate("/cart");
      }} />
    </div>
  );
}
