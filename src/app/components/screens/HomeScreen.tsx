import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Map as MapIcon,
  List,
  Clock,
  Truck,
  CalendarCheck,
  Sparkles,
  ShoppingBag,
  Bell,
  ChevronDown,
} from "lucide-react";
import {
  Input,
  Chip,
  ShopCard,
  ProductCard,
  BottomNav,
  BottomSheet,
  Button,
  Logo,
} from "../ds";
import { CATEGORIES, SHOPS, PRODUCTS } from "../../data/mock-data";
import { ShopMap } from "../ShopMap";
import { useLocation } from "../LocationContext";

export function HomeScreen() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const [view, setView] = useState<"map" | "list">("map");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [filters, setFilters] = useState({
    openNow: false,
    pickupToday: false,
    sunday: false,
    delivery: false,
  });

  const filteredShops = SHOPS.filter((s) => {
    if (activeCategory !== "all" && s.category !== activeCategory) return false;
    if (filters.openNow && !s.isOpen) return false;
    if (filters.pickupToday && !s.pickupToday) return false;
    if (filters.sunday && !s.openSunday) return false;
    if (filters.delivery && !s.delivery) return false;
    return true;
  });

  const filteredProducts = PRODUCTS.filter((p) => {
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (filters.pickupToday && !p.availableToday) return false;
    if (filters.delivery && !p.delivery) return false;
    return true;
  });

  // Recently added products sorted by addedAt descending
  const recentProducts = useMemo(() => {
    return [...filteredProducts].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }, [filteredProducts]);

  const mapCenter: [number, number] = [location.lat, location.lng];

  const activeCat =
    CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop nav */}
      <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white border-b border-border">
        <Logo size="sm" />
        <div className="flex-1 max-w-xl mx-8">
          <Input
            placeholder="Rechercher un cadeau, une boutique..."
            icon={<Search className="w-4 h-4" />}
          />
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
            <span className="absolute -top-1 -right-2 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center">
              2
            </span>
          </button>
          <button
            onClick={() => navigate("/messages")}
            className="text-muted-foreground hover:text-foreground"
          >
            💬
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/auth")}
          >
            Vendre
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")}>
            Connexion
          </Button>
        </div>
      </header>

      {/* ─── Mobile Header ─── */}
      <div className="lg:hidden bg-white pb-2 shadow-sm">
        {/* Row 1: Logo + action icons */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/cart")}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center">
                2
              </span>
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <Bell className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Row 2: Search */}
        <div className="flex items-center gap-2 px-4 mb-2">
          <div className="flex-1">
            <Input
              placeholder="Rechercher un cadeau..."
              icon={<Search className="w-4 h-4" />}
            />
          </div>
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

      {/* ─── Category selector + Filter bar ─── */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border-b border-border">
        <button
          onClick={() => setShowCategories(true)}
          className="flex-1 flex items-center gap-2 bg-input-background rounded-xl px-3.5 py-2.5 text-sm text-left"
        >
          <span className="text-base">{activeCat.icon}</span>
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

      {/* Desktop categories (horizontal chips) */}
      <div className="hidden lg:block px-4 py-2.5 overflow-x-auto bg-white lg:px-8 border-b border-border">
        <div className="flex gap-2 min-w-max">
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              icon={<span className="text-sm">{cat.icon}</span>}
            >
              {cat.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Quick filters (desktop) */}
      <div className="hidden lg:flex items-center gap-2 px-8 py-3 bg-background">
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
          {filteredShops.length} boutiques trouvées
        </p>
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
        {/* Desktop: side-by-side layout */}
        <div className="hidden lg:flex px-8 py-4 gap-6">
          {/* Map (left) */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-border relative">
            <div className="h-[calc(100vh-260px)] min-h-[400px]">
              <ShopMap
                shops={filteredShops}
                onShopClick={(id) => navigate(`/shop/${id}`)}
                center={mapCenter}
                cityLabel={location.cityName}
              />
            </div>
          </div>

          {/* Right sidebar: shops + recent products */}
          <div className="w-[420px] flex-shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-260px)]">
            <h3 className="mb-1">Boutiques à proximité</h3>
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                {...shop}
                onClick={() => navigate(`/shop/${shop.id}`)}
              />
            ))}

            {/* Recently added products */}
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-coral" />
                <h3>Récemment ajoutés</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {recentProducts.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                ))}
              </div>
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
                  onShopClick={(id) => navigate(`/shop/${id}`)}
                  center={mapCenter}
                  cityLabel={location.cityName}
                />
              </div>

              {/* Scrollable content below the map */}
              <div className="px-4 py-4 space-y-5">
                {/* Horizontal shops preview */}
                <div>
                  <h3 className="mb-3">Boutiques à proximité</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                    {filteredShops.map((shop) => (
                      <div
                        key={shop.id}
                        className="min-w-[280px] snap-start"
                      >
                        <ShopCard
                          {...shop}
                          onClick={() => navigate(`/shop/${shop.id}`)}
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
                        onClick={() => navigate(`/product/${product.id}`)}
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
              <h3>Boutiques à proximité</h3>
              {filteredShops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  {...shop}
                  onClick={() => navigate(`/shop/${shop.id}`)}
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
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav active="home" onNavigate={(tab) => {
        if (tab === "cart") navigate("/cart");
        if (tab === "profile") navigate("/auth");
        if (tab === "messages") navigate("/messages");
      }} />

      {/* Category picker bottom sheet (mobile) */}
      <BottomSheet
        isOpen={showCategories}
        onClose={() => setShowCategories(false)}
        title="Catégories"
      >
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
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
              <span className="text-lg">{cat.icon}</span>
              <span className="flex-1 leading-tight">
                {cat.id === "all"
                  ? "Toutes les idées cadeaux"
                  : cat.label}
              </span>
            </button>
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