"use client";

import type React from "react";
import { AuthProvider } from "../src/app/components/AuthContext";
import { LocationProvider } from "../src/app/components/LocationContext";
import { CartProvider } from "../src/app/components/CartContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocationProvider>
        <CartProvider>{children}</CartProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
