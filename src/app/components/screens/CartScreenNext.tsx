"use client";

import { useRouter } from "next/navigation";
import {
  Trash2,
  MapPin,
  Truck,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { Button, Badge, Header } from "../ds";
import { useCart } from "../CartContext";

export function CartScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { items, updateQty, removeItem, toggleMode, subtotal, buyerFee, total, totalItems } = useCart();

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      <Header title={`Panier${totalItems > 0 ? ` (${totalItems})` : ""}`} onBack={() => router.back()} />

      <div className="flex-1 lg:max-w-4xl lg:mx-auto lg:w-full lg:flex lg:gap-8 lg:py-6 lg:px-8">
        {/* Items */}
        <div className="flex-1 px-4 lg:px-0 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">Votre panier est vide</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
                Explorez les boutiques locales pour trouver le cadeau parfait
              </p>
              <Button onClick={() => push("/home")}>
                Explorer les boutiques
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.color ?? "default"}`}
                className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm"
              >
                <div className="flex gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                    onClick={() => push(`/product/${item.product.id}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {item.product.shopName}
                    </p>
                    <p
                      className="text-sm truncate cursor-pointer hover:text-coral transition-colors"
                      onClick={() => push(`/product/${item.product.id}`)}
                    >
                      {item.product.title}
                    </p>
                    <p className="text-coral mt-0.5">
                      {(item.product.price * item.qty).toFixed(2)} €
                    </p>
                    {item.color && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Couleur : {item.color}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id, item.color)}
                    className="text-muted-foreground hover:text-destructive self-start transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Qty + mode */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQty(item.product.id, -1, item.color)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1, item.color)}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (item.mode !== "pickup") toggleMode(item.product.id, item.color); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                        item.mode === "pickup"
                          ? "bg-coral-light text-coral"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      Retrait
                    </button>
                    {item.product.delivery && (
                      <button
                        onClick={() => { if (item.mode !== "delivery") toggleMode(item.product.id, item.color); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                          item.mode === "delivery"
                            ? "bg-coral-light text-coral"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Truck className="w-3 h-3" />
                        Livraison
                      </button>
                    )}
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
                    Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
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
                onClick={() => push("/checkout")}
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
          <Button fullWidth size="lg" onClick={() => push("/checkout")}>
            Commander · {total.toFixed(2)} €
          </Button>
        </div>
      )}

    </div>
  );
}
