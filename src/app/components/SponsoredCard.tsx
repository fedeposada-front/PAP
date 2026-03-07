import { ChevronRight } from "lucide-react";
import type { SponsoredAd } from "../services/ads";

interface SponsoredCardProps {
  ad: SponsoredAd;
  onClick: () => void;
}

export function SponsoredCard({ ad, onClick }: SponsoredCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-2xl border border-coral/20 bg-white text-left shadow-sm transition-transform hover:-translate-y-0.5"
    >
      {ad.imageUrl && (
        <div className="h-32 overflow-hidden">
          <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="bg-gradient-to-r from-coral-light via-white to-green-light px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-coral">Sponsorise</p>
        <p className="mt-1 text-sm">{ad.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{ad.subtitle}</p>
        <div className="mt-3 flex items-center justify-between text-sm text-coral">
          <span>{ad.ctaLabel}</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}
