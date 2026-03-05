/**
 * PercorsoBuilder.tsx
 * ───────────────────
 * Tool admin per pianificare un percorso pedonale/di corsa tra due indirizzi,
 * suddividerlo in tappe di N km e visualizzarle su mappa Leaflet.
 *
 * APIs Google Maps (JS SDK — niente CORS):
 *  - AutocompleteSuggestion → suggerimenti mentre si digita
 *  - Geocoder               → converte indirizzo in coordinate
 *  - Route.computeRoutes    → calcola percorso a piedi (nuova API)
 *  - DirectionsService      → fallback legacy
 *
 * Mappe:
 *  - Stradale (OpenStreetMap)
 *  - Satellite (Esri World Imagery)
 *  - Topografica (OpenTopoMap)
 *
 * Richiede: VITE_GOOGLE_MAPS_API_KEY nel file .env
 * Abilita su Cloud Console: Directions API, Geocoding API, Places API
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search, Navigation, Loader2, MapPin, Route, RotateCcw, Copy, CheckCircle2,
  AlertCircle, Save, Trash2, FolderOpen, Map as MapIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const ElevationProfile = lazy(() => import("@/components/ElevationProfile"));
const RouteMap3D = lazy(() => import("@/components/RouteMap3D"));

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// ─── Tile layers ─────────────────────────────────────────────────────────────

const TILE_LAYERS = {
  street: {
    name: "Stradale",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  topo: {
    name: "Topografica",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
} as const;

type TileKey = keyof typeof TILE_LAYERS;

// ─── Carica Google Maps JS API una sola volta ─────────────────────────────────

let _gmapsPromise: Promise<void> | null = null;

function loadGoogleMapsScript(key: string): Promise<void> {
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=it&loading=async`;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => { _gmapsPromise = null; reject(new Error("Impossibile caricare Google Maps")); };
    document.head.appendChild(script);
  });
  return _gmapsPromise;
}

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type TravelMode = "walking" | "running";  // entrambi usano mode=walking su Google
type RoutePreference = "default" | "shortest";

interface RouteResult {
  coords:    [number, number][];  // [lat, lng]
  distanceM: number;
}

interface TappaPoint {
  tappaNum:  number;
  lat:       number;
  lng:       number;
  kmProgr:   number;
  label:     string;
}

interface Suggestion {
  description: string;
  place_id:    string;
}

interface SavedPercorso {
  id:            string;
  name:          string;
  partenza:      string;
  arrivo:        string;
  distance_m:    number;
  km_per_tappa:  number;
  coords:        [number, number][];
  tappe:         TappaPoint[];
  created_at:    string;
}

// ─── Haversine (m) ────────────────────────────────────────────────────────────

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const φ1 = (a[0] * Math.PI) / 180, φ2 = (b[0] * Math.PI) / 180;
  const Δφ = ((b[0] - a[0]) * Math.PI) / 180, Δλ = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ─── Split percorso in tappe ──────────────────────────────────────────────────

function splitByKm(coords: [number, number][], kmPerTappa: number): TappaPoint[] {
  if (coords.length < 2 || kmPerTappa <= 0) return [];
  const stepM = kmPerTappa * 1000;
  const pts: TappaPoint[] = [];
  pts.push({ tappaNum: 0, lat: coords[0][0], lng: coords[0][1], kmProgr: 0, label: "Partenza" });

  let cumM = 0, next = stepM, tappaNum = 1;
  for (let i = 1; i < coords.length; i++) {
    const segM   = haversineM(coords[i - 1], coords[i]);
    const segEnd = cumM + segM;
    while (next < segEnd) {
      const t   = segM > 0 ? (next - cumM) / segM : 0;
      const lat = coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]);
      const lng = coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]);
      pts.push({ tappaNum, lat, lng, kmProgr: next / 1000, label: `Tappa ${tappaNum}` });
      next += stepM;
      tappaNum++;
    }
    cumM += segM;
  }
  const last = coords[coords.length - 1];
  pts.push({ tappaNum, lat: last[0], lng: last[1], kmProgr: Math.round(cumM / 100) / 10, label: "Arrivo" });
  return pts;
}

// ─── Google Geocoder JS SDK (niente CORS) ────────────────────────────────────

function googleGeocode(address: string): Promise<[number, number] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const G = (window as any).google.maps;
  return new Promise((resolve) => {
    new G.Geocoder().geocode({ address, language: "it" }, (results: any[], status: string) => {
      if (status === "OK" && results?.length) {
        const loc = results[0].geometry.location;
        resolve([loc.lat(), loc.lng()]);
      } else {
        resolve(null);
      }
    });
  });
}

// ─── Google Routes API (computeRoutes — nuova, sostituisce DirectionsService) ─

// Max distanza in linea d'aria per un singolo segmento (~80 km)
// Segmenti corti funzionano meglio con WALKING mode
const MAX_SEGMENT_KM = 80;

/**
 * Interpola N punti intermedi equidistanti tra start e end.
 */
function interpolatePoints(start: [number, number], end: [number, number], n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    pts.push([
      start[0] + t * (end[0] - start[0]),
      start[1] + t * (end[1] - start[1]),
    ]);
  }
  return pts;
}

/**
 * Snap un punto interpolato alla città più vicina tramite reverse geocoding.
 * Evita che i waypoint cadano in mare/montagna.
 */
async function snapToCity(pt: [number, number]): Promise<[number, number]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google.maps;
    return new Promise((resolve) => {
      new G.Geocoder().geocode(
        { location: new G.LatLng(pt[0], pt[1]), language: "it" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[], status: string) => {
          if (status === "OK" && results?.length) {
            // Cerca il risultato più "navigabile" — preferisci locality > route > il primo
            const best =
              results.find((r: any) => r.types?.includes("locality")) ??
              results.find((r: any) => r.types?.includes("route")) ??
              results[0];
            const loc = best.geometry.location;
            resolve([loc.lat(), loc.lng()]);
          } else {
            resolve(pt); // fallback: punto originale
          }
        },
      );
    });
  } catch {
    return pt;
  }
}

/**
 * Chiama Route.computeRoutes per un singolo segmento.
 * Usa WALK con avoidHighways/avoidTolls/avoidFerries per strade sicure.
 */
async function walkSegmentNew(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RouteClass: any,
  origin: [number, number],
  destination: [number, number],
  preferShortest = false,
): Promise<RouteResult | null> {
  try {
    const request: Record<string, unknown> = {
      origin:      { lat: origin[0], lng: origin[1] },
      destination: { lat: destination[0], lng: destination[1] },
      travelMode:  "WALKING",
      routeModifiers: {
        avoidHighways: true,
        avoidFerries:  true,
      },
      fields: ["legs", "distanceMeters"],
    };

    // Richiedi rotte alternative per poter scegliere la più breve
    if (preferShortest) {
      request.computeAlternativeRoutes = true;
    }

    const { routes } = await RouteClass.computeRoutes(request);
    if (!routes?.length) return null;

    // Se preferShortest, scegli la rotta con distanza minore
    const route = preferShortest && routes.length > 1
      ? routes.reduce((best: any, r: any) => (r.distanceMeters ?? Infinity) < (best.distanceMeters ?? Infinity) ? r : best)
      : routes[0];
    const coords: [number, number][] = [];
    let distanceM = route.distanceMeters ?? 0;

    // Estrai coordinate dai legs → steps → path
    if (route.legs) {
      distanceM = 0;
      for (const leg of route.legs) {
        distanceM += leg.distanceMeters ?? 0;
        if (leg.steps) {
          for (const step of leg.steps) {
            if (step.path) {
              for (const pt of step.path) {
                const lat = typeof pt.lat === "function" ? pt.lat() : pt.lat;
                const lng = typeof pt.lng === "function" ? pt.lng() : pt.lng;
                coords.push([lat, lng]);
              }
            }
          }
        }
      }
    }

    // Fallback: usa route.path se legs non ha dato coordinate
    if (!coords.length && route.path) {
      for (const pt of route.path) {
        const lat = typeof pt.lat === "function" ? pt.lat() : pt.lat;
        const lng = typeof pt.lng === "function" ? pt.lng() : pt.lng;
        coords.push([lat, lng]);
      }
    }

    return coords.length ? { coords, distanceM } : null;
  } catch (err) {
    console.warn("[PercorsoBuilder] computeRoutes segment error:", err);
    return null;
  }
}

/**
 * Ottieni una rotta DRIVING come "scheletro" per sapere dove passano le strade.
 * Usa computeRoutes (nuova API), con fallback a DirectionsService legacy.
 */
async function getDrivingSkeleton(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  G: any,
  origin: [number, number],
  destination: [number, number],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RouteClass?: any,
): Promise<RouteResult | null> {
  // 1. Prova computeRoutes (nuova API)
  if (RouteClass) {
    try {
      const { routes } = await RouteClass.computeRoutes({
        origin:      { lat: origin[0], lng: origin[1] },
        destination: { lat: destination[0], lng: destination[1] },
        travelMode:  "DRIVE",
        fields:      ["legs", "distanceMeters"],
      });
      if (routes?.length) {
        const route = routes[0];
        const coords: [number, number][] = [];
        let distanceM = route.distanceMeters ?? 0;
        if (route.legs) {
          distanceM = 0;
          for (const leg of route.legs) {
            distanceM += leg.distanceMeters ?? 0;
            if (leg.steps) {
              for (const step of leg.steps) {
                if (step.path) {
                  for (const pt of step.path) {
                    const lat = typeof pt.lat === "function" ? pt.lat() : pt.lat;
                    const lng = typeof pt.lng === "function" ? pt.lng() : pt.lng;
                    coords.push([lat, lng]);
                  }
                }
              }
            }
          }
        }
        if (coords.length) return { coords, distanceM };
      }
    } catch (err) {
      console.warn("[PercorsoBuilder] computeRoutes DRIVE skeleton error:", err);
    }
  }

  // 2. Fallback: DirectionsService legacy
  return new Promise((resolve) => {
    const service = new G.DirectionsService();
    service.route(
      {
        origin:      new G.LatLng(origin[0], origin[1]),
        destination: new G.LatLng(destination[0], destination[1]),
        travelMode:  G.TravelMode.DRIVING,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any, status: string) => {
        if (status === "OK") {
          resolve(extractDirectionsResult(response));
        } else {
          resolve(null);
        }
      },
    );
  });
}

/**
 * Estrai waypoint equidistanti lungo una polyline di coordinate.
 * Restituisce N punti spaziati regolarmente lungo il percorso reale.
 */
function extractWaypointsFromRoute(
  coords: [number, number][],
  n: number,
): [number, number][] {
  if (coords.length < 2 || n <= 0) return [];

  // Calcola distanza totale
  let totalM = 0;
  for (let i = 1; i < coords.length; i++) {
    totalM += haversineM(coords[i - 1], coords[i]);
  }

  const stepM = totalM / (n + 1);
  const waypoints: [number, number][] = [];
  let cumM = 0;
  let nextTarget = stepM;
  let wpIdx = 0;

  for (let i = 1; i < coords.length && wpIdx < n; i++) {
    const segM = haversineM(coords[i - 1], coords[i]);
    const segEnd = cumM + segM;

    while (nextTarget <= segEnd && wpIdx < n) {
      const t = segM > 0 ? (nextTarget - cumM) / segM : 0;
      waypoints.push([
        coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]),
        coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]),
      ]);
      wpIdx++;
      nextTarget += stepM;
    }
    cumM += segM;
  }

  return waypoints;
}

/**
 * Estrai coordinate e distanza da un response DirectionsService.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDirectionsResult(response: any): RouteResult | null {
  if (!response?.routes?.length) return null;
  const route = response.routes[0];
  const coords: [number, number][] = [];
  let distanceM = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const leg of route.legs as any[]) {
    distanceM += leg.distance?.value ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const step of leg.steps as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const pt of step.path as any[]) {
        coords.push([pt.lat(), pt.lng()]);
      }
    }
  }
  return coords.length ? { coords, distanceM } : null;
}

/**
 * DirectionsService legacy: prova WALKING, poi DRIVING come fallback.
 * DRIVING segue comunque strade reali (mai linee rette nel mare).
 */
function walkSegmentLegacy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  G: any,
  origin: [number, number],
  destination: [number, number],
  preferShortest = false,
): Promise<RouteResult | null> {
  return new Promise((resolve) => {
    const service = new G.DirectionsService();
    const baseOpts = {
      origin:      new G.LatLng(origin[0], origin[1]),
      destination: new G.LatLng(destination[0], destination[1]),
      avoidHighways: true,
      avoidTolls:    true,
      avoidFerries:  true,
      provideRouteAlternatives: preferShortest,
    };

    // 1. Prova WALKING
    service.route(
      { ...baseOpts, travelMode: G.TravelMode.WALKING },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any, status: string) => {
        if (status === "OK") {
          // Se preferShortest, confronta tutte le rotte e scegli la più breve
          if (preferShortest && response.routes?.length > 1) {
            let best: RouteResult | null = null;
            for (const r of response.routes) {
              const candidate = extractDirectionsResult({ ...response, routes: [r] });
              if (candidate && (!best || candidate.distanceM < best.distanceM)) {
                best = candidate;
              }
            }
            if (best) { resolve(best); return; }
          }
          const result = extractDirectionsResult(response);
          if (result) { resolve(result); return; }
        }

        // 2. Fallback DRIVING — almeno segue strade reali (ferries OK)
        console.warn("[PercorsoBuilder] WALKING fallito, provo DRIVING per questo segmento");
        service.route(
          { ...baseOpts, travelMode: G.TravelMode.DRIVING, avoidHighways: false, avoidFerries: false },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (resp2: any, status2: string) => {
            if (status2 === "OK") {
              // Anche per DRIVING, scegli la più breve se richiesto
              if (preferShortest && resp2.routes?.length > 1) {
                let best: RouteResult | null = null;
                for (const r of resp2.routes) {
                  const candidate = extractDirectionsResult({ ...resp2, routes: [r] });
                  if (candidate && (!best || candidate.distanceM < best.distanceM)) {
                    best = candidate;
                  }
                }
                if (best) { resolve(best); return; }
              }
              resolve(extractDirectionsResult(resp2));
            } else {
              resolve(null);
            }
          },
        );
      },
    );
  });
}

/**
 * Calcola percorso pedonale sicuro.
 * 1. Usa la nuova Route.computeRoutes (travelMode WALK)
 * 2. Per distanze > MAX_SEGMENT_KM spezza in segmenti
 * 3. Waypoint intermedi snappati a città reali (reverse geocoding)
 * 4. Fallback a DirectionsService (legacy) per segmenti falliti
 */
async function googleDirections(
  start: [number, number],
  end: [number, number],
  onProgress?: (pct: number) => void,
  preferShortest = false,
): Promise<RouteResult | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const G = (window as any).google.maps;

    // Tenta di caricare la nuova Routes library
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let RouteClass: any = null;
    try {
      const lib = await G.importLibrary("routes");
      RouteClass = lib.Route;
    } catch {
      console.warn("[PercorsoBuilder] Routes library non disponibile, uso DirectionsService legacy");
    }

    // Risolvi un singolo segmento, con split ricorsivo se fallisce (max depth 3)
    async function resolveSegment(
      origin: [number, number],
      dest: [number, number],
      depth = 0,
    ): Promise<RouteResult | null> {
      // Prova: 1) computeRoutes WALK, 2) DirectionsService WALKING+DRIVING
      let seg: RouteResult | null = null;
      if (RouteClass) {
        seg = await walkSegmentNew(RouteClass, origin, dest, preferShortest);
      }
      if (!seg) {
        seg = await walkSegmentLegacy(G, origin, dest, preferShortest);
      }
      if (seg) return seg;

      // Se fallisce e possiamo ancora splittare, dividi a metà con snap a città
      if (depth >= 3) {
        console.error(`[PercorsoBuilder] segmento irrisolvibile dopo ${depth} split`);
        return null;
      }

      const mid: [number, number] = [
        (origin[0] + dest[0]) / 2,
        (origin[1] + dest[1]) / 2,
      ];
      const snappedMid = await snapToCity(mid);
      console.warn(`[PercorsoBuilder] segmento fallito, split via ${snappedMid} (depth=${depth + 1})`);

      await new Promise(r => setTimeout(r, 300));
      const first = await resolveSegment(origin, snappedMid, depth + 1);
      if (!first) return null;

      await new Promise(r => setTimeout(r, 300));
      const second = await resolveSegment(snappedMid, dest, depth + 1);
      if (!second) return null;

      return {
        coords: [...first.coords, ...second.coords],
        distanceM: first.distanceM + second.distanceM,
      };
    }

    // Calcola distanza in linea d'aria
    const straightKm = haversineM(start, end) / 1000;

    // Determina quanti segmenti servono
    const nSegments = Math.max(1, Math.ceil(straightKm / MAX_SEGMENT_KM));

    // Genera waypoint intermedi lungo strade reali (non su linea retta!)
    let waypoints: [number, number][] = [];
    if (nSegments > 1) {
      onProgress?.(0);

      // 1. Ottieni "scheletro" DRIVING per avere punti su strade reali
      const skeleton = await getDrivingSkeleton(G, start, end, RouteClass);

      if (skeleton && skeleton.coords.length > 2) {
        // Estrai waypoint equidistanti lungo la rotta DRIVING reale
        const rawWaypoints = extractWaypointsFromRoute(skeleton.coords, nSegments - 1);
        // Snap a città per avere waypoint più significativi
        waypoints = await Promise.all(rawWaypoints.map(snapToCity));
        console.info(`[PercorsoBuilder] ${waypoints.length} waypoint estratti da scheletro DRIVING`);
      } else {
        // Fallback: interpolazione lineare + snap (può fallire per percorsi via mare)
        console.warn("[PercorsoBuilder] scheletro DRIVING non disponibile, uso interpolazione lineare");
        const rawWaypoints = interpolatePoints(start, end, nSegments - 1);
        waypoints = await Promise.all(rawWaypoints.map(snapToCity));
      }
    }

    // Costruisci la lista di coppie [origin, destination]
    const allPoints = [start, ...waypoints, end];
    const segments: [number, number][][] = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      segments.push([allPoints[i], allPoints[i + 1]]);
    }

    // Esegui le richieste in sequenza
    const allCoords: [number, number][] = [];
    let totalDistanceM = 0;

    for (let i = 0; i < segments.length; i++) {
      onProgress?.(Math.round(((i) / segments.length) * 100));

      const seg = await resolveSegment(segments[i][0], segments[i][1]);

      if (!seg) {
        console.error(`[PercorsoBuilder] segmento ${i + 1}/${segments.length} fallito su tutte le API`);
        return null;
      }
      allCoords.push(...seg.coords);
      totalDistanceM += seg.distanceM;

      // Pausa tra richieste per evitare rate limit
      if (i < segments.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    onProgress?.(100);
    return allCoords.length ? { coords: allCoords, distanceM: totalDistanceM } : null;
  } catch (err) {
    console.error("[PercorsoBuilder] directions error:", err);
    return null;
  }
}

// ─── MapFit — adatta bounds dopo il calcolo ───────────────────────────────────

function MapFit({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 1)
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 14 });
  }, [coords, map]);
  return null;
}

// ─── Icone marker divIcon ─────────────────────────────────────────────────────

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,.4);text-align:center;">${label}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
  });
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function PercorsoBuilder() {
  const [partenza,   setPartenza]   = useState("");
  const [arrivo,     setArrivo]     = useState("");
  const [mode,       setMode]       = useState<TravelMode>("walking");
  const [routePref,  setRoutePref]  = useState<RoutePreference>("default");
  const [kmPerTappa, setKmPerTappa] = useState(70);

  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState<string | null>(null);

  const [route,  setRoute]  = useState<RouteResult | null>(null);
  const [tappe,  setTappe]  = useState<TappaPoint[]>([]);

  // Elevation data
  const [elevationData, setElevationData] = useState<{
    points: { lat: number; lng: number; elevation: number; resolution: number }[];
    stats: { minElevation: number; maxElevation: number; totalGainM: number; totalLossM: number };
  } | null>(null);
  const [elevLoading, setElevLoading] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [savePin,  setSavePin]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<{ ok: boolean; text: string } | null>(null);

  const [mapsReady,    setMapsReady]    = useState(false);
  const [partenzaSugg, setPartenzaSugg] = useState<Suggestion[]>([]);
  const [arrivoSugg,   setArrivoSugg]   = useState<Suggestion[]>([]);

  // Saved percorsi (DB)
  const [savedList,    setSavedList]    = useState<SavedPercorso[]>([]);
  const [showSaved,    setShowSaved]    = useState(false);
  const [saveName,     setSaveName]     = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);

  const noKey         = !GOOGLE_KEY;
  const partenzaTimer = useRef<ReturnType<typeof setTimeout>>();
  const arrivoTimer   = useRef<ReturnType<typeof setTimeout>>();

  // ── Carica Google Maps JS SDK ─────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_KEY) return;
    loadGoogleMapsScript(GOOGLE_KEY).then(() => setMapsReady(true)).catch(() => {});
  }, []);

  // ── Carica percorsi salvati dal DB ──────────────────────────────────────
  useEffect(() => {
    setLoadingSaved(true);
    apiFetch("/api/saved-percorsi")
      .then(r => r.ok ? r.json() : [])
      .then((rows: SavedPercorso[]) => setSavedList(rows))
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
  }, []);

  // ── Autocomplete via AutocompleteSuggestion (nuova API, niente deprecation) ─
  function fetchSugg(
    input: string,
    setter: (s: Suggestion[]) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
  ) {
    clearTimeout(timerRef.current);
    if (!mapsReady || input.length < 3) { setter([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { AutocompleteSuggestion } = await (window as any).google.maps.importLibrary("places");
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          language: "it",
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setter(suggestions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((s: any) => s.placePrediction)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => ({
            description: s.placePrediction.text.toString(),
            place_id: s.placePrediction.placeId,
          })));
      } catch {
        setter([]);
      }
    }, 300);
  }

  // ── Calcola percorso ──────────────────────────────────────────────────────
  const handleCalcola = useCallback(async () => {
    if (noKey)      { setError("Imposta VITE_GOOGLE_MAPS_API_KEY nel file .env"); return; }
    if (!mapsReady) { setError("Google Maps non ancora caricato, attendi un momento."); return; }
    if (!partenza.trim() || !arrivo.trim()) { setError("Inserisci partenza e arrivo."); return; }

    setLoading(true); setProgress(0); setError(null); setRoute(null); setTappe([]);

    const [startC, endC] = await Promise.all([
      googleGeocode(partenza),
      googleGeocode(arrivo),
    ]);
    if (!startC) { setError(`Indirizzo non trovato: "${partenza}"`); setLoading(false); return; }
    if (!endC)   { setError(`Indirizzo non trovato: "${arrivo}"`);   setLoading(false); return; }

    const result = await googleDirections(startC, endC, setProgress, routePref === "shortest");
    if (!result) { setError("Google non ha trovato un percorso pedonale. Prova indirizzi più precisi."); setLoading(false); return; }

    setRoute(result);
    setTappe(splitByKm(result.coords, kmPerTappa));
    setLoading(false);

    // Fetch elevation data in background
    setElevLoading(true);
    setElevationData(null);
    fetch("/api/elevation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coords: result.coords }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.points) setElevationData(data); })
      .catch(() => {})
      .finally(() => setElevLoading(false));
  }, [partenza, arrivo, kmPerTappa, routePref, noKey, mapsReady]);

  // ── Ricalcola tappe al cambio di kmPerTappa ───────────────────────────────
  useEffect(() => {
    if (route) setTappe(splitByKm(route.coords, kmPerTappa));
  }, [kmPerTappa, route]);

  // ── Copia tappe negli appunti ─────────────────────────────────────────────
  async function copyTappe() {
    if (!tappe.length) return;
    const text = tappe.map(t =>
      `${t.label} — ${t.kmProgr.toFixed(1)} km — ${t.lat.toFixed(5)},${t.lng.toFixed(5)}`
    ).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Salva percorso nel DB ─────────────────────────────────────────────────
  async function savePercorsoLocal() {
    if (!route || !tappe.length) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/saved-percorsi", {
        method: "POST",
        body: JSON.stringify({
          name: saveName.trim() || undefined,
          partenza,
          arrivo,
          distanceM: route.distanceM,
          kmPerTappa,
          coords: route.coords,
          tappe,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveMsg({ ok: false, text: data.error ?? "Errore nel salvataggio." });
        setSaving(false);
        return;
      }
      const entry: SavedPercorso = await res.json();
      setSavedList(prev => [entry, ...prev]);
      setSaveName("");
      setSaveMsg({ ok: true, text: `"${entry.name}" salvato.` });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg({ ok: false, text: "Errore di rete." });
    }
    setSaving(false);
  }

  async function deleteSavedPercorso(id: string) {
    setSavedList(prev => prev.filter(p => p.id !== id));
    await apiFetch(`/api/saved-percorsi?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  function loadPercorso(p: SavedPercorso) {
    setPartenza(p.partenza);
    setArrivo(p.arrivo);
    setKmPerTappa(p.km_per_tappa);
    setRoute({ coords: p.coords, distanceM: p.distance_m });
    setTappe(p.tappe);
    setShowSaved(false);
    setError(null);
  }

  // ── Salva percorso sul server (admin) ─────────────────────────────────────
  async function savePercorsoServer() {
    if (!route || !tappe.length) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/percorso-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: savePin,
          tappe,
          coords: route.coords,
          distanceM: route.distanceM,
          elevation: elevationData ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg({ ok: true, text: "Percorso salvato! Visibile su /il-percorso." });
        setSavePin("");
      } else {
        setSaveMsg({ ok: false, text: data.error ?? "Errore durante il salvataggio." });
      }
    } catch {
      setSaveMsg({ ok: false, text: "Errore di rete." });
    }
    setSaving(false);
  }

  const totalKm = route ? Math.round(route.distanceM / 100) / 10 : null;
  const nTappe  = totalKm && kmPerTappa ? Math.ceil(totalKm / kmPerTappa) : null;

  // ── Dropdown suggerimenti ─────────────────────────────────────────────────
  function SuggDropdown({ suggestions, onSelect }: { suggestions: Suggestion[]; onSelect: (d: string) => void }) {
    if (!suggestions.length) return null;
    return (
      <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
        {suggestions.map((s) => (
          <li key={s.place_id}
            onMouseDown={() => onSelect(s.description)}
            className="px-3 py-2 text-xs cursor-pointer hover:bg-muted flex items-center gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            {s.description}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">

      {/* Intestazione */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <Route className="w-4 h-4 text-dona" />
            Crea Percorso
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Percorso a piedi / di corsa calcolato da Google Maps.
          </p>
        </div>
        {(savedList.length > 0 || loadingSaved) && (
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center gap-1.5 text-xs font-semibold text-dona hover:opacity-80 transition-opacity"
          >
            {loadingSaved ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
            {loadingSaved ? "Caricamento…" : `Salvati (${savedList.length})`}
          </button>
        )}
      </div>

      {/* Percorsi salvati */}
      {showSaved && savedList.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-dona" />
              Percorsi salvati
            </p>
          </div>
          <div className="divide-y divide-border max-h-60 overflow-y-auto">
            {savedList.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadPercorso(p)}>
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(Number(p.distance_m) / 1000).toFixed(1)} km · {p.tappe.length} tappe · {new Date(p.created_at).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <button
                  onClick={() => loadPercorso(p)}
                  className="text-[10px] text-dona hover:opacity-80 flex items-center gap-1"
                >
                  <MapIcon className="w-3 h-3" /> Apri
                </button>
                <button
                  onClick={() => deleteSavedPercorso(p.id)}
                  className="text-[10px] text-destructive hover:opacity-80 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avviso chiave mancante */}
      {noKey && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">API key mancante</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Aggiungi <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=&lt;chiave&gt;</code> nel file <code>.env</code> e riavvia il server.
              Attiva <strong>Directions API</strong>, <strong>Geocoding API</strong> e <strong>Places API</strong> sulla Google Cloud Console.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">

        {/* Modalità */}
        <div className="flex gap-2">
          {(["walking", "running"] as TravelMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                mode === m
                  ? "bg-dona text-white border-dona"
                  : "border-border text-muted-foreground hover:border-dona/50"
              }`}
            >
              {m === "walking" ? "🚶 A piedi" : "🏃 Di corsa"}
            </button>
          ))}
        </div>
        {/* Preferenza percorso */}
        <div className="flex gap-2">
          {([
            { key: "default" as RoutePreference, icon: "🗺️", label: "Percorso consigliato" },
            { key: "shortest" as RoutePreference, icon: "📏", label: "Più breve" },
          ]).map(({ key, icon, label }) => (
            <button key={key} onClick={() => setRoutePref(key)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                routePref === key
                  ? "bg-dona text-white border-dona"
                  : "border-border text-muted-foreground hover:border-dona/50"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground -mt-2">
          {routePref === "shortest"
            ? "Confronta rotte alternative e seleziona quella con meno km."
            : "Entrambe le modalità usano il routing pedonale Google (strade sicure, niente autostrade)."}
        </p>

        {/* Partenza */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Partenza</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500 z-10 pointer-events-none" />
            <input type="text" value={partenza}
              onChange={e => { setPartenza(e.target.value); fetchSugg(e.target.value, setPartenzaSugg, partenzaTimer); }}
              onBlur={() => setTimeout(() => setPartenzaSugg([]), 150)}
              onKeyDown={e => e.key === "Enter" && handleCalcola()}
              placeholder="Es. Bologna, Piazza Maggiore"
              className="w-full pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40" />
            <SuggDropdown suggestions={partenzaSugg} onSelect={v => { setPartenza(v); setPartenzaSugg([]); }} />
          </div>
        </div>

        {/* Arrivo */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Arrivo</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500 z-10 pointer-events-none" />
            <input type="text" value={arrivo}
              onChange={e => { setArrivo(e.target.value); fetchSugg(e.target.value, setArrivoSugg, arrivoTimer); }}
              onBlur={() => setTimeout(() => setArrivoSugg([]), 150)}
              onKeyDown={e => e.key === "Enter" && handleCalcola()}
              placeholder="Es. Terranova Sappo Minulio, Reggio Calabria"
              className="w-full pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40" />
            <SuggDropdown suggestions={arrivoSugg} onSelect={v => { setArrivo(v); setArrivoSugg([]); }} />
          </div>
        </div>

        {/* Km per tappa */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Km per tappa — <span className="text-dona font-bold">{kmPerTappa} km</span>
          </label>
          <input type="range" min={10} max={150} step={5} value={kmPerTappa}
            onChange={e => setKmPerTappa(Number(e.target.value))}
            className="w-full accent-dona" />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totalKm
              ? `≈ ${nTappe} tappe su ${totalKm} km totali`
              : "Calcola il percorso per vedere il numero di tappe"}
          </p>
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
          </p>
        )}

        <button onClick={handleCalcola} disabled={loading || noKey}
          className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? (progress > 0 ? `Calcolo… ${progress}%` : "Geocodifica…") : "Calcola percorso"}
        </button>
      </div>

      {/* Risultati */}
      {route && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: `${totalKm} km`, lbl: "Distanza totale" },
              { val: `${nTappe}`,     lbl: "Numero tappe" },
              { val: `${kmPerTappa} km`, lbl: "Lunghezza tappa" },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="font-heading text-lg font-bold text-dona">{val}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>

          {/* Toggle 2D/3D */}
          <div className="flex gap-2">
            <button
              onClick={() => setShow3D(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${!show3D ? "bg-dona text-white border-dona" : "bg-card text-muted-foreground border-border hover:border-dona/50"}`}
            >
              <MapIcon className="w-3.5 h-3.5 inline mr-1" /> Mappa 2D
            </button>
            <button
              onClick={() => setShow3D(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${show3D ? "bg-dona text-white border-dona" : "bg-card text-muted-foreground border-border hover:border-dona/50"}`}
            >
              🏔️ Vista 3D
            </button>
          </div>

          {/* Mappa */}
          {show3D ? (
            <Suspense fallback={
              <div className="flex items-center justify-center rounded-xl bg-card border border-border" style={{ height: 440 }}>
                <Loader2 className="w-6 h-6 animate-spin text-dona" />
              </div>
            }>
              <RouteMap3D
                coords={route.coords}
                waypoints={tappe.map(t => ({ lat: t.lat, lng: t.lng, label: t.label }))}
                elevationPoints={elevationData?.points}
              />
            </Suspense>
          ) : (
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 440 }}>
            <MapContainer
              center={route.coords[Math.floor(route.coords.length / 2)]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <LayersControl position="topright">
                {(Object.entries(TILE_LAYERS) as [TileKey, typeof TILE_LAYERS[TileKey]][]).map(
                  ([key, layer]) => (
                    <LayersControl.BaseLayer
                      key={key}
                      checked={key === "street"}
                      name={layer.name}
                    >
                      <TileLayer
                        url={layer.url}
                        attribution={layer.attribution}
                        maxZoom={layer.maxZoom}
                      />
                    </LayersControl.BaseLayer>
                  ),
                )}
              </LayersControl>
              <MapFit coords={route.coords} />
              <Polyline positions={route.coords} color="#ef4444" weight={3} opacity={0.85} />
              {tappe.map((t) => {
                const isStart = t.tappaNum === 0, isEnd = t.label === "Arrivo";
                const color   = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#f97316";
                const lbl     = isStart ? "P" : isEnd ? "A" : String(t.tappaNum);
                return (
                  <Marker key={`${t.tappaNum}-${t.lat}`} position={[t.lat, t.lng]} icon={makeIcon(color, lbl)}>
                    <Popup>
                      <strong>{t.label}</strong><br />
                      Km progressivi: <strong>{t.kmProgr.toFixed(1)}</strong><br />
                      <span className="text-xs text-gray-500">{t.lat.toFixed(5)}, {t.lng.toFixed(5)}</span>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
          )}

          {/* Profilo altimetrico */}
          {elevLoading && (
            <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-dona" />
              <span className="text-xs text-muted-foreground font-body">Caricamento dati altimetrici…</span>
            </div>
          )}
          {elevationData && (
            <Suspense fallback={null}>
              <ElevationProfile
                points={elevationData.points}
                stats={elevationData.stats}
                totalDistanceKm={route!.distanceM / 1000}
              />
            </Suspense>
          )}

          {/* Lista tappe */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-dona" />
                {tappe.length} waypoint ({mode === "running" ? "corsa" : "a piedi"})
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setRoute(null); setTappe([]); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <button onClick={copyTappe}
                  className="text-[10px] text-dona hover:opacity-80 flex items-center gap-1 transition-colors">
                  {copied
                    ? <><CheckCircle2 className="w-3 h-3" /> Copiato!</>
                    : <><Copy className="w-3 h-3" /> Copia coordinate</>
                  }
                </button>
              </div>
            </div>

            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {tappe.map((t, i) => {
                const nextKm = tappe[i + 1]?.kmProgr ?? t.kmProgr;
                const segKm  = i < tappe.length - 1 ? (nextKm - t.kmProgr).toFixed(1) : "—";
                const isStart = t.tappaNum === 0, isEnd = t.label === "Arrivo";
                return (
                  <div key={`${t.tappaNum}-${t.lat}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: isStart ? "#22c55e" : isEnd ? "#ef4444" : "#f97316" }}>
                      {isStart ? "P" : isEnd ? "A" : t.tappaNum}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        km {t.kmProgr.toFixed(1)}{!isEnd && ` · prossima: ${segKm} km`}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {t.lat.toFixed(4)},{t.lng.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Salva percorso localmente */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-dona" />
              Salva percorso per dopo
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome percorso (opzionale)"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40"
              />
              <button
                onClick={savePercorsoLocal}
                className="flex items-center gap-1.5 bg-dona text-white rounded-lg px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                Salva
              </button>
            </div>
          </div>

          {/* Pubblica percorso sul sito (admin) */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold text-foreground">Pubblica percorso sul sito</p>
            <p className="text-[10px] text-muted-foreground">Inserisci il PIN admin per salvare questo percorso e renderlo visibile sulla pagina pubblica.</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="PIN admin"
                value={savePin}
                onChange={e => setSavePin(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40"
              />
              <button
                onClick={savePercorsoServer}
                disabled={saving || !savePin}
                className="flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Pubblica
              </button>
            </div>
            {saveMsg && (
              <p className={`text-xs rounded-lg px-3 py-2 ${saveMsg.ok ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                {saveMsg.text}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
