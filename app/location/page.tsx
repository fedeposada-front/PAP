"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, Search, Loader2 } from "lucide-react";
import { Button, Header } from "../../src/app/components/ds";
import { useLocation } from "../../src/app/components/LocationContext";

interface CityResult {
  nom: string;
  codesPostaux: string[];
  departement: { nom: string; code: string };
  population?: number;
  centre?: { type: string; coordinates: [number, number] };
}

interface LocationData {
  cityName: string;
  postalCode: string;
  department: string;
  lat: number;
  lng: number;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const POPULAR_CITIES = [
  { nom: "Amiens", cp: "80000", dep: "Somme (80)", lat: 49.8941, lng: 2.2958 },
  { nom: "Paris", cp: "75001", dep: "Paris (75)", lat: 48.8566, lng: 2.3522 },
  { nom: "Lyon", cp: "69001", dep: "Rhone (69)", lat: 45.7578, lng: 4.832 },
  { nom: "Marseille", cp: "13001", dep: "Bouches-du-Rhone (13)", lat: 43.2965, lng: 5.3698 },
  { nom: "Bordeaux", cp: "33000", dep: "Gironde (33)", lat: 44.8378, lng: -0.5792 },
  { nom: "Toulouse", cp: "31000", dep: "Haute-Garonne (31)", lat: 43.6047, lng: 1.4442 },
  { nom: "Nantes", cp: "44000", dep: "Loire-Atlantique (44)", lat: 47.2184, lng: -1.5536 },
  { nom: "Strasbourg", cp: "67000", dep: "Bas-Rhin (67)", lat: 48.5734, lng: 7.7521 },
  { nom: "Lille", cp: "59000", dep: "Nord (59)", lat: 50.6292, lng: 3.0573 },
];

async function reverseGeocode(lat: number, lng: number): Promise<Partial<LocationData>> {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=nom,codesPostaux,departement&format=json&geometry=centre`
    );
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{
      nom?: string;
      codesPostaux?: string[];
      departement?: { nom?: string; code?: string };
    }>;
    const first = rows[0];
    if (!first) return {};
    return {
      cityName: first.nom ?? "Ma position",
      postalCode: first.codesPostaux?.[0] ?? "",
      department: first.departement?.nom && first.departement?.code
        ? `${first.departement.nom} (${first.departement.code})`
        : "",
    };
  } catch {
    return {};
  }
}

export default function LocationPage() {
  const router = useRouter();
  const { setLocation } = useLocation();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const fetchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const isPostalCode = /^\d{2,5}$/.test(query);
      const url = isPostalCode
        ? `https://geo.api.gouv.fr/communes?codePostal=${query}&fields=nom,codesPostaux,departement,population,centre&limit=10`
        : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,codesPostaux,departement,population,centre&boost=population&limit=8`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("API error");
      const data: CityResult[] = await res.json();
      data.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
      setResults(data);
    } catch {
      setError(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCities(debouncedSearch);
  }, [debouncedSearch, fetchCities]);

  const handleSelectCity = (name: string, cp: string, dep: string, lat: number, lng: number) => {
    setLocation({
      cityName: name,
      postalCode: cp,
      department: dep,
      lat,
      lng,
    });
    router.push("/home");
  };

  const handleUseCurrentPosition = () => {
    setGeoError(null);

    if (!("geolocation" in navigator)) {
      setGeoError("La geolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocation({
          cityName: geo.cityName ?? "Ma position",
          postalCode: geo.postalCode ?? "",
          department: geo.department ?? "",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        router.push("/home");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Permission refusée. Active la localisation dans ton navigateur.");
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoError("Délai dépassé. Réessaie ou choisis une ville manuellement.");
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError("Position indisponible actuellement. Réessaie dans quelques secondes.");
          return;
        }
        setGeoError("La position actuelle n'a pas pu être récupérée. Autorise la géolocalisation ou choisis une ville.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const showPopular = search.trim().length < 2 && results.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Votre localisation" />

      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-coral-light rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-coral" />
          </div>
          <h2 className="mb-2">Ou cherchez-vous un cadeau ?</h2>
          <p className="text-muted-foreground text-sm">
            Pour trouver les boutiques proches de vous
          </p>
        </div>

        <Button
          fullWidth
          variant="accent"
          size="lg"
          icon={<Navigation className="w-5 h-5" />}
          onClick={handleUseCurrentPosition}
          className="mb-6"
        >
          Utiliser ma position actuelle
        </Button>

        <div className="relative mb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="flex-1 h-px bg-border" />
            <span>ou choisir une ville</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-input-background rounded-xl px-4 py-3">
          <span className="text-muted-foreground">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ville ou code postal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {search.length > 0 && (
            <button
              onClick={() => {
                setSearch("");
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-3 text-center">
            Impossible de charger les resultats. Verifiez votre connexion.
          </p>
        )}

        {geoError && (
          <p className="text-sm text-red-500 mt-3 text-center">{geoError}</p>
        )}

        <div className="mt-4 space-y-1">
          {showPopular && (
            <>
              <p className="text-xs text-muted-foreground px-2 mb-2">
                Villes populaires
              </p>
              {POPULAR_CITIES.map((city) => (
                <button
                  key={city.nom}
                  onClick={() => handleSelectCity(city.nom, city.cp, city.dep, city.lat, city.lng)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 bg-coral-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-coral" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm truncate">{city.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {city.cp} · {city.dep}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {!showPopular && results.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground px-2 mb-2">
                {results.length} resultat{results.length > 1 ? "s" : ""}
              </p>
              {results.map((city, idx) => {
                const mainCp = city.codesPostaux?.[0] ?? "";
                const depLabel = city.departement
                  ? `${city.departement.nom} (${city.departement.code})`
                  : "";
                const lat = city.centre?.coordinates[1] ?? 49.8941;
                const lng = city.centre?.coordinates[0] ?? 2.2958;
                return (
                  <button
                    key={`${city.nom}-${mainCp}-${idx}`}
                    onClick={() => handleSelectCity(city.nom, mainCp, depLabel, lat, lng)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 bg-green-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm truncate">{city.nom}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {mainCp}
                        {city.codesPostaux.length > 1 && ` (+${city.codesPostaux.length - 1})`}
                        {depLabel && ` · ${depLabel}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {!showPopular && !loading && !error && debouncedSearch.length >= 2 && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                Aucune ville trouvee pour « {debouncedSearch} »
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Essayez un autre nom ou un code postal
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
