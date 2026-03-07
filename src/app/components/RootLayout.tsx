import { Outlet } from "react-router";
import { LocationProvider } from "./LocationContext";

export function RootLayout() {
  return (
    <LocationProvider>
      <Outlet />
    </LocationProvider>
  );
}
