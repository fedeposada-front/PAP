export type OrderFulfillmentType = "pickup" | "delivery";

export type OrderPaymentPolicy = "full_payment" | "deposit_20";

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "reserved"
  | "paid"
  | "ready_for_pickup"
  | "picked_up"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderPaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "payment_failed"
  | "partially_refunded"
  | "refunded";

export type OrderPayoutStatus =
  | "pending"
  | "eligible"
  | "released"
  | "paid"
  | "cancelled";

export type PaymentAttemptScope = "full" | "deposit" | "balance" | "adjustment";

export type PaymentAttemptStatus =
  | "created"
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

export type ShipmentStatus = "pending" | "ready" | "shipped" | "delivered" | "issue" | "cancelled";

export type DeliveryMethod = "hand" | "post" | "carrier";

export type PayoutStatus = "pending" | "eligible" | "scheduled" | "paid" | "failed" | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  buyerUserId: string;
  shopId: string;
  fulfillmentType: OrderFulfillmentType;
  paymentPolicy: OrderPaymentPolicy;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  payoutStatus: OrderPayoutStatus;
  currency: string;
  itemsSubtotal: number;
  deliveryPrice: number;
  buyerFee: number;
  platformFee: number;
  totalAmount: number;
  paidAmount: number;
  depositRate: number;
  depositAmount: number;
  remainingAmount: number;
  sellerPayoutAmount: number;
  customerNote?: string;
  internalNote?: string;
  provider: string;
  providerCheckoutSessionId?: string;
  providerPaymentIntentId?: string;
  providerTransferGroup?: string;
  reservationExpiresAt?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  pickedUpAt?: string;
  customerConfirmedReceivedAt?: string;
  payoutEligibleAt?: string;
  payoutReleasedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  shopId: string;
  title: string;
  imageUrl?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productSnapshot: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentAttempt {
  id: string;
  orderId: string;
  scope: PaymentAttemptScope;
  status: PaymentAttemptStatus;
  provider: string;
  amount: number;
  currency: string;
  providerCheckoutSessionId?: string;
  providerPaymentIntentId?: string;
  providerChargeId?: string;
  idempotencyKey?: string;
  rawPayload: Record<string, unknown>;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  method: DeliveryMethod;
  status: ShipmentStatus;
  serviceName?: string;
  carrierName?: string;
  price: number;
  recipientName?: string;
  recipientPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  countryCode: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingLabelUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PickupReservation {
  id: string;
  orderId: string;
  depositRequired: boolean;
  depositRate: number;
  depositAmount: number;
  remainingDueAmount: number;
  expiresAt?: string;
  reservedAt?: string;
  pickedUpAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  orderId: string;
  shopId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  provider: string;
  providerTransferId?: string;
  providerPayoutId?: string;
  availableAt?: string;
  releasedAt?: string;
  paidAt?: string;
  failureReason?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
