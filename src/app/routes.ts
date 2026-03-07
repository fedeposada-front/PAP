import { createBrowserRouter } from "react-router";

import { RootLayout } from "./components/RootLayout";
import { SplashScreen } from "./components/screens/SplashScreen";
import { OnboardingScreen } from "./components/screens/OnboardingScreen";
import { LocationScreen } from "./components/screens/LocationScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { ShopScreen } from "./components/screens/ShopScreen";
import { ProductScreen } from "./components/screens/ProductScreen";
import { CartScreen } from "./components/screens/CartScreen";
import { CheckoutScreen } from "./components/screens/CheckoutScreen";
import { AuthScreen } from "./components/screens/AuthScreen";
import { SiretScreen } from "./components/screens/SiretScreen";
import { DashboardScreen } from "./components/screens/DashboardScreen";
import { AddProductScreen } from "./components/screens/AddProductScreen";
import { MessagesScreen } from "./components/screens/MessagesScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: SplashScreen },
      { path: "onboarding", Component: OnboardingScreen },
      { path: "location", Component: LocationScreen },
      { path: "home", Component: HomeScreen },
      { path: "shop/:id", Component: ShopScreen },
      { path: "product/:id", Component: ProductScreen },
      { path: "cart", Component: CartScreen },
      { path: "checkout", Component: CheckoutScreen },
      { path: "auth", Component: AuthScreen },
      { path: "siret", Component: SiretScreen },
      { path: "dashboard", Component: DashboardScreen },
      { path: "add-product", Component: AddProductScreen },
      { path: "messages", Component: MessagesScreen },
      { path: "settings", Component: SettingsScreen },
    ],
  },
]);