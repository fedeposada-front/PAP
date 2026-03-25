"use client";

import { ShopMap } from "../ShopMap";
import { SponsoredCard } from "../SponsoredCard";
import { useLocation } from "../LocationContext";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LoaderCircle,
  MapPin,
  Star,
  SlidersHorizontal,
  Map as MapIcon,
  List,
  Clock,
  Truck,
  CalendarCheck,
  Sparkles,
  ShoppingBag,
  Newspaper,
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import {
  Input,
  Chip,
  ShopCard,
  ProductCard,
  BottomSheet,
  Button,
  Logo,
  CategoryIcon,
} from "../ds";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  fetchSponsoredAd,
  trackAdClick,
  trackAdImpression,
  type SponsoredAd,
} from "../../services/ads";
import { fetchProducts, fetchShops } from "../../services/catalog";
import {
  CATEGORY_GROUPS,
  CATEGORY_GROUPS_WITH_ALL,
  matchesCategoryFilter,
} from "../../data/catalog";
import type { Product, Shop } from "../../types/catalog";
import { getProductHref, getShopHref } from "../../utils/shopRouting";

const BUYER_PROFILE_STORAGE_KEY = "mcl_buyer_profile_v1";
type SearchScope = "product" | "shop";

const normalizeCity = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizePostalCode = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

const tokenizeSearchText = (value: string) =>
  normalizeSearchText(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

function getLevenshteinDistance(a: string, b: string, maxDistance = Number.POSITIVE_INFINITY) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1];
    let rowMin = current[0];

    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      const nextValue = Math.min(
        previous[j + 1] + 1,
        current[j] + 1,
        previous[j] + cost
      );
      current.push(nextValue);
      rowMin = Math.min(rowMin, nextValue);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[b.length];
}

function tokenMatchesWord(token: string, word: string) {
  if (!token || !word) return false;
  if (word.includes(token) || token.includes(word)) return true;
  if (token.length < 4 || word.length < 4) return false;
  if (Math.abs(token.length - word.length) > 1) return false;
  return getLevenshteinDistance(token, word, 1) <= 1;
}

function matchesSearchTokens(tokens: string[], values: Array<string | undefined>) {
  if (tokens.length === 0) return true;

  const words = values
    .flatMap((value) => tokenizeSearchText(value ?? ""))
    .filter(Boolean);

  if (words.length === 0) return false;
  return tokens.every((token) => words.some((word) => tokenMatchesWord(token, word)));
}

function matchesPostalCodeFilter(filter: string, postalCode: string | undefined) {
  if (!filter) return true;
  const normalizedPostalCode = normalizePostalCode(postalCode);
  if (!normalizedPostalCode) return false;
  return normalizedPostalCode.startsWith(filter);
}

async function geocodeShop(shop: Shop): Promise<[number, number] | null> {
  const query = [shop.address?.trim(), shop.city?.trim()].filter(Boolean).join(" ");
  if (!query) return null;

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coords = payload.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

export function HomeScreenNext() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  const { location } = useLocation();
  const { totalItems } = useCart();
  const { user, isAuthenticated, switchRole, logout } = useAuth();
  const [view, setView] = useState<"map" | "list">("map");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [sponsoredAd, setSponsoredAd] = useState<SponsoredAd | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("product");
  const [postalCodeFilter, setPostalCodeFilter] = useState("");
  const [shopSort, setShopSort] = useState<"distance" | "reviews">("distance");
  const [filters, setFilters] = useState({
    openNow: false,
    pickupToday: false,
    sunday: false,
    delivery: false,
  });

  const [shops, setShops] = useState<Shop[]>([]);
  const [resolvedShops, setResolvedShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([location.lat, location.lng]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isResolvingShops, setIsResolvingShops] = useState(false);
  const [isSearchSettling, setIsSearchSettling] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isVisitorMenuOpen, setIsVisitorMenuOpen] = useState(false);
  const [buyerAvatarDataUrl, setBuyerAvatarDataUrl] = useState<string | null>(null);
  const searchTokens = useMemo(() => tokenizeSearchText(searchQuery), [searchQuery]);
  const normalizedPostalCodeFilter = useMemo(
    () => normalizePostalCode(postalCodeFilter).slice(0, 5),
    [postalCodeFilter]
  );
  const searchScopeLabel = searchScope === "product" ? "Produit" : "Boutique";
  const searchPlaceholder =
    searchScope === "product" ? "Rechercher un produit..." : "Rechercher une boutique...";
  const publicInfoLinks = [
    { label: "Comment ça marche", href: "/how-it-works" },
    { label: "À propos", href: "/about" },
    { label: "Mentions légales", href: "/legal" },
    { label: "Confidentialité", href: "/privacy" },
  ] as const;

  const toKmDistance = (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(toLat - fromLat);
    const dLng = toRad(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthKm * c;
  };

  const formatKmDistance = (km: number) => `${km < 1 ? "<1" : km.toFixed(1)} km`;

  useEffect(() => {
    setMapCenter([location.lat, location.lng]);
  }, [location.lat, location.lng]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const hasShopsWithoutCoords = shops.some((shop) => !Number.isFinite(shop.lat) || !Number.isFinite(shop.lng));
      if (!cancelled) setIsResolvingShops(hasShopsWithoutCoords);

      const nextShops = await Promise.all(
        shops.map(async (shop) => {
          if (Number.isFinite(shop.lat) && Number.isFinite(shop.lng)) {
            return shop;
          }

          const geocoded = await geocodeShop(shop);
          if (!geocoded) return shop;

          return {
            ...shop,
            lat: geocoded[0],
            lng: geocoded[1],
          };
        })
      );

      if (!cancelled) {
        setResolvedShops(nextShops);
        setIsResolvingShops(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [shops]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearchSettling(false);
      return;
    }

    setIsSearchSettling(true);
    const timer = window.setTimeout(() => setIsSearchSettling(false), 220);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;

    if (isVisitorMenuOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisitorMenuOpen]);

  const shopsWithDistance = useMemo(() => {
    const mapIsNearUser =
      toKmDistance(location.lat, location.lng, mapCenter[0], mapCenter[1]) <= 20;

    return resolvedShops.map((shop) => {
      const hasCoords = Number.isFinite(shop.lat) && Number.isFinite(shop.lng);
      const sameCity = normalizeCity(shop.city) === normalizeCity(location.cityName);

      if (!hasCoords && sameCity) {
        return {
          ...shop,
          lat: location.lat,
          lng: location.lng,
          distance: "<1 km",
          distanceKm: 0,
          mapDistanceKm: mapIsNearUser ? 0 : Number.POSITIVE_INFINITY,
        };
      }

      if (!hasCoords) {
        return {
          ...shop,
          distance: shop.city || "-",
          distanceKm: Number.POSITIVE_INFINITY,
          mapDistanceKm: Number.POSITIVE_INFINITY,
        };
      }
      const userKm = toKmDistance(location.lat, location.lng, shop.lat, shop.lng);
      const mapKm = toKmDistance(mapCenter[0], mapCenter[1], shop.lat, shop.lng);
      return {
        ...shop,
        distance: formatKmDistance(userKm),
        distanceKm: userKm,
        mapDistanceKm: mapKm,
      };
    });
  }, [resolvedShops, mapCenter, location.cityName, location.lat, location.lng]);

  const baseFilteredShops = useMemo(() => {
    return shopsWithDistance.filter((s) => {
      if (!matchesPostalCodeFilter(normalizedPostalCodeFilter, s.postalCode)) return false;
      if (!matchesCategoryFilter(s.category, activeCategory)) return false;
      if (filters.openNow && !s.isOpen) return false;
      if (filters.pickupToday && !s.pickupToday) return false;
      if (filters.sunday && !s.openSunday) return false;
      if (filters.delivery && !s.delivery) return false;
      return true;
    });
  }, [shopsWithDistance, normalizedPostalCodeFilter, activeCategory, filters]);

  const baseVisibleShopIds = useMemo(
    () => new Set(baseFilteredShops.map((shop) => shop.id)),
    [baseFilteredShops]
  );

  const filteredProductsBase = useMemo(() => {
    return products.filter((p) => {
      if (!baseVisibleShopIds.has(p.shopId)) return false;
      const productCategories = p.categories && p.categories.length > 0 ? p.categories : [p.category];
      if (!productCategories.some((categoryId) => matchesCategoryFilter(categoryId, activeCategory))) return false;
      if (filters.pickupToday && !p.availableToday) return false;
      if (filters.delivery && !p.delivery) return false;
      return true;
    });
  }, [products, baseVisibleShopIds, activeCategory, filters]);

  const productSearchMatchedShopIds = useMemo(() => {
    return new Set(
      filteredProductsBase
        .filter((product) =>
          matchesSearchTokens(searchTokens, [
            product.title,
            product.shopName,
            product.category,
            ...(product.categories ?? []),
            product.description,
          ])
        )
        .map((product) => product.shopId)
    );
  }, [filteredProductsBase, searchTokens]);

  const filteredShopsBase = useMemo(() => {
    if (searchTokens.length === 0) return baseFilteredShops;

    return baseFilteredShops.filter((shop) => {
      if (searchScope === "shop") {
        return matchesSearchTokens(searchTokens, [
          shop.name,
          shop.category,
          shop.city,
          shop.postalCode,
          shop.address,
          shop.description,
          shop.story,
        ]);
      }

      return productSearchMatchedShopIds.has(shop.id);
    });
  }, [baseFilteredShops, productSearchMatchedShopIds, searchScope, searchTokens]);

  const filteredShops = useMemo(() => {
    const sortedByMapZone = [...filteredShopsBase].sort((a, b) => {
      const aMapDistance =
        "mapDistanceKm" in a && typeof a.mapDistanceKm === "number"
          ? a.mapDistanceKm
          : Number.POSITIVE_INFINITY;
      const bMapDistance =
        "mapDistanceKm" in b && typeof b.mapDistanceKm === "number"
          ? b.mapDistanceKm
          : Number.POSITIVE_INFINITY;
      return aMapDistance - bMapDistance;
    });

    const nearby = sortedByMapZone.filter((shop) => {
      const mapDistanceKm =
        "mapDistanceKm" in shop && typeof shop.mapDistanceKm === "number"
          ? shop.mapDistanceKm
          : Number.POSITIVE_INFINITY;
      return mapDistanceKm <= 40;
    });

    const selected = nearby.length > 0 ? nearby : sortedByMapZone.slice(0, 24);

    return [...selected].sort((a, b) => {
      if (shopSort === "reviews") {
        if (a.rating !== b.rating) return b.rating - a.rating;
        if (a.reviewCount !== b.reviewCount) return b.reviewCount - a.reviewCount;
      }

      const aDistance =
        "distanceKm" in a && typeof a.distanceKm === "number"
          ? a.distanceKm
          : Number.POSITIVE_INFINITY;
      const bDistance =
        "distanceKm" in b && typeof b.distanceKm === "number"
          ? b.distanceKm
          : Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;

      if (shopSort === "distance") {
        if (a.reviewCount !== b.reviewCount) return b.reviewCount - a.reviewCount;
        if (a.rating !== b.rating) return b.rating - a.rating;
      }

      const aMapDistance =
        "mapDistanceKm" in a && typeof a.mapDistanceKm === "number"
          ? a.mapDistanceKm
          : Number.POSITIVE_INFINITY;
      const bMapDistance =
        "mapDistanceKm" in b && typeof b.mapDistanceKm === "number"
          ? b.mapDistanceKm
          : Number.POSITIVE_INFINITY;
      return aMapDistance - bMapDistance;
    });
  }, [filteredShopsBase, shopSort]);

  const renderShopSortButtons = () => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShopSort("distance")}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
          shopSort === "distance"
            ? "border-coral bg-coral text-white"
            : "border-border bg-white text-muted-foreground hover:border-coral/30"
        }`}
      >
        <MapPin className="w-3.5 h-3.5" />
        Distance
      </button>
      <button
        type="button"
        onClick={() => setShopSort("reviews")}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
          shopSort === "reviews"
            ? "border-coral bg-coral text-white"
            : "border-border bg-white text-muted-foreground hover:border-coral/30"
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${shopSort === "reviews" ? "fill-current" : ""}`} />
        Avis
      </button>
    </div>
  );

  const visibleShopIds = useMemo(
    () => new Set(filteredShops.map((shop) => shop.id)),
    [filteredShops]
  );
  const shopDistanceById = useMemo(
    () =>
      new Map(
        filteredShops.map((shop) => [
          shop.id,
          "distanceKm" in shop && typeof shop.distanceKm === "number" ? shop.distanceKm : Number.POSITIVE_INFINITY,
        ])
      ),
    [filteredShops]
  );
  const filteredProducts = useMemo(() => {
    return filteredProductsBase.filter((product) => {
      if (!visibleShopIds.has(product.shopId)) return false;
      if (searchTokens.length === 0 || searchScope === "shop") return true;

      return matchesSearchTokens(searchTokens, [
        product.title,
        product.shopName,
        product.category,
        ...(product.categories ?? []),
        product.description,
      ]);
    });
  }, [filteredProductsBase, visibleShopIds, searchTokens, searchScope]);

  // Recently added products sorted by addedAt descending
  const recentProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const distanceDelta =
        (shopDistanceById.get(a.shopId) ?? Number.POSITIVE_INFINITY) -
        (shopDistanceById.get(b.shopId) ?? Number.POSITIVE_INFINITY);
      if (distanceDelta !== 0) return distanceDelta;
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [filteredProducts, shopDistanceById]);

  const activeCat =
    CATEGORY_GROUPS_WITH_ALL.find((c) => c.id === activeCategory) ?? CATEGORY_GROUPS_WITH_ALL[0];
  const featuredCategories = CATEGORY_GROUPS_WITH_ALL.filter((cat) =>
    ["all", "alimentation", "artistique", "mode-beaute", "maison-jardin", "famille-loisirs"].includes(cat.id)
  );
  const isSearchLoading =
    searchQuery.trim().length > 0 &&
    (isCatalogLoading || isProductsLoading || isResolvingShops || isSearchSettling);
  const searchLoadingLabel =
    searchScope === "product" ? "Recherche des produits..." : "Recherche des boutiques...";
  const searchResultsSummary = `${filteredShops.length} boutiques · ${recentProducts.length} produits`;
  const mobileResultsSummary = searchQuery.trim()
    ? `${searchResultsSummary}${normalizedPostalCodeFilter ? ` · CP ${normalizedPostalCodeFilter}` : ""}`
    : `${filteredShops.length} boutiques trouvées${normalizedPostalCodeFilter ? ` · CP ${normalizedPostalCodeFilter}` : ""}`;
  const firstName = user?.firstName?.trim() || "Profil";
  const lastName = user?.lastName?.trim() || "";
  const profileInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || "P";
  const profileAvatarSrc = buyerAvatarDataUrl ?? user?.avatarUrl ?? null;
  const sellerButtonLabel = user?.shopName?.trim() || "Vendre";
  const sellerButtonInitial = sellerButtonLabel.charAt(0).toUpperCase() || "V";

  useEffect(() => {
    if (typeof window === "undefined" || !user?.id) {
      setBuyerAvatarDataUrl(null);
      return;
    }

    const storageKey = `${BUYER_PROFILE_STORAGE_KEY}:${user.id}`;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setBuyerAvatarDataUrl(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { avatarDataUrl?: string | null };
      setBuyerAvatarDataUrl(parsed.avatarDataUrl ?? null);
    } catch {
      window.localStorage.removeItem(storageKey);
      setBuyerAvatarDataUrl(null);
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const ad = await fetchSponsoredAd(location.cityName, "home_sidebar");
      if (!cancelled) {
        setSponsoredAd(ad);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.cityName]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setIsCatalogLoading(true);
        setLoadError(null);
        const nextShops = await fetchShops();
        if (cancelled) return;
        setShops(nextShops);
        setResolvedShops(nextShops);
      } catch (error) {
        if (cancelled) return;
        setShops([]);
        setResolvedShops([]);
        setProducts([]);
        setLoadError(error instanceof Error ? error.message : "Impossible de charger les boutiques et produits.");
      } finally {
        if (!cancelled) setIsCatalogLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setIsProductsLoading(true);
        const nextProducts = await fetchProducts({ limit: 24, lightweight: true });
        if (cancelled) return;
        setProducts(nextProducts);
      } catch {
        if (cancelled) return;
        setProducts([]);
      } finally {
        if (!cancelled) setIsProductsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sponsoredAd) return;
    void trackAdImpression({ ...sponsoredAd, city: location.cityName });
  }, [sponsoredAd, location.cityName]);

  const handleLogout = () => {
    const run = async () => {
      setIsLoggingOut(true);
      try {
        await logout();
        navigate("/home");
      } finally {
        setIsLoggingOut(false);
      }
    };
    void run();
  };

  const handleSellerAccess = () => {
    if (!isAuthenticated) {
      navigate("/auth?role=seller");
      return;
    }
    if (!user?.siretVerified) {
      navigate("/siret");
      return;
    }

    const run = async () => {
      if (user?.role !== "seller" && user?.roles.includes("seller")) {
        await switchRole("seller");
      }
      navigate("/dashboard");
    };

    void run();
  };

  const handleBuyerAccess = () => {
    if (!isAuthenticated) {
      navigate("/home");
      return;
    }

    const run = async () => {
      if (user?.role !== "buyer" && user?.roles.includes("buyer")) {
        await switchRole("buyer");
      }
      navigate("/home");
    };

    void run();
  };

  const handleProfileClick = () => {
    const run = async () => {
      if (!isAuthenticated) {
        navigate("/auth?next=/profile");
        return;
      }

      try {
        if (user?.role !== "buyer" && user?.roles.includes("buyer")) {
          await switchRole("buyer");
        }
        navigate("/profile");
      } catch {
        navigate("/auth?next=/profile");
      }
    };

    void run();
  };

  const mobileMenuSections = [
    {
      title: "Découvrir",
      items: [
        { label: "Explorer", href: "/home" },
        publicInfoLinks[0],
        { label: "Actualités", href: "/news" },
      ],
    },
    {
      title: "Informations",
      items: publicInfoLinks.slice(1),
    },
  ] as const;

  const openMobileMenuRoute = (path: string) => {
    setIsVisitorMenuOpen(false);
    navigate(path);
  };

  const handleMenuSellerAccess = () => {
    setIsVisitorMenuOpen(false);
    handleSellerAccess();
  };

  const handleMenuBuyerAccess = () => {
    setIsVisitorMenuOpen(false);
    handleBuyerAccess();
  };

  const handleMenuAuthAction = () => {
    setIsVisitorMenuOpen(false);
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    handleProfileClick();
  };

  const handleMenuLogout = () => {
    setIsVisitorMenuOpen(false);
    handleLogout();
  };

  const renderAccountMenuItems = () => (
    <>
      {isAuthenticated ? (
        <>
          <DropdownMenuItem onSelect={handleProfileClick} className="cursor-pointer rounded-lg px-3 py-2 text-sm">
            Mon profil
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleLogout}
            disabled={isLoggingOut}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm"
          >
            {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem
          onSelect={() => navigate("/auth")}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm"
        >
          Connexion / Inscription
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {publicInfoLinks.map((item) => (
        <DropdownMenuItem
          key={item.href}
          onSelect={() => navigate(item.href)}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm"
        >
          {item.label}
        </DropdownMenuItem>
      ))}
    </>
  );

  const renderSearchBar = (mobile = false) => (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl bg-input-background ${
        mobile ? "min-h-12" : "min-h-12"
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex items-center gap-2 border-r border-border/80 bg-input-background px-4 text-sm text-foreground transition-colors hover:bg-muted ${
              mobile ? "min-w-[104px]" : "min-w-[124px]"
            }`}
            aria-label="Choisir le type de recherche"
          >
            <span className="truncate">{searchScopeLabel}</span>
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px] rounded-xl border-border p-1.5">
          <DropdownMenuItem
            onSelect={() => setSearchScope("product")}
            className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${
              searchScope === "product" ? "bg-coral-light text-coral" : ""
            }`}
          >
              Produit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setSearchScope("shop")}
            className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${
              searchScope === "shop" ? "bg-coral-light text-coral" : ""
            }`}
          >
              Boutique
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5">
        <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <input
          suppressHydrationWarning
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent leading-tight outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16 lg:pb-0">
      {loadError && (
        <div className="px-4 pt-4 lg:px-8">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        </div>
      )}
      {/* Desktop nav */}
      <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white border-b border-border">
        <Logo size="lg" href="/home" />
        <div className="flex-1 max-w-xl mx-8">
          {renderSearchBar()}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/location")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MapPin className="w-4 h-4 text-coral" />
            <span>{location.cityName}</span>
          </button>
          <button
            onClick={() => navigate("/cart")}
            className="text-muted-foreground hover:text-foreground relative"
          >
            🛒
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/news")}
            className="text-muted-foreground hover:text-foreground"
            title="Fil d'actualités"
          >
            <Newspaper className="w-5 h-5" />
          </button>
          <Button size="sm" variant="outline" onClick={() => navigate("/news")}>
            Actualités
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSellerAccess}
          >
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-coral-light text-coral text-xs">
                {sellerButtonInitial}
              </span>
              <span className="max-w-[110px] truncate">
                {sellerButtonLabel}
              </span>
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isAuthenticated ? (
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white pl-1.5 pr-3 text-foreground transition-colors hover:bg-muted"
                  aria-label="Ouvrir le menu du compte"
                >
                  <span className="inline-flex h-7 w-7 overflow-hidden rounded-full">
                    {profileAvatarSrc ? (
                      <img
                        src={profileAvatarSrc}
                        alt="Mon profil"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-full w-full items-center justify-center bg-coral-light text-coral text-xs font-semibold">
                        {profileInitials}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <Button size="sm" variant="outline" className="inline-flex items-center gap-2">
                  Connexion
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl border-border p-1.5">
              {renderAccountMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Mobile Header ─── */}
      <div className="lg:hidden bg-white pb-2 shadow-sm">
        {/* Row 1: Logo + action icons */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Logo size="md" href="/home" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/cart")}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsVisitorMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-5 h-5 text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search */}
        <div className="flex items-center gap-2 px-4 mb-2">
          <div className="flex-1">{renderSearchBar(true)}</div>
        </div>

        {/* Row 3: Location */}
        <div className="flex items-center gap-1.5 px-4 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-coral flex-shrink-0" />
          <span className="truncate">{location.cityName}</span>
          <button
            onClick={() => navigate("/location")}
            className="text-bleu ml-1 flex-shrink-0"
          >
            Modifier
          </button>
        </div>
      </div>

      {isVisitorMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Logo size="md" href="/home" />
            <button
              type="button"
              onClick={() => setIsVisitorMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          <div className="overflow-y-auto px-0 pb-8 pt-2">
            <section className="border-b border-border px-6 py-5">
              <div className="space-y-3">
                <Button fullWidth onClick={handleMenuSellerAccess}>
                  Vendre
                </Button>
                <Button fullWidth variant="outline" onClick={handleMenuBuyerAccess}>
                  Acheter
                </Button>
                {!isAuthenticated ? (
                  <Button fullWidth variant="outline" onClick={handleMenuAuthAction}>
                    Inscription | Connexion
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button fullWidth variant="outline" onClick={handleMenuAuthAction}>
                      Mon profil
                    </Button>
                    <Button
                      fullWidth
                      variant="ghost"
                      onClick={handleMenuLogout}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {mobileMenuSections.map((section) => (
              <section key={section.title} className="border-b border-border">
                <p className="px-6 pt-5 pb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {section.title}
                </p>
                <div className="pb-3">
                  {section.items.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => openMobileMenuRoute(item.href)}
                      className="flex w-full items-center justify-between px-6 py-4 text-left text-lg text-foreground transition-colors hover:bg-muted"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}

          </div>
        </div>
      )}

      {/* ─── Category selector + Filter bar ─── */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border-b border-border">
        <button
          onClick={() => setShowCategories(true)}
          className="flex-1 flex items-center gap-2 bg-input-background rounded-xl px-3.5 py-2.5 text-sm text-left"
        >
          <CategoryIcon icon={activeCat.icon} className="text-base w-5 h-5" />
          <span className="flex-1 truncate">
            {activeCat.id === "all"
              ? "Toutes les idées cadeaux"
              : activeCat.label}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-1.5 bg-coral text-white rounded-xl px-4 py-2.5 text-sm flex-shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtrer
        </button>
      </div>

      {/* Desktop categories */}
      <div className="hidden lg:block px-8 py-3 bg-white border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          {featuredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
                activeCategory === cat.id
                  ? "border-coral bg-coral text-white shadow-sm"
                  : "border-border bg-white text-foreground hover:border-coral/30"
              }`}
            >
              <CategoryIcon
                icon={cat.icon}
                className={`w-4 h-4 ${activeCategory === cat.id ? "" : "text-base"}`}
              />
              <span>
                {cat.id === "all" ? "Toutes les idées cadeaux" : cat.label}
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowCategories(true)}
            className="rounded-xl border border-border bg-input-background px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            + Categories
          </button>
        </div>
      </div>

      {/* Quick filters (desktop) */}
      <div className="hidden lg:flex items-center gap-2 px-8 py-3 bg-background">
        {searchQuery.trim() && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm text-muted-foreground border border-border">
            {isSearchLoading ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin text-coral" />
                {searchLoadingLabel}
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-coral" />
                {searchResultsSummary}
              </>
            )}
          </div>
        )}
        <div className="w-[170px]">
          <Input
            placeholder="Code postal"
            value={postalCodeFilter}
            onChange={(value) => setPostalCodeFilter(normalizePostalCode(value).slice(0, 5))}
            icon={<MapPin className="w-4 h-4" />}
            className="min-h-11 rounded-full border border-border bg-white px-3 py-2"
          />
        </div>
        <Chip
          active={filters.openNow}
          onClick={() => setFilters({ ...filters, openNow: !filters.openNow })}
          icon={<Clock className="w-3.5 h-3.5" />}
        >
          Ouvert maintenant
        </Chip>
        <Chip
          active={filters.pickupToday}
          onClick={() =>
            setFilters({ ...filters, pickupToday: !filters.pickupToday })
          }
          icon={<CalendarCheck className="w-3.5 h-3.5" />}
        >
          Retrait aujourd'hui
        </Chip>
        <Chip
          active={filters.sunday}
          onClick={() => setFilters({ ...filters, sunday: !filters.sunday })}
        >
          Dimanche / JF
        </Chip>
        <Chip
          active={filters.delivery}
          onClick={() =>
            setFilters({ ...filters, delivery: !filters.delivery })
          }
          icon={<Truck className="w-3.5 h-3.5" />}
        >
          Livraison
        </Chip>
      </div>

      {/* View toggle (mobile) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          {isSearchLoading
            ? "Recherche en cours..."
            : mobileResultsSummary}
        </p>
        {searchQuery.trim() && isSearchLoading && (
          <LoaderCircle className="w-4 h-4 animate-spin text-coral flex-shrink-0" />
        )}
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
              view === "map" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Carte
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
              view === "list" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Desktop layout */}
        <div className="hidden lg:block px-8 py-4">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl overflow-hidden border border-border relative">
                <div className="h-[calc(100vh-340px)] min-h-[420px]">
                  <ShopMap
                    shops={filteredShops}
                    onShopClick={(shop) => navigate(getShopHref(shop))}
                    center={mapCenter}
                    userLocation={[location.lat, location.lng]}
                    cityLabel={location.cityName}
                    onCenterChange={setMapCenter}
                  />
                </div>
              </div>
            </div>

            {/* Right sidebar: shops */}
            <div className="w-[420px] flex-shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-340px)]">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h3>Boutiques à proximité</h3>
                {renderShopSortButtons()}
              </div>
              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  {...shop}
                  onClick={() => navigate(getShopHref(shop))}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-coral" />
                <h3>Derniers produits ajoutes pres de {location.cityName}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {recentProducts.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    onClick={() =>
                      navigate(
                        getProductHref({
                          id: product.id,
                          shopSlug: product.shopSlug,
                          shopName: product.shopName,
                        })
                      )
                    }
                  />
                ))}
              </div>
            </div>

            {/* Ad slot below the map, next to recent products */}
            <div className="w-[420px] flex-shrink-0">
              {sponsoredAd && (
                <SponsoredCard
                  ad={{ ...sponsoredAd, city: location.cityName }}
                  onClick={() => {
                    void trackAdClick({ ...sponsoredAd, city: location.cityName });

                    if (sponsoredAd.targetUrl?.startsWith("/")) {
                      navigate(sponsoredAd.targetUrl);
                      return;
                    }

                    if (sponsoredAd.targetUrl) {
                      window.open(sponsoredAd.targetUrl, "_blank", "noopener,noreferrer");
                      return;
                    }

                    if (sponsoredAd.shopId) {
                      const adShop = shops.find((shop) => shop.id === sponsoredAd.shopId);
                      if (adShop) {
                        navigate(getShopHref(adShop));
                        return;
                      }
                      navigate(`/shop/${sponsoredAd.shopId}`);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden pb-16">
          {/* Map view */}
          {view === "map" && (
            <>
              <div className="h-56 relative">
                <ShopMap
                  shops={filteredShops}
                  onShopClick={(shop) => navigate(getShopHref(shop))}
                  center={mapCenter}
                  userLocation={[location.lat, location.lng]}
                  cityLabel={location.cityName}
                  onCenterChange={setMapCenter}
                />
              </div>

              {/* Scrollable content below the map */}
              <div className="px-4 py-4 space-y-5">
                {/* Horizontal shops preview */}
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3>Boutiques à proximité</h3>
                    {renderShopSortButtons()}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                    {filteredShops.map((shop) => (
                      <div
                        key={shop.id}
                        className="min-w-[280px] snap-start"
                      >
                        <ShopCard
                          {...shop}
                          onClick={() => navigate(getShopHref(shop))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recently added products */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-coral" />
                    <h3>Récemment ajoutés</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {recentProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        {...product}
                        onClick={() =>
                          navigate(
                            getProductHref({
                              id: product.id,
                              shopSlug: product.shopSlug,
                              shopName: product.shopName,
                            })
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* List view */}
          {view === "list" && (
            <div className="px-4 py-3 space-y-3 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h3>Boutiques à proximité</h3>
                {renderShopSortButtons()}
              </div>
              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  {...shop}
                  onClick={() => navigate(getShopHref(shop))}
                />
              ))}

              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-coral" />
                  <h3>Récemment ajoutés</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recentProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      onClick={() =>
                        navigate(
                          getProductHref({
                            id: product.id,
                            shopSlug: product.shopSlug,
                            shopName: product.shopName,
                          })
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="hidden border-t border-border bg-white lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-5 text-sm text-muted-foreground">
          <p>MonCadeauLocal</p>
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
            {publicInfoLinks.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
      {/* Category picker bottom sheet (mobile) */}
      <BottomSheet
        isOpen={showCategories}
        onClose={() => setShowCategories(false)}
        title="Catégories"
      >
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_GROUPS_WITH_ALL.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setShowCategories(false);
              }}
              className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-left transition-all ${
                activeCategory === cat.id
                  ? "bg-coral/10 text-coral border border-coral/30"
                  : "bg-input-background text-foreground hover:bg-muted border border-transparent"
              }`}
            >
              <CategoryIcon icon={cat.icon} className="text-lg w-5 h-5" />
              <span className="flex-1 leading-tight">
                {cat.id === "all"
                  ? "Toutes les idées cadeaux"
                  : cat.label}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {CATEGORY_GROUPS.map((group) => (
            <section key={group.id}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.children.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowCategories(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-left transition-all ${
                      activeCategory === cat.id
                        ? "bg-coral/10 text-coral border border-coral/30"
                        : "bg-input-background text-foreground hover:bg-muted border border-transparent"
                    }`}
                  >
                    <CategoryIcon icon={cat.icon} className="text-lg w-5 h-5" />
                    <span className="flex-1 leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </BottomSheet>

      {/* Filter bottom sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filtres"
      >
        <div className="space-y-4">
          <div>
            <h4 className="mb-3">Code postal</h4>
            <Input
              placeholder="Ex. 75011 ou 75"
              value={postalCodeFilter}
              onChange={(value) => setPostalCodeFilter(normalizePostalCode(value).slice(0, 5))}
              icon={<MapPin className="w-4 h-4" />}
              className="min-h-12"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Le filtre accepte aussi un préfixe, par exemple `75` pour Paris.
            </p>
          </div>
          {[
            { key: "openNow" as const, label: "Ouvert maintenant", icon: <Clock className="w-4 h-4" /> },
            { key: "pickupToday" as const, label: "Retrait aujourd'hui", icon: <CalendarCheck className="w-4 h-4" /> },
            { key: "sunday" as const, label: "Ouvert dimanche / jours fériés", icon: <span>📅</span> },
            { key: "delivery" as const, label: "Livraison disponible", icon: <Truck className="w-4 h-4" /> },
          ].map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between py-2 cursor-pointer"
            >
              <span className="flex items-center gap-3">
                {f.icon}
                {f.label}
              </span>
              <div
                onClick={() =>
                  setFilters({ ...filters, [f.key]: !filters[f.key] })
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  filters[f.key] ? "bg-coral" : "bg-switch-background"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${
                    filters[f.key] ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </div>
            </label>
          ))}

          <div className="pt-4">
            <h4 className="mb-3">Fourchette de prix</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-input-background rounded-xl px-3 py-2 text-sm">
                Min €
              </div>
              <span className="text-muted-foreground">—</span>
              <div className="flex-1 bg-input-background rounded-xl px-3 py-2 text-sm">
                Max €
              </div>
            </div>
          </div>

          <div className="pt-4">
            <h4 className="mb-3">Distance max</h4>
            <div className="flex gap-2">
              {["500m", "1km", "2km", "5km", "10km"].map((d) => (
                <Chip key={d}>{d}</Chip>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() =>
                setFilters({
                  openNow: false,
                  pickupToday: false,
                  sunday: false,
                  delivery: false,
                })
              }
            >
              Réinitialiser
            </Button>
            <Button fullWidth onClick={() => setShowFilters(false)}>
              Appliquer
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
