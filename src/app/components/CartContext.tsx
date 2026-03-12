import React, { createContext, useContext, useState } from "react";
import type { Product } from "../types/catalog";

export interface CartItem {
  product: Product;
  qty: number;
  mode: "pickup" | "delivery";
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, mode?: "pickup" | "delivery") => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, delta: number) => void;
  toggleMode: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  buyerFee: number;
  total: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  toggleMode: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
  buyerFee: 0,
  total: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, mode: "pickup" | "delivery" = "pickup") => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1, mode }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, qty: Math.max(0, i.qty + delta) }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const toggleMode = (productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
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
