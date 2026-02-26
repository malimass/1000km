import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LivePosition } from "@/lib/liveTracking";
import type { CommunityLivePosition } from "@/lib/communityTracking";
import { ACTIVITY_EMOJI, ACTIVITY_COLOR, COMMUNITY_STALE_MS, type ActivityType } from "@/lib/communityTracking";

// Coordinate delle 15 tappe (Bologna → Via Emilia → SS16 Adriatica → interno Sud → SS18 Tirrenica → Terranova)
const waypoints: [number, number][] = [
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

const labels = [
  "Bologna", "Faenza", "Rimini", "Ancona", "Porto San Giorgio",
  "Pescara", "Vasto", "Campobasso", "Avellino", "Sala Consilina",
  "Scalea", "Paola", "Pizzo Calabro", "Rosarno", "Terranova Sappo Minulio",
];

const dates = [
  "18 apr", "18 apr", "19 apr", "20 apr", "21 apr",
  "22 apr", "23 apr", "24 apr", "25 apr", "26 apr",
  "27 apr", "28 apr", "29 apr", "30 apr", "1 mag",
];

const km = [
  0, 55, 125, 215, 280, 365, 440, 530, 620, 690,
  775, 830, 895, 960, 1000,
];

// Vola verso il waypoint selezionato
function MapController({ selectedIndex }: { selectedIndex: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedIndex !== null) {
      map.flyTo(waypoints[selectedIndex], 10, { duration: 1.2 });
    }
  }, [selectedIndex, map]);
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
}) {
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

  return (
    <div id={containerId} className="w-full rounded-xl overflow-hidden shadow-lg border border-border" style={{ height: 480 }}>
      <MapContainer
        center={center}
        zoom={6}
        zoomControl={false}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <MapController selectedIndex={selectedIndex} />
        {liveLatlng && <LiveController pos={liveLatlng} />}
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Linea del percorso pianificato */}
        <Polyline
          positions={waypoints}
          pathOptions={{
            color: "#e11d48",
            weight: 3,
            opacity: 0.85,
            dashArray: "6 4",
          }}
        />

        {/* Traccia corridore 1 (verde) */}
        {traveledRoute.length > 1 && (
          <Polyline
            positions={traveledRoute}
            pathOptions={{ color: "#16a34a", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
          />
        )}

        {/* Traccia corridore 2 (arancione) */}
        {traveledRoute2.length > 1 && (
          <Polyline
            positions={traveledRoute2}
            pathOptions={{ color: "#f97316", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
          />
        )}

        {/* Tracce community — una polyline per utente, colore per attività */}
        {Object.entries(communityRoutes).map(([userId, { points, activityType }]) => {
          if (points.length < 2) return null;
          const color = ACTIVITY_COLOR[activityType] ?? "#8b5cf6";
          return (
            <Polyline
              key={`cr-${userId}`}
              positions={points}
              pathOptions={{ color, weight: 3, opacity: 0.75, lineCap: "round", lineJoin: "round" }}
            />
          );
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
