"use client";

import { useEffect, useRef } from "react";
import type { Shop } from "../types/catalog";

interface ShopMapProps {
  shops: Shop[];
  onShopClick: (shopId: string) => void;
  className?: string;
  center?: [number, number];
  cityLabel?: string;
}

const CENTER: [number, number] = [49.8941, 2.2958];

function createShopIcon(L: any, isOpen: boolean) {
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

function createUserIcon(L: any) {
  return L.divIcon({
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
}

export function ShopMap({ shops, onShopClick, className = "", center, cityLabel }: ShopMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const onShopClickRef = useRef(onShopClick);
  onShopClickRef.current = onShopClick;

  const mapCenter = center ?? CENTER;
  const centerLat = mapCenter[0];
  const centerLng = mapCenter[1];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const run = async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: mapCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      const userMarker = L.marker(mapCenter, { icon: createUserIcon(L) })
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

      containerRef.current.addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest("[data-shop-id]") as HTMLElement | null;
        if (!target) return;
        const shopId = target.getAttribute("data-shop-id");
        if (shopId) onShopClickRef.current(shopId);
      });

      setTimeout(() => map.invalidateSize(), 200);

      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(containerRef.current);
    };

    void run();

    return () => {
      cancelled = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

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

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const markersGroup = markersRef.current;
    if (!L || !map || !markersGroup) return;

    markersGroup.clearLayers();
    if (shops.length === 0) return;

    shops.forEach((shop) => {
      const marker = L.marker([shop.lat, shop.lng], {
        icon: createShopIcon(L, shop.isOpen),
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
      marker.on("click", () => marker.openPopup());
      marker.on("popupopen", () => {
        const popupEl = marker.getPopup()?.getElement();
        const clickTarget = popupEl?.querySelector("[data-shop-id]") as HTMLElement | null;
        if (clickTarget) {
          clickTarget.onclick = () => onShopClickRef.current(shop.id);
        }
      });

      markersGroup.addLayer(marker);
    });

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
