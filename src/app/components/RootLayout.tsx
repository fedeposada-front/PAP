import { Outlet } from "react-router";
import { LocationProvider } from "./LocationContext";
import { CartProvider } from "./CartContext";
import { AuthProvider } from "./AuthContext";

export function RootLayout() {
  return (
    <AuthProvider>
      <LocationProvider>
        <CartProvider>
          <Outlet />
        </CartProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
