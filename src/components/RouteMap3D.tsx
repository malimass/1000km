import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  coords: [number, number][];
  waypoints?: { lat: number; lng: number; label: string }[];
  elevationPoints?: { lat: number; lng: number; elevation: number }[];
}

export default function RouteMap3D({ coords, waypoints, elevationPoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stabilize props to prevent continuous re-renders
  const coordsKey = useMemo(() => JSON.stringify(coords), [coords]);
  const waypointsKey = useMemo(() => JSON.stringify(waypoints), [waypoints]);
  const elevKey = useMemo(() => elevationPoints?.length ?? 0, [elevationPoints]);
  const stableCoords = useMemo(() => coords, [coordsKey]);
  const stableWaypoints = useMemo(() => waypoints, [waypointsKey]);
  const stableElevation = useMemo(() => elevationPoints, [elevKey]);

  // Build 3D coordinates [lng, lat, elevation] by interpolating elevation data
  const coords3D = useMemo(() => {
    if (!stableElevation?.length || stableCoords.length < 2) {
      return stableCoords.map(([lat, lng]) => [lng, lat, 0] as [number, number, number]);
    }

    // Build a lookup: for each elevation point, find the nearest coord index
    const elevMap = new Map<number, number>(); // coordIndex → elevation
    for (const ep of stableElevation) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < stableCoords.length; i++) {
        const dlat = stableCoords[i][0] - ep.lat;
        const dlng = stableCoords[i][1] - ep.lng;
        const d = dlat * dlat + dlng * dlng;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      elevMap.set(bestIdx, ep.elevation);
    }

    // Sorted indices that have elevation
    const knownIndices = [...elevMap.keys()].sort((a, b) => a - b);
    if (knownIndices.length < 2) {
      const fallbackElev = stableElevation[0]?.elevation ?? 100;
      return stableCoords.map(([lat, lng]) => [lng, lat, fallbackElev + 50] as [number, number, number]);
    }

    // Interpolate elevation for all coords
    return stableCoords.map(([lat, lng], i) => {
      if (elevMap.has(i)) return [lng, lat, elevMap.get(i)! + 50] as [number, number, number];

      // Find surrounding known indices and lerp
      let lo = knownIndices[0], hi = knownIndices[knownIndices.length - 1];
      for (let k = 0; k < knownIndices.length - 1; k++) {
        if (knownIndices[k] <= i && knownIndices[k + 1] >= i) {
          lo = knownIndices[k];
          hi = knownIndices[k + 1];
          break;
        }
      }
      if (lo === hi) return [lng, lat, elevMap.get(lo)! + 50] as [number, number, number];
      const t = (i - lo) / (hi - lo);
      const elev = elevMap.get(lo)! * (1 - t) + elevMap.get(hi)! * t;
      return [lng, lat, elev + 50] as [number, number, number];
    });
  }, [stableCoords, stableElevation]);

  useEffect(() => {
    if (!containerRef.current || stableCoords.length < 2) return;

    // Calculate center and bounds
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
          // Terrain raster tiles
          "terrain-tiles": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
          // Terrain DEM for 3D
          "terrain-dem": {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            encoding: "terrarium",
            attribution: "AWS Terrain Tiles",
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "terrain-tiles",
          },
        ],
        terrain: {
          source: "terrain-dem",
          exaggeration: 1.5,
        },
      },
      center: [centerLng, centerLat],
      zoom: 7,
      pitch: 60,
      bearing: -20,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    map.on("load", () => {
      // Route line (3D coordinates so line drapes above terrain)
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coords3D,
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
          "line-width": 8,
          "line-opacity": 0.4,
          "line-blur": 4,
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
          "line-color": "#e11d48",
          "line-width": 4,
          "line-opacity": 1,
        },
      });

      // Waypoint markers
      if (stableWaypoints?.length) {
        for (const wp of stableWaypoints) {
          const el = document.createElement("div");
          el.style.cssText = `
            width: 12px; height: 12px;
            background: #f97316;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
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
      map.fitBounds(bounds, { padding: 60, pitch: 60, bearing: -20 });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordsKey, waypointsKey, elevKey]);

  // Resize map on fullscreen toggle
  useEffect(() => {
    setTimeout(() => mapRef.current?.resize(), 100);
  }, [isFullscreen]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden shadow-lg border border-border ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : ""}`}
      style={isFullscreen ? { height: "100vh" } : { height: 480 }}
    >
      <button
        onClick={() => setIsFullscreen(prev => !prev)}
        className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md transition-colors"
        title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
      >
        {isFullscreen ? "✕ Esci" : "⛶ Schermo intero"}
      </button>
      <div className="absolute bottom-3 left-3 z-[1000] bg-black/60 text-white text-[10px] px-2 py-1 rounded font-body">
        Trascina per ruotare · Scroll per zoom · Ctrl+drag per inclinare
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
