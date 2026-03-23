import React, { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "../types/catalog";

export interface CartItem {
  product: Product;
  qty: number;
  mode: "pickup" | "delivery";
  color?: string;
}

export interface CartMutationResult {
  ok: boolean;
  qty: number;
  maxQty: number;
  delta: number;
  reason?: "stock_limit" | "out_of_stock" | "not_found";
}

const CART_STORAGE_KEY = "mcl_cart_v1";

const getMaxQty = (product: Product) => {
  const stock = Number.isFinite(product.stock) ? product.stock : 0;
  return Math.max(0, stock);
};

const normalizeItems = (currentItems: CartItem[]) => {
  let changed = false;
  const nextItems: CartItem[] = [];

  currentItems.forEach((item) => {
    const maxQty = getMaxQty(item.product);
    const nextQty = Math.min(item.qty, maxQty);

    if (nextQty <= 0) {
      changed = true;
      return;
    }

    if (nextQty !== item.qty) {
      changed = true;
      nextItems.push({ ...item, qty: nextQty });
      return;
    }

    nextItems.push(item);
  });

  return changed ? nextItems : currentItems;
};

function isCartMode(value: unknown): value is CartItem["mode"] {
  return value === "pickup" || value === "delivery";
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const nextItems = parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const item = entry as Partial<CartItem>;
      const product = item.product as Product | undefined;
      const qty = Math.max(0, Math.floor(Number(item.qty ?? 0)));
      const mode = isCartMode(item.mode) ? item.mode : "pickup";
      const color = typeof item.color === "string" ? item.color : undefined;

      if (!product || typeof product !== "object") return [];
      if (typeof product.id !== "string" || !product.id.trim()) return [];
      if (typeof product.shopId !== "string" || !product.shopId.trim()) return [];
      if (typeof product.shopName !== "string" || !product.shopName.trim()) return [];
      if (typeof product.title !== "string" || !product.title.trim()) return [];
      if (!Number.isFinite(product.price)) return [];
      if (qty <= 0) return [];

      return [{ product, qty, mode, color }];
    });

    return normalizeItems(nextItems);
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    mode?: "pickup" | "delivery",
    color?: string,
    qty?: number
  ) => CartMutationResult;
  removeItem: (productId: string, color?: string) => void;
  updateQty: (productId: string, delta: number, color?: string) => CartMutationResult;
  toggleMode: (productId: string, color?: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  buyerFee: number;
  total: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => ({ ok: false, qty: 0, maxQty: 0, delta: 0, reason: "not_found" }),
  removeItem: () => {},
  updateQty: () => ({ ok: false, qty: 0, maxQty: 0, delta: 0, reason: "not_found" }),
  toggleMode: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  buyerFee: 0,
  total: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    setItems((prev) => normalizeItems(prev));
  }, [items]);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hasHydrated]);

  const addItem = (
    product: Product,
    mode: "pickup" | "delivery" = "pickup",
    color?: string,
    qty = 1
  ) => {
    const requestedQty = Math.max(1, Math.floor(qty));
    const existing = items.find((i) => i.product.id === product.id && (i.color ?? "") === (color ?? ""));
    const currentQty = existing?.qty ?? 0;
    const maxQty = getMaxQty(product);
    const nextQty = Math.min(maxQty, currentQty + requestedQty);
    const appliedDelta = nextQty - currentQty;
    const result: CartMutationResult = {
      ok: appliedDelta > 0,
      qty: nextQty,
      maxQty,
      delta: appliedDelta,
      reason:
        appliedDelta > 0
          ? nextQty < currentQty + requestedQty
            ? "stock_limit"
            : undefined
          : maxQty <= 0
            ? "out_of_stock"
            : "stock_limit",
    };

    if (existing) {
      setItems(
        normalizeItems(
          items.map((i) =>
            i.product.id === product.id && (i.color ?? "") === (color ?? "")
              ? { ...i, qty: nextQty }
              : i
          )
        )
      );
      return result;
    }

    if (nextQty <= 0) {
      return result;
    }

    setItems(normalizeItems([...items, { product, qty: nextQty, mode, color }]));

    return result;
  };

  const removeItem = (productId: string, color?: string) => {
    setItems((prev) => prev.filter((i) => !(i.product.id === productId && (i.color ?? "") === (color ?? ""))));
  };

  const updateQty = (productId: string, delta: number, color?: string) => {
    const existing = items.find((i) => i.product.id === productId && (i.color ?? "") === (color ?? ""));
    if (!existing) {
      const result: CartMutationResult = {
        ok: false,
        qty: 0,
        maxQty: 0,
        delta: 0,
        reason: "not_found",
      };
      return result;
    }

    const maxQty = getMaxQty(existing.product);
    const nextQty = Math.max(0, Math.min(maxQty, existing.qty + delta));
    const appliedDelta = nextQty - existing.qty;
    const result: CartMutationResult = {
      ok: appliedDelta !== 0,
      qty: nextQty,
      maxQty,
      delta: appliedDelta,
      reason:
        appliedDelta !== 0
          ? undefined
          : delta > 0
            ? maxQty <= 0
              ? "out_of_stock"
              : "stock_limit"
            : undefined,
    };

    setItems(
      normalizeItems(
        items
          .map((i) =>
            i.product.id === productId && (i.color ?? "") === (color ?? "")
              ? { ...i, qty: nextQty }
              : i
          )
          .filter((i) => i.qty > 0)
      )
    );

    return result;
  };

  const toggleMode = (productId: string, color?: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId && (i.color ?? "") === (color ?? "")
          ? { ...i, mode: i.mode === "pickup" ? "delivery" : "pickup" }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const buyerFee = subtotal * 0.02;
  const total = subtotal + buyerFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        toggleMode,
        clearCart,
        totalItems,
        subtotal,
        buyerFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
