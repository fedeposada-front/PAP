import { useEffect, useRef } from "react";
import * as L from "leaflet";
import type { Shop } from "../data/mock-data";

function createShopIcon(isOpen: boolean) {
  const color = isOpen ? "#EB7276" : "#9ca3af";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg style="transform: rotate(45deg); width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

const userIcon = L.divIcon({
  className: "user-marker",
  html: `<div style="position:relative;">
    <div style="
      width: 18px; height: 18px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(59,130,246,0.5);
    "></div>
    <div style="
      position: absolute; top: -6px; left: -6px;
      width: 30px; height: 30px;
      background: rgba(59,130,246,0.15);
      border-radius: 50%;
      animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
    "></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface ShopMapProps {
  shops: Shop[];
  onShopClick: (shopId: string) => void;
  className?: string;
  center?: [number, number];
  cityLabel?: string;
}

const CENTER: L.LatLngTuple = [49.8941, 2.2958];

export function ShopMap({ shops, onShopClick, className = "", center, cityLabel }: ShopMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onShopClickRef = useRef(onShopClick);
  onShopClickRef.current = onShopClick;

  const mapCenter: L.LatLngTuple = center ?? CENTER;
  const centerLat = mapCenter[0];
  const centerLng = mapCenter[1];

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }
    ).addTo(map);

    // User position marker
    const userMarker = L.marker(mapCenter, { icon: userIcon })
      .addTo(map)
      .bindPopup(
        `<div style="text-align:center;padding:2px 4px;">
          <strong>Vous êtes ici</strong><br/>
          <span style="font-size:12px;color:#6b7280;">${cityLabel ?? "Amiens"}</span>
        </div>`
      );
    userMarkerRef.current = userMarker;

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Event delegation: handle clicks on shop popups via the map container
    containerRef.current.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest("[data-shop-id]") as HTMLElement | null;
      if (target) {
        const shopId = target.getAttribute("data-shop-id");
        if (shopId) {
          onShopClickRef.current(shopId);
        }
      }
    });

    // Invalidate size after render + on resize so tiles load correctly
    setTimeout(() => map.invalidateSize(), 200);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update center when location changes
  useEffect(() => {
    const map = mapRef.current;
    const userMarker = userMarkerRef.current;
    if (!map || !userMarker) return;

    map.setView(mapCenter, 14);
    userMarker.setLatLng(mapCenter);
    userMarker.setPopupContent(
      `<div style="text-align:center;padding:2px 4px;">
        <strong>Vous êtes ici</strong><br/>
        <span style="font-size:12px;color:#6b7280;">${cityLabel ?? "Amiens"}</span>
      </div>`
    );
  }, [centerLat, centerLng, cityLabel]);

  // Update shop markers when shops change
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (shops.length === 0) return;

    shops.forEach((shop) => {
      const marker = L.marker([shop.lat, shop.lng], {
        icon: createShopIcon(shop.isOpen),
      });

      const popupContent = `
        <div style="min-width:180px;cursor:pointer;padding:2px;" data-shop-id="${shop.id}">
          <div style="display:flex;gap:8px;align-items:center;">
            <img src="${shop.image}" alt="${shop.name}"
              style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />
            <div>
              <strong style="font-size:13px;display:block;">${shop.name}</strong>
              <span style="font-size:11px;color:#6b7280;">
                ${shop.distance} · ⭐ ${shop.rating}
              </span><br/>
              <span style="font-size:11px;color:${shop.isOpen ? "#2E7D32" : "#9ca3af"};font-weight:600;">
                ${shop.isOpen ? "Ouvert" : "Fermé"}${shop.pickupToday ? " · Retrait dispo" : ""}
              </span>
            </div>
          </div>
        </div>`;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        marker.openPopup();
      });

      marker.on("popupopen", () => {
        const popupEl = marker.getPopup()?.getElement();
        const clickTarget = popupEl?.querySelector(
          "[data-shop-id]"
        ) as HTMLElement | null;
        if (clickTarget) {
          clickTarget.onclick = () => {
            onShopClickRef.current(shop.id);
          };
        }
      });

      markersGroup.addLayer(marker);
    });

    // Always keep the map centered on the user's selected city
    // Nearby shops will appear as markers around that center
    map.setView(mapCenter, 14);
  }, [shops, centerLat, centerLng]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", minHeight: "300px" }}
    />
  );
}
