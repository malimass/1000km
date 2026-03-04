/**
 * PercorsoBuilder.tsx
 * ───────────────────
 * Tool admin per pianificare un percorso pedonale/di corsa tra due indirizzi,
 * suddividerlo in tappe di N km e visualizzarle su mappa Leaflet.
 *
 * APIs Google Maps (JS SDK — niente CORS):
 *  - AutocompleteSuggestion → suggerimenti mentre si digita
 *  - Geocoder               → converte indirizzo in coordinate
 *  - Routes API (Route.computeRoutes) → calcola percorso a piedi
 *
 * Richiede: VITE_GOOGLE_MAPS_API_KEY nel file .env
 * Abilita su Cloud Console: Routes API, Geocoding API, Places API
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search, Navigation, Loader2, MapPin, Route, RotateCcw, Copy, CheckCircle2,
  AlertCircle,
} from "lucide-react";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

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

// ─── Decode Google Encoded Polyline ──────────────────────────────────────────

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat * 1e-5, lng * 1e-5]);
  }
  return points;
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

// ─── Google Routes API JS SDK (nuova API, niente CORS) ───────────────────────

async function googleDirections(start: [number, number], end: [number, number]): Promise<RouteResult | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Route } = await (window as any).google.maps.importLibrary("routes");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await Route.computeRoutes({
      origin:      { location: { latLng: { latitude: start[0], longitude: start[1] } } },
      destination: { location: { latLng: { latitude: end[0],   longitude: end[1]   } } },
      travelMode:  "WALK",
      languageCode: "it",
      units: "METRIC",
    });
    if (!response?.routes?.length) return null;
    const route    = response.routes[0];
    const encoded  = route.polyline?.encodedPolyline;
    if (!encoded) return null;
    const coords    = decodePolyline(encoded);
    const distanceM = route.distanceMeters ?? 0;
    return { coords, distanceM };
  } catch {
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
  const [kmPerTappa, setKmPerTappa] = useState(70);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [route,  setRoute]  = useState<RouteResult | null>(null);
  const [tappe,  setTappe]  = useState<TappaPoint[]>([]);
  const [copied, setCopied] = useState(false);

  const [mapsReady,    setMapsReady]    = useState(false);
  const [partenzaSugg, setPartenzaSugg] = useState<Suggestion[]>([]);
  const [arrivoSugg,   setArrivoSugg]   = useState<Suggestion[]>([]);

  const noKey         = !GOOGLE_KEY;
  const partenzaTimer = useRef<ReturnType<typeof setTimeout>>();
  const arrivoTimer   = useRef<ReturnType<typeof setTimeout>>();

  // ── Carica Google Maps JS SDK ─────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_KEY) return;
    loadGoogleMapsScript(GOOGLE_KEY).then(() => setMapsReady(true)).catch(() => {});
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

    setLoading(true); setError(null); setRoute(null); setTappe([]);

    const [startC, endC] = await Promise.all([
      googleGeocode(partenza),
      googleGeocode(arrivo),
    ]);
    if (!startC) { setError(`Indirizzo non trovato: "${partenza}"`); setLoading(false); return; }
    if (!endC)   { setError(`Indirizzo non trovato: "${arrivo}"`);   setLoading(false); return; }

    const result = await googleDirections(startC, endC);
    if (!result) { setError("Google non ha trovato un percorso. Prova indirizzi più precisi."); setLoading(false); return; }

    setRoute(result);
    setTappe(splitByKm(result.coords, kmPerTappa));
    setLoading(false);
  }, [partenza, arrivo, kmPerTappa, noKey, mapsReady]);

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
      <div>
        <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
          <Route className="w-4 h-4 text-dona" />
          Crea Percorso
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Percorso a piedi / di corsa calcolato da Google Maps. Evita automaticamente autostrade, tangenziali e strade a scorrimento veloce.
        </p>
      </div>

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
        <p className="text-[10px] text-muted-foreground -mt-2">
          Entrambe le modalità usano il routing pedonale Google (strade sicure, niente autostrade).
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
          {loading ? "Calcolo in corso…" : "Calcola percorso con Google Maps"}
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

          {/* Mappa */}
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 440 }}>
            <MapContainer
              center={route.coords[Math.floor(route.coords.length / 2)]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
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
        </>
      )}
    </div>
  );
}
