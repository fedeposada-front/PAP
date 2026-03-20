import type {
  DeliveryMethod,
  Order,
  OrderFulfillmentType,
  OrderItem,
  OrderPaymentPolicy,
  PickupReservation,
  Shipment,
} from "../types/orders";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface OrderRow {
  id: string;
  order_number: string;
  buyer_user_id: string;
  shop_id: string;
  fulfillment_type: OrderFulfillmentType;
  payment_policy: OrderPaymentPolicy;
  status: Order["status"];
  payment_status: Order["paymentStatus"];
  payout_status: Order["payoutStatus"];
  currency: string;
  items_subtotal: number;
  delivery_price: number;
  buyer_fee: number;
  platform_fee: number;
  total_amount: number;
  paid_amount: number;
  deposit_rate: number;
  deposit_amount: number;
  remaining_amount: number;
  seller_payout_amount: number;
  customer_note: string | null;
  internal_note: string | null;
  provider: string;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
  provider_transfer_group: string | null;
  reservation_expires_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  picked_up_at: string | null;
  customer_confirmed_received_at: string | null;
  payout_eligible_at: string | null;
  payout_released_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  shop_id: string;
  title: string;
  image_url: string | null;
  color: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_snapshot: Record<string, unknown> | null;
  created_at: string;
}

interface ShipmentRow {
  id: string;
  order_id: string;
  method: DeliveryMethod;
  status: Shipment["status"];
  service_name: string | null;
  carrier_name: string | null;
  price: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_label_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PickupReservationRow {
  id: string;
  order_id: string;
  deposit_required: boolean;
  deposit_rate: number;
  deposit_amount: number;
  remaining_due_amount: number;
  expires_at: string | null;
  reserved_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftOrderLineInput {
  productId?: string;
  shopId: string;
  title: string;
  imageUrl?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  productSnapshot?: Record<string, unknown>;
}

export interface DraftShipmentInput {
  method: DeliveryMethod;
  serviceName?: string;
  carrierName?: string;
  price?: number;
  recipientName?: string;
  recipientPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
}

export interface DraftPickupReservationInput {
  expiresAt?: string | null;
  depositRate?: number;
}

export interface CreateDraftOrderInput {
  buyerUserId: string;
  accessToken: string;
  shopId: string;
  fulfillmentType: OrderFulfillmentType;
  paymentPolicy: OrderPaymentPolicy;
  items: DraftOrderLineInput[];
  currency?: string;
  buyerFeeRate?: number;
  buyerFee?: number;
  platformFee?: number;
  deliveryPrice?: number;
  sellerPayoutAmount?: number;
  customerNote?: string;
  provider?: string;
  reservationExpiresAt?: string | null;
  shipment?: DraftShipmentInput | null;
  pickupReservation?: DraftPickupReservationInput | null;
}

export interface DraftOrderBundle {
  order: Order;
  items: OrderItem[];
  shipment: Shipment | null;
  pickupReservation: PickupReservation | null;
}

export interface DraftOrderAmounts {
  itemsSubtotal: number;
  deliveryPrice: number;
  buyerFee: number;
  platformFee: number;
  totalAmount: number;
  depositRate: number;
  depositAmount: number;
  remainingAmount: number;
  sellerPayoutAmount: number;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerUserId: row.buyer_user_id,
    shopId: row.shop_id,
    fulfillmentType: row.fulfillment_type,
    paymentPolicy: row.payment_policy,
    status: row.status,
    paymentStatus: row.payment_status,
    payoutStatus: row.payout_status,
    currency: row.currency,
    itemsSubtotal: Number(row.items_subtotal),
    deliveryPrice: Number(row.delivery_price),
    buyerFee: Number(row.buyer_fee),
    platformFee: Number(row.platform_fee),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount),
    depositRate: Number(row.deposit_rate),
    depositAmount: Number(row.deposit_amount),
    remainingAmount: Number(row.remaining_amount),
    sellerPayoutAmount: Number(row.seller_payout_amount),
    customerNote: row.customer_note ?? undefined,
    internalNote: row.internal_note ?? undefined,
    provider: row.provider,
    providerCheckoutSessionId: row.provider_checkout_session_id ?? undefined,
    providerPaymentIntentId: row.provider_payment_intent_id ?? undefined,
    providerTransferGroup: row.provider_transfer_group ?? undefined,
    reservationExpiresAt: row.reservation_expires_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    shippedAt: row.shipped_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    pickedUpAt: row.picked_up_at ?? undefined,
    customerConfirmedReceivedAt: row.customer_confirmed_received_at ?? undefined,
    payoutEligibleAt: row.payout_eligible_at ?? undefined,
    payoutReleasedAt: row.payout_released_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    refundedAt: row.refunded_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id ?? undefined,
    shopId: row.shop_id,
    title: row.title,
    imageUrl: row.image_url ?? undefined,
    color: row.color ?? undefined,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    productSnapshot: row.product_snapshot ?? {},
    createdAt: row.created_at,
  };
}

function mapShipmentRow(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    serviceName: row.service_name ?? undefined,
    carrierName: row.carrier_name ?? undefined,
    price: Number(row.price),
    recipientName: row.recipient_name ?? undefined,
    recipientPhone: row.recipient_phone ?? undefined,
    addressLine1: row.address_line1 ?? undefined,
    addressLine2: row.address_line2 ?? undefined,
    postalCode: row.postal_code ?? undefined,
    city: row.city ?? undefined,
    countryCode: row.country_code,
    trackingNumber: row.tracking_number ?? undefined,
    trackingUrl: row.tracking_url ?? undefined,
    shippingLabelUrl: row.shipping_label_url ?? undefined,
    shippedAt: row.shipped_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPickupReservationRow(row: PickupReservationRow): PickupReservation {
  return {
    id: row.id,
    orderId: row.order_id,
    depositRequired: row.deposit_required,
    depositRate: Number(row.deposit_rate),
    depositAmount: Number(row.deposit_amount),
    remainingDueAmount: Number(row.remaining_due_amount),
    expiresAt: row.expires_at ?? undefined,
    reservedAt: row.reserved_at ?? undefined,
    pickedUpAt: row.picked_up_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requestSupabase<T>(
  path: string,
  init: RequestInit,
  accessToken: string
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur Supabase.";
    throw new Error(message);
  }

  return payload as T;
}

export function computeDraftOrderAmounts(params: {
  items: DraftOrderLineInput[];
  fulfillmentType: OrderFulfillmentType;
  paymentPolicy: OrderPaymentPolicy;
  deliveryPrice?: number;
  buyerFeeRate?: number;
  buyerFee?: number;
  platformFee?: number;
  sellerPayoutAmount?: number;
  depositRate?: number;
}): DraftOrderAmounts {
  if (params.items.length === 0) {
    throw new Error("La commande doit contenir au moins un article.");
  }

  if (params.paymentPolicy === "deposit_20" && params.fulfillmentType !== "pickup") {
    throw new Error("L'acompte 20% est reserve au retrait en boutique.");
  }

  const itemsSubtotal = roundMoney(
    params.items.reduce((sum, item) => {
      if (!item.title.trim()) throw new Error("Chaque ligne de commande doit avoir un titre.");
      if (item.quantity < 1) throw new Error("La quantite doit etre superieure ou egale a 1.");
      if (item.unitPrice < 0) throw new Error("Le prix unitaire doit etre positif.");
      return sum + item.quantity * item.unitPrice;
    }, 0)
  );

  const deliveryPrice = roundMoney(params.deliveryPrice ?? 0);
  const buyerFee = roundMoney(
    typeof params.buyerFee === "number"
      ? params.buyerFee
      : itemsSubtotal * (params.buyerFeeRate ?? 0)
  );
  const platformFee = roundMoney(params.platformFee ?? 0);
  const totalAmount = roundMoney(itemsSubtotal + deliveryPrice + buyerFee);
  const depositRate = params.paymentPolicy === "deposit_20"
    ? roundMoney(params.depositRate ?? 0.2)
    : 0;
  const depositAmount = params.paymentPolicy === "deposit_20"
    ? roundMoney(totalAmount * depositRate)
    : 0;
  const remainingAmount = roundMoney(
    params.paymentPolicy === "deposit_20" ? totalAmount - depositAmount : totalAmount
  );
  const sellerPayoutAmount = roundMoney(
    typeof params.sellerPayoutAmount === "number"
      ? params.sellerPayoutAmount
      : itemsSubtotal + deliveryPrice - platformFee
  );

  return {
    itemsSubtotal,
    deliveryPrice,
    buyerFee,
    platformFee,
    totalAmount,
    depositRate,
    depositAmount,
    remainingAmount,
    sellerPayoutAmount,
  };
}

export async function createDraftOrder(params: CreateDraftOrderInput): Promise<DraftOrderBundle> {
  if (!hasSupabaseConfig()) {
    throw new Error("Configuration Supabase manquante.");
  }

  if (!params.buyerUserId.trim()) throw new Error("Acheteur manquant.");
  if (!params.shopId.trim()) throw new Error("Boutique manquante.");
  if (params.items.length === 0) throw new Error("La commande doit contenir au moins un article.");
  if (params.items.some((item) => item.shopId !== params.shopId)) {
    throw new Error("Toutes les lignes doivent appartenir a la meme boutique.");
  }

  const amounts = computeDraftOrderAmounts({
    items: params.items,
    fulfillmentType: params.fulfillmentType,
    paymentPolicy: params.paymentPolicy,
    deliveryPrice: params.deliveryPrice,
    buyerFeeRate: params.buyerFeeRate,
    buyerFee: params.buyerFee,
    platformFee: params.platformFee,
    sellerPayoutAmount: params.sellerPayoutAmount,
    depositRate: params.pickupReservation?.depositRate,
  });

  const providerTransferGroup = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const orderRows = await requestSupabase<OrderRow[]>(
    "orders?select=*",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          buyer_user_id: params.buyerUserId,
          shop_id: params.shopId,
          fulfillment_type: params.fulfillmentType,
          payment_policy: params.paymentPolicy,
          status: "awaiting_payment",
          payment_status: "unpaid",
          payout_status: "pending",
          currency: (params.currency ?? "eur").toLowerCase(),
          items_subtotal: amounts.itemsSubtotal,
          delivery_price: amounts.deliveryPrice,
          buyer_fee: amounts.buyerFee,
          platform_fee: amounts.platformFee,
          total_amount: amounts.totalAmount,
          paid_amount: 0,
          deposit_rate: amounts.depositRate,
          deposit_amount: amounts.depositAmount,
          remaining_amount: amounts.remainingAmount,
          seller_payout_amount: amounts.sellerPayoutAmount,
          customer_note: params.customerNote?.trim() || null,
          provider: params.provider?.trim() || "stripe",
          provider_transfer_group: providerTransferGroup,
          reservation_expires_at: params.reservationExpiresAt ?? params.pickupReservation?.expiresAt ?? null,
        },
      ]),
    },
    params.accessToken
  );

  const insertedOrder = orderRows[0];
  if (!insertedOrder) {
    throw new Error("Impossible de creer la commande.");
  }

  const orderItemRows = await requestSupabase<OrderItemRow[]>(
    "order_items?select=*",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(
        params.items.map((item) => ({
          order_id: insertedOrder.id,
          product_id: item.productId ?? null,
          shop_id: params.shopId,
          title: item.title.trim(),
          image_url: item.imageUrl?.trim() || null,
          color: item.color?.trim() || null,
          quantity: Math.max(1, Math.floor(item.quantity)),
          unit_price: roundMoney(item.unitPrice),
          line_total: roundMoney(item.unitPrice * item.quantity),
          product_snapshot: item.productSnapshot ?? {},
        }))
      ),
    },
    params.accessToken
  );

  let shipment: Shipment | null = null;
  if (params.fulfillmentType === "delivery" && params.shipment) {
    const shipmentRows = await requestSupabase<ShipmentRow[]>(
      "shipments?select=*",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify([
          {
            order_id: insertedOrder.id,
            method: params.shipment.method,
            status: "pending",
            service_name: params.shipment.serviceName?.trim() || null,
            carrier_name: params.shipment.carrierName?.trim() || null,
            price: roundMoney(params.shipment.price ?? amounts.deliveryPrice),
            recipient_name: params.shipment.recipientName?.trim() || null,
            recipient_phone: params.shipment.recipientPhone?.trim() || null,
            address_line1: params.shipment.addressLine1?.trim() || null,
            address_line2: params.shipment.addressLine2?.trim() || null,
            postal_code: params.shipment.postalCode?.trim() || null,
            city: params.shipment.city?.trim() || null,
            country_code: (params.shipment.countryCode ?? "FR").toUpperCase(),
          },
        ]),
      },
      params.accessToken
    );
    shipment = shipmentRows[0] ? mapShipmentRow(shipmentRows[0]) : null;
  }

  let pickupReservation: PickupReservation | null = null;
  if (params.fulfillmentType === "pickup" && params.paymentPolicy === "deposit_20") {
    const pickupRows = await requestSupabase<PickupReservationRow[]>(
      "pickup_reservations?select=*",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify([
          {
            order_id: insertedOrder.id,
            deposit_required: true,
            deposit_rate: amounts.depositRate,
            deposit_amount: amounts.depositAmount,
            remaining_due_amount: amounts.remainingAmount,
            expires_at: params.pickupReservation?.expiresAt ?? params.reservationExpiresAt ?? null,
          },
        ]),
      },
      params.accessToken
    );
    pickupReservation = pickupRows[0] ? mapPickupReservationRow(pickupRows[0]) : null;
  }

  return {
    order: mapOrderRow(insertedOrder),
    items: orderItemRows.map(mapOrderItemRow),
    shipment,
    pickupReservation,
  };
}

export async function createDraftOrders(params: {
  accessToken: string;
  orders: Array<Omit<CreateDraftOrderInput, "accessToken">>;
}): Promise<DraftOrderBundle[]> {
  const bundles: DraftOrderBundle[] = [];
  for (const order of params.orders) {
    bundles.push(await createDraftOrder({ ...order, accessToken: params.accessToken }));
  }
  return bundles;
}
