import { useState } from "react";
import { useNavigate } from "react-router";
import {
  CreditCard,
  MapPin,
  Shield,
  Check,
  ChevronRight,
  PartyPopper,
  Truck,
} from "lucide-react";
import { motion } from "motion/react";
import { Button, Badge, Header, Input } from "../ds";
import { PRODUCTS } from "../../data/mock-data";

export function CheckoutScreen() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState({
    name: "Marie Durand",
    street: "24 Rue Victor Hugo",
    postalCode: "69002",
    city: "Lyon",
  });
  const [tempAddress, setTempAddress] = useState(address);

  const [items, setItems] = useState([
    { product: PRODUCTS[0], qty: 1, mode: "pickup" as "pickup" | "delivery" },
    { product: PRODUCTS[2], qty: 1, mode: "delivery" as "pickup" | "delivery" },
  ]);

  const toggleMode = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, mode: item.mode === "pickup" ? "delivery" : "pickup" }
          : item
      )
    );
  };

  const hasDeliveryItems = items.some((item) => item.mode === "delivery");

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  );
  const buyerFee = subtotal * 0.02;
  const total = subtotal + buyerFee;

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-20 h-20 bg-green-light rounded-full flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-green" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center max-w-md"
        >
          <h1 className="mb-2">Commande confirmée !</h1>
          <p className="text-muted-foreground mb-2">
            Merci pour votre achat. Votre commande n°MCL-2026-0847 a bien été
            enregistrée.
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <PartyPopper className="w-5 h-5 text-coral" />
            <span className="text-sm text-coral">
              Vous faites vivre le commerce local !
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6 text-left">
            <h4 className="mb-3">Récapitulatif</h4>
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                <img
                  src={item.product.image}
                  alt={item.product.title}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 text-sm">
                  <p className="truncate">{item.product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.mode === "pickup" ? "📍 Retrait" : "🚚 Livraison"} ·{" "}
                    {item.product.shopName}
                  </p>
                </div>
                <p className="text-sm">{item.product.price.toFixed(2)} €</p>
              </div>
            ))}
            <div className="flex justify-between text-sm mt-3 pt-2 border-t border-border">
              <span className="text-muted-foreground">Total payé</span>
              <span className="text-coral">{total.toFixed(2)} €</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={() => navigate("/home")}>
              Continuer mes achats
            </Button>
            <Button fullWidth variant="outline" onClick={() => navigate("/home")}>
              Suivre ma commande
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Paiement" onBack={() => navigate(-1)} />

      <div className="flex-1 lg:max-w-4xl lg:mx-auto lg:w-full lg:flex lg:gap-8 lg:py-6 lg:px-8">
        <div className="flex-1 px-4 lg:px-0 py-4 space-y-4">
          {/* Order summary */}
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
            <h4 className="mb-3">Votre commande</h4>
            {items.map((item, index) => (
              <div
                key={item.product.id}
                className="py-2.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.shopName} · × {item.qty}
                    </p>
                  </div>
                  <p className="text-sm">
                    {(item.product.price * item.qty).toFixed(2)} €
                  </p>
                </div>
                {/* Delivery mode toggle */}
                <div className="flex gap-2 mt-2.5 ml-[calc(3.5rem+0.75rem)]">
                  <button
                    onClick={() => { if (item.mode !== "pickup") toggleMode(index); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      item.mode === "pickup"
                        ? "bg-coral-light text-coral"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    Retrait en boutique
                  </button>
                  <button
                    onClick={() => { if (item.mode !== "delivery") toggleMode(index); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      item.mode === "delivery"
                        ? "bg-green-light text-green"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Truck className="w-3 h-3" />
                    Livraison
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery address (for delivery items) */}
          {hasDeliveryItems && (
            <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4>Adresse de livraison</h4>
                <button
                  className="text-sm text-coral flex items-center gap-1"
                  onClick={() => setEditingAddress(true)}
                >
                  Modifier <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p>{address.name}</p>
                  <p className="text-muted-foreground">
                    {address.street}, {address.postalCode} {address.city}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
            <h4 className="mb-3">Paiement</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-coral-light rounded-xl border-2 border-coral">
                <CreditCard className="w-5 h-5 text-coral" />
                <div className="flex-1">
                  <p className="text-sm">Carte bancaire</p>
                  <p className="text-xs text-muted-foreground">
                    Visa, Mastercard, CB
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-coral flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-coral rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <span className="text-lg">📱</span>
                <div className="flex-1">
                  <p className="text-sm">Apple Pay / Google Pay</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                placeholder="Numéro de carte"
                icon={<CreditCard className="w-4 h-4" />}
              />
              <div className="flex gap-3">
                <Input placeholder="MM/AA" className="flex-1" />
                <Input placeholder="CVC" className="flex-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl p-5 border border-border/50 shadow-sm sticky top-4">
            <h3 className="mb-4">Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  Frais de service
                  <Badge variant="coral">2% acheteur</Badge>
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
              onClick={() => setConfirmed(true)}
            >
              Payer {total.toFixed(2)} €
            </Button>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              Paiement 100% sécurisé
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom */}
      <div className="lg:hidden bg-white border-t border-border px-4 py-3">
        <div className="flex items-center justify-between mb-1 text-sm">
          <span className="text-muted-foreground">Sous-total</span>
          <span>{subtotal.toFixed(2)} €</span>
        </div>
        <div className="flex items-center justify-between mb-1 text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            Frais de service
            <Badge variant="coral">2% acheteur</Badge>
          </span>
          <span className="text-muted-foreground">{buyerFee.toFixed(2)} €</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span>Total</span>
          <span className="text-xl text-coral">{total.toFixed(2)} €</span>
        </div>
        <Button fullWidth size="lg" onClick={() => setConfirmed(true)}>
          <Shield className="w-4 h-4" />
          Payer {total.toFixed(2)} €
        </Button>
      </div>

      {/* Address editing modal */}
      {editingAddress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h3 className="mb-4">Modifier l'adresse de livraison</h3>
            <div className="space-y-3">
              <Input
                placeholder="Nom"
                value={tempAddress.name}
                onChange={(v) => setTempAddress({ ...tempAddress, name: v })}
              />
              <Input
                placeholder="Rue"
                value={tempAddress.street}
                onChange={(v) => setTempAddress({ ...tempAddress, street: v })}
              />
              <div className="flex gap-3">
                <Input
                  placeholder="Code postal"
                  value={tempAddress.postalCode}
                  onChange={(v) => setTempAddress({ ...tempAddress, postalCode: v })}
                />
                <Input
                  placeholder="Ville"
                  value={tempAddress.city}
                  onChange={(v) => setTempAddress({ ...tempAddress, city: v })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setEditingAddress(false)}
              >
                Annuler
              </Button>
              <Button
                className="ml-3"
                onClick={() => {
                  setAddress(tempAddress);
                  setEditingAddress(false);
                }}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}