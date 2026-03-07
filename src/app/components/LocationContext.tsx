import React, { createContext, useContext, useState } from "react";

export interface LocationData {
  cityName: string;
  postalCode: string;
  department: string;
  lat: number;
  lng: number;
}

// Default to Lyon
const DEFAULT_LOCATION: LocationData = {
  cityName: "Lyon",
  postalCode: "69001",
  department: "Rhône (69)",
  lat: 45.7578,
  lng: 4.832,
};

interface LocationContextType {
  location: LocationData;
  setLocation: (loc: LocationData) => void;
}

const LocationContext = createContext<LocationContextType>({
  location: DEFAULT_LOCATION,
  setLocation: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
