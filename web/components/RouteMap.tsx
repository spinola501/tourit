"use client";

import { useEffect, useRef } from "react";
// Type-only import — erased at compile time, so Turbopack never tries to
// resolve the `leaflet` npm package during the build (which fails on Vercel
// because node_modules lives in web/, not the repo root). Leaflet itself is
// loaded at runtime from a CDN; see the init effect below.
import type * as LType from "leaflet";

declare global {
  interface Window {
    L?: typeof LType;
  }
}

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.min.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.min.css";

export type MapStop = { id: string; name: string; lat: number; lng: number };

export default function RouteMap({
  stops,
  color = "#3B82F6",
}: {
  stops: MapStop[];
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const overlayRef = useRef<LType.LayerGroup | null>(null);

  // Initialize map once (loading leaflet from CDN)
  useEffect(() => {
    if (!containerRef.current) return;

    if (!document.querySelector("[data-leaflet-css]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.setAttribute("data-leaflet-css", "");
      document.head.appendChild(link);
    }

    function initMap(L: typeof LType) {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>')
        .addTo(map);

      overlayRef.current = L.layerGroup().addTo(map);
      map.setView([48.85, 2.35], 13);

      // Trigger the redraw effect now that the map exists.
      redraw();
    }

    if (window.L) {
      initMap(window.L);
    } else {
      let script = document.querySelector<HTMLScriptElement>("[data-leaflet-js]");
      if (!script) {
        script = document.createElement("script");
        script.src = LEAFLET_JS;
        script.setAttribute("data-leaflet-js", "");
        document.body.appendChild(script);
      }
      const onLoad = () => {
        if (window.L) initMap(window.L);
      };
      if (window.L) {
        onLoad();
      } else {
        script.addEventListener("load", onLoad);
      }
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw stops whenever they change
  function redraw() {
    const L = window.L;
    const overlay = overlayRef.current;
    const map = mapRef.current;
    if (!L || !overlay || !map) return;

    overlay.clearLayers();
    if (stops.length === 0) return;

    if (stops.length > 1) {
      const latlngs = stops.map((s) => [s.lat, s.lng] as [number, number]);
      L.polyline(latlngs, { color, weight: 3, opacity: 0.85, dashArray: "7,5" }).addTo(overlay);
    }

    stops.forEach((stop, i) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)">${i + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13],
      });
      L.marker([stop.lat, stop.lng], { icon })
        .bindPopup(`<b>${stop.name}</b>`)
        .addTo(overlay);
    });

    if (stops.length === 1) {
      map.setView([stops[0].lat, stops[0].lng], 15);
    } else {
      const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, color]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
