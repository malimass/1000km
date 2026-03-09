import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  coords: [number, number][];
  waypoints?: { lat: number; lng: number; label: string }[];
  elevationPoints?: { lat: number; lng: number; elevation: number }[];
}

export default function RouteMap3D({ coords, waypoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const coordsKey = useMemo(() => JSON.stringify(coords), [coords]);
  const waypointsKey = useMemo(() => JSON.stringify(waypoints), [waypoints]);
  const stableCoords = useMemo(() => coords, [coordsKey]);
  const stableWaypoints = useMemo(() => waypoints, [waypointsKey]);

  useEffect(() => {
    if (!containerRef.current || stableCoords.length < 2) return;

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of stableCoords) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "satellite-tiles": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
          "hillshade-dem": {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            maxzoom: 14,
            encoding: "terrarium",
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite-tiles",
          },
          {
            id: "hillshade",
            type: "hillshade",
            source: "hillshade-dem",
            paint: {
              "hillshade-exaggeration": 0.6,
              "hillshade-shadow-color": "#000000",
              "hillshade-highlight-color": "#ffffff",
            },
          },
        ],
        // NO terrain — lines render correctly without 3D terrain
      },
      center: [centerLng, centerLat],
      zoom: 7,
      pitch: 55,
      bearing: -15,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      const routeCoords = stableCoords.map(([lat, lng]) => [lng, lat]);

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeCoords,
          },
        },
      });

      // Route glow (outer)
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#e11d48",
          "line-width": 10,
          "line-opacity": 0.35,
          "line-blur": 6,
        },
      });

      // Route line (inner)
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": 3.5,
          "line-opacity": 0.95,
        },
      });

      // Waypoint markers
      if (stableWaypoints?.length) {
        for (const wp of stableWaypoints) {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 14px; height: 14px;
            background: #f97316;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          `;
          new maplibregl.Marker({ element: el })
            .setLngLat([wp.lng, wp.lat])
            .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
              `<div style="font-size:12px;font-family:sans-serif"><strong>${wp.label}</strong></div>`
            ))
            .addTo(map);
        }
      }

      // Fit bounds
      const bounds = new maplibregl.LngLatBounds();
      for (const [lat, lng] of stableCoords) {
        bounds.extend([lng, lat]);
      }
      map.fitBounds(bounds, { padding: 60, pitch: 55, bearing: -15 });
    });

    map.on("error", (e) => {
      // Suppress DEM tile 404s at high zoom — tiles only go to z14
      const msg = e?.error?.message ?? "";
      if (msg.includes("elevation-tiles-prod") || msg.includes("404")) return;
      console.warn("[RouteMap3D]", e);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordsKey, waypointsKey]);

  useEffect(() => {
    setTimeout(() => mapRef.current?.resize(), 100);
  }, [isFullscreen]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden shadow-lg border border-border ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : ""}`}
      style={isFullscreen ? { height: "100vh" } : { height: "min(480px, 70vw)" }}
    >
      <button
        onClick={() => setIsFullscreen(prev => !prev)}
        className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white active:bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 min-h-[44px] min-w-[44px] text-xs font-medium shadow-md transition-colors"
        title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
      >
        {isFullscreen ? "✕ Esci" : "⛶ Schermo intero"}
      </button>
      <div className="absolute bottom-3 left-3 z-[1000] bg-black/60 text-white text-xs px-2 py-1 rounded font-body">
        Trascina per ruotare · Scroll per zoom · Ctrl+drag per inclinare
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
