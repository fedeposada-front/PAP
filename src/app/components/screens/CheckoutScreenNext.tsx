"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Shield,
  Check,
  ChevronRight,
  PartyPopper,
  Truck,
} from "lucide-react";
import { motion } from "motion/react";
import { Button, Badge, Header, Input } from "../ds";
import { useCart, type CartItem } from "../CartContext";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";
import {
  createDraftOrders,
  computeDraftOrderAmounts,
  type DraftOrderAmounts,
  type DraftOrderBundle,
} from "../../services/orders";
import type { OrderPaymentPolicy } from "../../types/orders";

const BUYER_FEE_RATE = 0.02;
const PICKUP_DEPOSIT_RATE = 0.2;
const PICKUP_RESERVATION_DAYS = 7;

interface CheckoutGroup {
  key: string;
  shopId: string;
  shopName: string;
  mode: "pickup" | "delivery";
  items: CartItem[];
  subtotal: number;
  buyerFee: number;
  paymentPolicy: OrderPaymentPolicy;
  amounts: DraftOrderAmounts;
  payNowAmount: number;
  remainingLaterAmount: number;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getCartLineKey(item: CartItem) {
  return `${item.product.id}:${item.color ?? ""}`;
}

function getCheckoutGroupKey(item: CartItem) {
  return `${item.product.shopId}:${item.mode}`;
}

function buildReservationExpiry(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function CheckoutScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, accessToken, isAuthenticated, isLoading } = useAuth();
  const { items, toggleMode, subtotal, buyerFee, total, clearCart } = useCart();
  const [confirmed, setConfirmed] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<DraftOrderBundle[]>([]);
  const [confirmedItems, setConfirmedItems] = useState<CartItem[]>([]);
  const [pickupPaymentPolicies, setPickupPaymentPolicies] = useState<
    Record<string, OrderPaymentPolicy>
  >({});
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState({
    name: "Marie Durand",
    street: "24 Rue Victor Hugo",
    postalCode: "69002",
    city: "Lyon",
  });
  const [tempAddress, setTempAddress] = useState(address);

  const hasDeliveryItems = items.some((item) => item.mode === "delivery");
  const hasStockIssues = items.some((item) => item.qty > Math.max(0, item.product.stock));

  const baseGroupsByKey = new Map<
    string,
    {
      key: string;
      shopId: string;
      shopName: string;
      mode: "pickup" | "delivery";
      items: CartItem[];
      subtotal: number;
    }
  >();

  for (const item of items) {
    const key = getCheckoutGroupKey(item);
    const existingGroup = baseGroupsByKey.get(key);
    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.subtotal = roundMoney(
        existingGroup.subtotal + item.product.price * item.qty
      );
      continue;
    }

    baseGroupsByKey.set(key, {
      key,
      shopId: item.product.shopId,
      shopName: item.product.shopName,
      mode: item.mode,
      items: [item],
      subtotal: roundMoney(item.product.price * item.qty),
    });
  }

  const baseGroups = Array.from(baseGroupsByKey.values());
  let remainingBuyerFee = roundMoney(buyerFee);
  const checkoutGroups: CheckoutGroup[] = baseGroups.map((group, index) => {
    const groupBuyerFee =
      index === baseGroups.length - 1
        ? remainingBuyerFee
        : roundMoney(group.subtotal * BUYER_FEE_RATE);
    remainingBuyerFee = roundMoney(Math.max(0, remainingBuyerFee - groupBuyerFee));

    const paymentPolicy: OrderPaymentPolicy =
      group.mode === "pickup"
        ? (pickupPaymentPolicies[group.key] ?? "full_payment")
        : "full_payment";

    const amounts = computeDraftOrderAmounts({
      items: group.items.map((item) => ({
        shopId: group.shopId,
        title: item.product.title,
        quantity: item.qty,
        unitPrice: item.product.price,
      })),
      fulfillmentType: group.mode,
      paymentPolicy,
      buyerFee: groupBuyerFee,
      deliveryPrice: 0,
      platformFee: 0,
      depositRate: PICKUP_DEPOSIT_RATE,
    });

    return {
      ...group,
      buyerFee: groupBuyerFee,
      paymentPolicy,
      amounts,
      payNowAmount:
        paymentPolicy === "deposit_20" ? amounts.depositAmount : amounts.totalAmount,
      remainingLaterAmount:
        paymentPolicy === "deposit_20" ? amounts.remainingAmount : 0,
    };
  });

  const pickupGroups = checkoutGroups.filter((group) => group.mode === "pickup");
  const payNowTotal = roundMoney(
    checkoutGroups.reduce((sum, group) => sum + group.payNowAmount, 0)
  );
  const remainingLaterTotal = roundMoney(
    checkoutGroups.reduce((sum, group) => sum + group.remainingLaterAmount, 0)
  );

  const handleConfirm = async () => {
    setCheckoutError(null);

    if (hasStockIssues) {
      setCheckoutError(
        "Certaines quantités dépassent le stock disponible. Retournez au panier pour corriger."
      );
      return;
    }

    if (!items.length) {
      push("/cart");
      return;
    }

    if (!isAuthenticated || !user || !accessToken) {
      setCheckoutError("Connectez-vous pour créer la commande.");
      push("/auth?next=/checkout");
      return;
    }

    if (isLoading || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const reservationExpiry = buildReservationExpiry(PICKUP_RESERVATION_DAYS);
      const orders = checkoutGroups.map((group) => ({
        buyerUserId: user.id,
        shopId: group.shopId,
        fulfillmentType: group.mode,
        paymentPolicy: group.paymentPolicy,
        items: group.items.map((item) => ({
          productId: item.product.id,
          shopId: group.shopId,
          title: item.product.title,
          imageUrl: item.product.image,
          color: item.color ?? item.product.color,
          quantity: item.qty,
          unitPrice: item.product.price,
          productSnapshot: {
            productId: item.product.id,
            shopId: item.product.shopId,
            shopName: item.product.shopName,
            title: item.product.title,
            image: item.product.image,
            category: item.product.category,
            availableToday: item.product.availableToday,
            pickup: item.product.pickup,
            delivery: item.product.delivery,
            color: item.color ?? item.product.color ?? null,
          },
        })),
        buyerFee: group.buyerFee,
        deliveryPrice: 0,
        platformFee: 0,
        customerNote:
          group.mode === "pickup" && group.paymentPolicy === "deposit_20"
            ? "Reservation avec acompte de 20%."
            : undefined,
        reservationExpiresAt:
          group.mode === "pickup" && group.paymentPolicy === "deposit_20"
            ? reservationExpiry
            : null,
        shipment:
          group.mode === "delivery"
            ? {
                method: "carrier" as const,
                serviceName: "Livraison standard",
                carrierName: "A definir",
                price: 0,
                recipientName: address.name,
                addressLine1: address.street,
                postalCode: address.postalCode,
                city: address.city,
                countryCode: "FR",
              }
            : null,
        pickupReservation:
          group.mode === "pickup" && group.paymentPolicy === "deposit_20"
            ? {
                expiresAt: reservationExpiry,
                depositRate: PICKUP_DEPOSIT_RATE,
              }
            : null,
      }));

      const bundles = await createDraftOrders({
        accessToken,
        orders,
      });
      const itemsSnapshot = items.map((item) => ({ ...item }));

      for (const item of itemsSnapshot) {
        trackLeadEvent({
          type: "reservation_request",
          actorUserId: user?.id,
          shopId: item.product.shopId,
          productId: item.product.id,
          metadata: {
            mode: item.mode,
            qty: item.qty,
            amount: Number((item.product.price * item.qty).toFixed(2)),
          },
        });
      }

      setCreatedOrders(bundles);
      setConfirmedItems(itemsSnapshot);
      clearCart();
      setConfirmed(true);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Impossible de créer la commande pour le moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !confirmed) {
    push("/cart");
    return null;
  }

  if (confirmed) {
    const orderNumbers = createdOrders.map((bundle) => bundle.order.orderNumber);
    const createdTotal = roundMoney(
      createdOrders.reduce((sum, bundle) => sum + bundle.order.totalAmount, 0)
    );
    const createdPayNow = roundMoney(
      createdOrders.reduce(
        (sum, bundle) =>
          sum +
          (bundle.order.paymentPolicy === "deposit_20"
            ? bundle.order.depositAmount
            : bundle.order.totalAmount),
        0
      )
    );
    const createdRemaining = roundMoney(
      createdOrders.reduce(
        (sum, bundle) =>
          sum +
          (bundle.order.paymentPolicy === "deposit_20"
            ? bundle.order.remainingAmount
            : 0),
        0
      )
    );

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
          <h1 className="mb-2">Commande créée !</h1>
          <p className="text-muted-foreground mb-2">
            {createdOrders.length === 1
              ? `Votre commande n°${orderNumbers[0]} a bien été enregistrée.`
              : `Vos commandes ${orderNumbers.join(", ")} ont bien été enregistrées.`}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Le paiement en ligne sera branché à l'étape suivante. Cette version
            enregistre déjà les commandes réelles en base.
          </p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <PartyPopper className="w-5 h-5 text-coral" />
            <span className="text-sm text-coral">
              Vous faites vivre le commerce local !
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm mb-6 text-left">
            <h4 className="mb-3">Commandes créées</h4>
            <div className="space-y-2 mb-4">
              {createdOrders.map((bundle) => (
                <div
                  key={bundle.order.id}
                  className="rounded-xl border border-border/70 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{bundle.order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {bundle.order.fulfillmentType === "pickup"
                          ? "Retrait en boutique"
                          : "Livraison"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        bundle.order.paymentPolicy === "deposit_20"
                          ? "warning"
                          : "coral"
                      }
                    >
                      {bundle.order.paymentPolicy === "deposit_20"
                        ? "Acompte 20%"
                        : "Paiement total"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <h4 className="mb-3">Récapitulatif</h4>
            {confirmedItems.map((item) => (
              <div
                key={getCartLineKey(item)}
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
                    {item.mode === "pickup" ? "Retrait" : "Livraison"} ·{" "}
                    {item.product.shopName}
                  </p>
                </div>
                <p className="text-sm">{(item.product.price * item.qty).toFixed(2)} €</p>
              </div>
            ))}
            <div className="space-y-2 text-sm mt-3 pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total commande</span>
                <span>{createdTotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">À payer aujourd'hui</span>
                <span className="text-coral">{createdPayNow.toFixed(2)} €</span>
              </div>
              {createdRemaining > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reste en boutique</span>
                  <span>{createdRemaining.toFixed(2)} €</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={() => push("/home")}>
              Continuer mes achats
            </Button>
            <Button fullWidth variant="outline" onClick={() => push("/home")}>
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Paiement" onBack={() => router.back()} />

      <div className="flex-1 lg:max-w-4xl lg:mx-auto lg:w-full lg:flex lg:gap-8 lg:py-6 lg:px-8">
        <div className="flex-1 px-4 lg:px-0 py-4 space-y-4">
          {checkoutError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {checkoutError}
            </div>
          )}
          {/* Order summary */}
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
            <h4 className="mb-3">Votre commande</h4>
            {items.map((item) => (
              <div
                key={getCartLineKey(item)}
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
                      {item.product.shopName} · x{item.qty}
                    </p>
                  </div>
                  <p className="text-sm">
                    {(item.product.price * item.qty).toFixed(2)} €
                  </p>
                </div>
                {/* Delivery mode toggle */}
                <div className="flex gap-2 mt-2.5 ml-[calc(3.5rem+0.75rem)]">
                  <button
                    onClick={() => {
                      if (item.mode !== "pickup") toggleMode(item.product.id, item.color);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      item.mode === "pickup"
                        ? "bg-coral-light text-coral"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    Retrait en boutique
                  </button>
                  {item.product.delivery && (
                    <button
                      onClick={() => {
                        if (item.mode !== "delivery") toggleMode(item.product.id, item.color);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                        item.mode === "delivery"
                          ? "bg-green-light text-green"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      Livraison
                    </button>
                  )}
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
                  onClick={() => {
                    setTempAddress(address);
                    setEditingAddress(true);
                  }}
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

          {/* Pickup payment policy */}
          {pickupGroups.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
              <div className="mb-3">
                <h4>Paiement du retrait</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Choisissez, pour chaque boutique retirée sur place, si le
                  client paie tout maintenant ou seulement 20% d'acompte.
                </p>
              </div>

              <div className="space-y-3">
                {pickupGroups.map((group) => {
                  const totalItemsInGroup = group.items.reduce(
                    (sum, item) => sum + item.qty,
                    0
                  );

                  return (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-border/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{group.shopName}</p>
                          <p className="text-xs text-muted-foreground">
                            {totalItemsInGroup} article
                            {totalItemsInGroup > 1 ? "s" : ""}
                          </p>
                        </div>
                        <Badge variant="outline">Retrait</Badge>
                      </div>

                      <div className="grid gap-2 mt-3 sm:grid-cols-2">
                        <button
                          onClick={() =>
                            setPickupPaymentPolicies((prev) => ({
                              ...prev,
                              [group.key]: "full_payment",
                            }))
                          }
                          className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                            group.paymentPolicy === "full_payment"
                              ? "border-coral bg-coral-light/60"
                              : "border-border bg-white hover:bg-muted/50"
                          }`}
                        >
                          <p className="text-sm">Payer 100% en ligne</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.amounts.totalAmount.toFixed(2)} € aujourd'hui
                          </p>
                        </button>

                        <button
                          onClick={() =>
                            setPickupPaymentPolicies((prev) => ({
                              ...prev,
                              [group.key]: "deposit_20",
                            }))
                          }
                          className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                            group.paymentPolicy === "deposit_20"
                              ? "border-green bg-green-light/60"
                              : "border-border bg-white hover:bg-muted/50"
                          }`}
                        >
                          <p className="text-sm">Réserver avec 20%</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {group.payNowAmount.toFixed(2)} € aujourd'hui
                            {group.remainingLaterAmount > 0
                              ? ` · ${group.remainingLaterAmount.toFixed(2)} € en boutique`
                              : ""}
                          </p>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl p-4 border border-border/50 shadow-sm">
            <h4 className="mb-3">Paiement</h4>
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-coral" />
                <span>Le débit carte sera branché à l'étape Stripe suivante.</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Cet écran crée déjà de vraies commandes en base, avec une
                commande par boutique et par mode de retrait ou livraison.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Montant prévu aujourd'hui : {payNowTotal.toFixed(2)} €.
                {remainingLaterTotal > 0
                  ? ` Reste à payer en boutique : ${remainingLaterTotal.toFixed(2)} €.`
                  : ""}
              </p>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total commande</span>
                <span className="text-coral">{total.toFixed(2)} €</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-lg">
                <span>À payer aujourd'hui</span>
                <span className="text-coral">{payNowTotal.toFixed(2)} €</span>
              </div>
              {remainingLaterTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reste en boutique</span>
                  <span>{remainingLaterTotal.toFixed(2)} €</span>
                </div>
              )}
            </div>
            <Button
              fullWidth
              size="lg"
              className="mt-5"
              disabled={hasStockIssues || isLoading || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting
                ? "Création de la commande..."
                : `Créer la commande · ${payNowTotal.toFixed(2)} €`}
            </Button>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              Commande persistée en base avant le paiement
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
          <span>À payer aujourd'hui</span>
          <span className="text-xl text-coral">{payNowTotal.toFixed(2)} €</span>
        </div>
        {remainingLaterTotal > 0 && (
          <div className="text-xs text-muted-foreground mb-3">
            Reste en boutique : {remainingLaterTotal.toFixed(2)} €
          </div>
        )}
        <Button
          fullWidth
          size="lg"
          disabled={hasStockIssues || isLoading || isSubmitting}
          onClick={handleConfirm}
        >
          <Shield className="w-4 h-4" />
          {isSubmitting
            ? "Création de la commande..."
            : `Créer la commande · ${payNowTotal.toFixed(2)} €`}
        </Button>
      </div>

      {/* Address editing modal */}
      {editingAddress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
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
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setEditingAddress(false)}
              >
                Annuler
              </Button>
              <Button
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
