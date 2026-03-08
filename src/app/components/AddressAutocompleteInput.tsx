"use client";

import { useEffect, useState } from "react";
import { Input } from "./ds";
import { MapPin } from "lucide-react";

interface AddressFeature {
  properties?: {
    label?: string;
  };
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (!hasUserInteracted) return;

    const query = value.trim();
    if (query.length < 3) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const run = async () => {
        try {
          setLoading(true);
          const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`;
          const response = await fetch(url);
          if (!response.ok) throw new Error("Adresse indisponible");
          const payload = (await response.json()) as { features?: AddressFeature[] };
          if (cancelled) return;
          const labels = (payload.features ?? [])
            .map((feature) => feature.properties?.label ?? "")
            .filter((label) => Boolean(label));
          setResults(labels);
        } catch {
          if (!cancelled) setResults([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      void run();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className="relative">
      <Input
        placeholder={placeholder ?? "Adresse"}
        value={value}
        onChange={(next) => {
          setHasUserInteracted(true);
          onChange(next);
          setShowResults(true);
        }}
        icon={<MapPin className="w-4 h-4" />}
      />

      {loading && (
        <p className="text-xs text-muted-foreground mt-1">Recherche d'adresse...</p>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          {results.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onChange(label);
                setShowResults(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
