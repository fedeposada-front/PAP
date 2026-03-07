import React, { createContext, useContext, useEffect, useState } from "react";

export interface LocationData {
  cityName: string;
  postalCode: string;
  department: string;
  lat: number;
  lng: number;
}

// Default to Amiens
const DEFAULT_LOCATION: LocationData = {
  cityName: "Amiens",
  postalCode: "80000",
  department: "Somme (80)",
  lat: 49.8941,
  lng: 2.2958,
};

interface LocationContextType {
  location: LocationData;
  setLocation: (loc: LocationData) => void;
}

const LOCATION_STORAGE_KEY = "mcl_location_v1";
const GEO_ATTEMPTED_STORAGE_KEY = "mcl_geo_attempted_v1";

const LocationContext = createContext<LocationContextType>({
  location: DEFAULT_LOCATION,
  setLocation: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationData>(DEFAULT_LOCATION);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedLocation = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (storedLocation) {
      try {
        const parsed = JSON.parse(storedLocation) as LocationData;
        setLocationState(parsed);
        return;
      } catch {
        window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }

    const alreadyAttempted = window.localStorage.getItem(GEO_ATTEMPTED_STORAGE_KEY);
    if (alreadyAttempted || !("geolocation" in navigator)) return;

    window.localStorage.setItem(GEO_ATTEMPTED_STORAGE_KEY, "1");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation: LocationData = {
          cityName: "Ma position",
          postalCode: "",
          department: "",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setLocationState(nextLocation);
        window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(nextLocation));
      },
      () => {
        window.localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(DEFAULT_LOCATION)
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const setLocation = (loc: LocationData) => {
    setLocationState(loc);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
      window.localStorage.setItem(GEO_ATTEMPTED_STORAGE_KEY, "1");
    }
  };

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
