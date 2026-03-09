import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, ZoomControl, useMap, LayersControl } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LivePosition } from "@/lib/liveTracking";
import type { CommunityLivePosition } from "@/lib/communityTracking";
import { ACTIVITY_EMOJI, ACTIVITY_COLOR, COMMUNITY_STALE_MS, type ActivityType } from "@/lib/communityTracking";
import { distanceMeters } from "@/lib/liveTracking";

/** Max gap (meters) between consecutive route points before splitting the polyline */
const MAX_GAP_M = 5_000;

/**
 * Split a route into contiguous segments: whenever two consecutive points are
 * farther than MAX_GAP_M apart the polyline is broken so we don't draw long
 * straight lines across the map from stale / test data.
 */
function splitRoute(pts: [number, number][]): [number, number][][] {
  if (pts.length < 2) return pts.length ? [pts] : [];
  const segments: [number, number][][] = [];
  let seg: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (distanceMeters(pts[i - 1], pts[i]) > MAX_GAP_M) {
      if (seg.length > 1) segments.push(seg);
      seg = [pts[i]];
    } else {
      seg.push(pts[i]);
    }
  }
  if (seg.length > 1) segments.push(seg);
  return segments;
}

// Coordinate default delle 15 tappe (Bologna → Terranova)
const defaultWaypoints: [number, number][] = [
  [44.4949, 11.3426], // Bologna – Santuario S. Luca
  [44.2887, 11.8826], // Faenza
  [44.0595, 12.5683], // Rimini
  [43.6234, 13.5086], // Ancona
  [43.1775, 13.7963], // Porto San Giorgio
  [42.4610, 14.2148], // Pescara
  [42.1130, 14.7069], // Vasto
  [41.5620, 14.6580], // Campobasso
  [40.9143, 14.7903], // Avellino
  [40.4053, 15.5929], // Sala Consilina
  [39.8137, 15.7920], // Scalea
  [39.3583, 16.0325], // Paola
  [38.7396, 16.1619], // Pizzo Calabro
  [38.4878, 15.9832], // Rosarno
  [38.3397, 16.1152], // Terranova Sappo Minulio
];

const defaultLabels = [
  "Bologna", "Faenza", "Rimini", "Ancona", "Porto San Giorgio",
  "Pescara", "Vasto", "Campobasso", "Avellino", "Sala Consilina",
  "Scalea", "Paola", "Pizzo Calabro", "Rosarno", "Terranova Sappo Minulio",
];

const defaultDates = [
  "18 apr", "18 apr", "19 apr", "20 apr", "21 apr",
  "22 apr", "23 apr", "24 apr", "25 apr", "26 apr",
  "27 apr", "28 apr", "29 apr", "30 apr", "1 mag",
];

const defaultKm = [
  0, 55, 125, 215, 280, 365, 440, 530, 620, 690,
  775, 830, 895, 960, 1000,
];

/** Tipo tappa pubblicata dal PercorsoBuilder */
export interface PublishedTappa {
  tappaNum: number;
  lat: number;
  lng: number;
  kmProgr: number;
  label: string;
}

// Vola verso il waypoint selezionato
function MapController({ selectedIndex, waypoints }: { selectedIndex: number | null; waypoints: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (selectedIndex !== null && waypoints[selectedIndex]) {
      map.flyTo(waypoints[selectedIndex], 10, { duration: 1.2 });
    }
  }, [selectedIndex, waypoints, map]);
  return null;
}

// Genera un'icona corridore con emoji, colore pin e animazione gambe
function makeRunnerIcon(emoji: string, pinColor: string) {
  return divIcon({
    className: "runner-marker",
    html: `
      <style>
        @keyframes rl{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
        @keyframes rp2{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}
        .re-s{display:inline-block;font-size:36px;line-height:1;animation:rl 0.45s ease-in-out infinite;transform-origin:50% 15%;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.5))}
      </style>
      <div style="position:relative;text-align:center;width:52px">
        <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%)">
          <span class="re-s">${emoji}</span>
        </div>
        <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);width:14px;height:14px;background:${pinColor};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>
        <div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);width:28px;height:28px;background:${pinColor}44;border-radius:50%;animation:rp2 1.6s ease-out infinite;margin-left:-7px;margin-top:-7px"></div>
      </div>`,
    iconSize:   [52, 58],
    iconAnchor: [26, 58],
  });
}

const runner1Icon = makeRunnerIcon("🏃‍♂️", "#3b82f6");  // blu — Massimo
const runner2Icon = makeRunnerIcon("🏃‍♂️", "#f97316");  // arancione — Nunzio

// Genera un'icona community (più piccola dei runner principali)
function makeCommunityIcon(emoji: string, color: string) {
  return divIcon({
    className: "",
    html: `
      <style>@keyframes cp2{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}</style>
      <div style="position:relative;text-align:center;width:34px">
        <div style="font-size:20px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">${emoji}</div>
        <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>
        <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:18px;height:18px;background:${color}44;border-radius:50%;animation:cp2 2s ease-out infinite;margin-left:-5px;margin-top:-5px"></div>
      </div>`,
    iconSize:   [34, 38],
    iconAnchor: [17, 38],
  });
}

// Vola alla posizione live quando arriva / cambia
function LiveController({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(pos, Math.max(map.getZoom(), 11), { duration: 1.5 });
  }, [pos, map]);
  return null;
}

function makeIcon(color: string, size = 10) {
  return divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.4)
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeIconWithCount(color: string, size: number, count: number) {
  return divIcon({
    className: "",
    html: `<div style="position:relative;display:inline-block">
      <div style="
        width:${size}px;height:${size}px;
        background:${color};
        border:2px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4)
      "></div>
      <div style="
        position:absolute;top:-7px;right:-14px;
        background:#e11d48;color:white;
        font-size:9px;font-weight:700;
        border-radius:99px;padding:1px 5px;
        white-space:nowrap;font-family:sans-serif;
        box-shadow:0 1px 4px rgba(0,0,0,0.3);
        line-height:14px;
      ">${count}</div>
    </div>`,
    iconSize: [size + 20, size + 10],
    iconAnchor: [size / 2, size / 2],
  });
}

const startIcon = makeIcon("#22c55e", 16);
const endIcon   = makeIcon("#e11d48", 16);
const midIcon   = makeIcon("#f97316", 10);
const midIconSel = makeIcon("#f97316", 14);

export default function RouteMap({
  selectedIndex = null,
  iscritti = {},
  livePos = null,
  livePos2 = null,
  traveledRoute = [],
  traveledRoute2 = [],
  communityPositions = [],
  communityRoutes = {},
  containerId,
  publishedTappe = null,
  publishedCoords = null,
}: {
  selectedIndex?:      number | null;
  iscritti?:           Record<number, number>;
  livePos?:            LivePosition | null;
  livePos2?:           LivePosition | null;
  traveledRoute?:      [number, number][];
  traveledRoute2?:     [number, number][];
  communityPositions?: CommunityLivePosition[];
  communityRoutes?:    Record<string, { points: [number, number][]; activityType: ActivityType }>;
  containerId?:        string;
  publishedTappe?:     PublishedTappa[] | null;
  publishedCoords?:    [number, number][] | null;
}) {
  // Se ci sono tappe pubblicate, usale; altrimenti fallback a quelle default
  const waypoints: [number, number][] = publishedTappe
    ? publishedTappe.map(t => [t.lat, t.lng])
    : defaultWaypoints;
  const labels = publishedTappe
    ? publishedTappe.map(t => t.label)
    : defaultLabels;
  const km = publishedTappe
    ? publishedTappe.map(t => Math.round(t.kmProgr))
    : defaultKm;
  // Per le date: usare default se disponibili, altrimenti stringa vuota
  const dates = publishedTappe
    ? publishedTappe.map((_, i) => defaultDates[i] ?? "")
    : defaultDates;
  // Per la polyline: se ci sono coords pubblicate usale, altrimenti unisci waypoints
  const routeLine: [number, number][] = publishedCoords ?? waypoints;
  const liveLatlng1: [number, number] | null =
    livePos?.is_active && livePos.lat != null && livePos.lng != null
      ? [livePos.lat, livePos.lng] : null;
  const liveLatlng2: [number, number] | null =
    livePos2?.is_active && livePos2.lat != null && livePos2.lng != null
      ? [livePos2.lat, livePos2.lng] : null;

  // Vola verso il corridore più avanti (o il primo attivo)
  const liveLatlng = liveLatlng1 ?? liveLatlng2;

  // Centro mappa spostato per coprire il percorso reale (adriatica + tirrenica)
  const center: [number, number] = [41.5, 14.0];

  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <div
      id={containerId}
      className={`w-full rounded-xl overflow-hidden shadow-lg border border-border ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : ""}`}
      style={isFullscreen ? { height: "100vh" } : { height: 480 }}
    >
      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 left-3 z-[1000] bg-white/90 hover:bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md transition-colors flex items-center gap-1"
        title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}
      >
        {isFullscreen ? "✕ Esci" : "⛶ Schermo intero"}
      </button>

      <MapContainer
        center={center}
        zoom={6}
        zoomControl={false}
        scrollWheelZoom={isFullscreen}
        style={{ height: "100%", width: "100%" }}
      >
        <MapController selectedIndex={selectedIndex} waypoints={waypoints} />
        {liveLatlng && <LiveController pos={liveLatlng} />}
        <ZoomControl position="bottomright" />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Stradale">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution="Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terreno">
            <TileLayer
              attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Linea del percorso pianificato (usa polyline reale se pubblicata) */}
        <Polyline
          positions={routeLine}
          pathOptions={{
            color: "#e11d48",
            weight: 3,
            opacity: 0.85,
            dashArray: publishedCoords ? undefined : "6 4",
          }}
        />

        {/* Traccia corridore 1 (verde) — spezzata se ci sono salti > 5 km */}
        {splitRoute(traveledRoute).map((seg, i) => (
          <Polyline
            key={`r1-${i}`}
            positions={seg}
            pathOptions={{ color: "#16a34a", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
          />
        ))}

        {/* Traccia corridore 2 (arancione) — spezzata se ci sono salti > 5 km */}
        {splitRoute(traveledRoute2).map((seg, i) => (
          <Polyline
            key={`r2-${i}`}
            positions={seg}
            pathOptions={{ color: "#f97316", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
          />
        ))}

        {/* Tracce community — una polyline per utente, colore per attività */}
        {Object.entries(communityRoutes).map(([userId, { points, activityType }]) => {
          const segs = splitRoute(points);
          if (!segs.length) return null;
          const color = ACTIVITY_COLOR[activityType] ?? "#8b5cf6";
          return segs.map((seg, i) => (
            <Polyline
              key={`cr-${userId}-${i}`}
              positions={seg}
              pathOptions={{ color, weight: 3, opacity: 0.75, lineCap: "round", lineJoin: "round" }}
            />
          ));
        })}

        {/* Marker corridore 1 — 🏃‍♂️ */}
        {liveLatlng1 && (
          <Marker position={liveLatlng1} icon={runner1Icon} zIndexOffset={1000}>
            <Popup>
              <div className="text-sm font-sans space-y-0.5">
                <strong>🏃‍♂️ Massimo</strong>
                {livePos?.speed != null && <p>{(livePos.speed * 3.6).toFixed(1)} km/h</p>}
                {livePos?.accuracy != null && <p className="text-xs text-gray-500">±{Math.round(livePos.accuracy)} m</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marker corridore 2 — 🏃‍♂️ */}
        {liveLatlng2 && (
          <Marker position={liveLatlng2} icon={runner2Icon} zIndexOffset={1000}>
            <Popup>
              <div className="text-sm font-sans space-y-0.5">
                <strong>🏃‍♂️ Nunzio</strong>
                {livePos2?.speed != null && <p>{(livePos2.speed * 3.6).toFixed(1)} km/h</p>}
                {livePos2?.accuracy != null && <p className="text-xs text-gray-500">±{Math.round(livePos2.accuracy)} m</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marker community — tutti gli utenti attivi e con posizione recente */}
        {communityPositions.map((cp) => {
          const isStale = new Date(cp.updated_at).getTime() < Date.now() - COMMUNITY_STALE_MS;
          if (!cp.is_active || isStale || cp.lat == null || cp.lng == null) return null;
          const emoji = ACTIVITY_EMOJI[cp.activity_type] ?? "💪";
          const color = ACTIVITY_COLOR[cp.activity_type] ?? "#8b5cf6";
          const icon  = makeCommunityIcon(emoji, color);
          return (
            <Marker
              key={cp.user_id}
              position={[cp.lat, cp.lng]}
              icon={icon}
              zIndexOffset={500}
            >
              <Popup>
                <div className="text-sm font-sans space-y-0.5">
                  <strong>{emoji} {cp.display_name}</strong>
                  {cp.speed != null && <p>{(cp.speed * 3.6).toFixed(1)} km/h</p>}
                  {cp.accuracy != null && (
                    <p className="text-xs text-gray-500">±{Math.round(cp.accuracy)} m</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marker per ogni tappa */}
        {waypoints.map((pos, i) => {
          const isSelected = i === selectedIndex;
          // iscritti[i] mappa tappa_numero = waypoint index (1..14)
          const count = iscritti[i] ?? 0;

          let icon;
          if (i === 0) {
            icon = startIcon;
          } else if (i === waypoints.length - 1) {
            icon = endIcon;
          } else if (count > 0) {
            icon = makeIconWithCount("#f97316", isSelected ? 14 : 10, count);
          } else {
            icon = isSelected ? midIconSel : midIcon;
          }

          return (
            <Marker key={labels[i]} position={pos} icon={icon}>
              <Popup>
                <div className="text-sm font-sans">
                  <strong>{labels[i]}</strong>
                  <br />
                  {dates[i]} · {km[i]} km
                  {count > 0 && (
                    <>
                      <br />
                      <span style={{ color: "#e11d48", fontWeight: 600 }}>
                        👥 {count} iscritti
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
