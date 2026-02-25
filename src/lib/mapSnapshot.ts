/**
 * mapSnapshot.ts
 * ──────────────
 * Genera un'immagine statica della mappa del percorso tramite Geoapify Static Maps API.
 * Restituisce la URL dell'immagine, pronta per l'anteprima e l'upload su Cloudinary.
 *
 * Variabile richiesta: VITE_GEOAPIFY_API_KEY
 */

// Coordinate delle 15 tappe (Bologna → Terranova Sappo Minulio) in [lat, lng]
const ROUTE_WAYPOINTS: [number, number][] = [
  [44.4949, 11.3426], // Bologna
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

/**
 * Genera l'URL della mappa statica Geoapify con il percorso Bologna→Terranova
 * e, se disponibile, il marker della posizione attuale del runner.
 *
 * @param lat  Latitudine posizione attuale (opzionale)
 * @param lng  Longitudine posizione attuale (opzionale)
 * @returns    URL dell'immagine oppure null se VITE_GEOAPIFY_API_KEY non è configurata
 */
export function captureMapScreenshot(options?: {
  lat?: number | null;
  lng?: number | null;
}): string | null {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined;
  if (!apiKey) return null;

  // Geoapify usa ordine lon,lat nelle coordinate
  const pathCoords = ROUTE_WAYPOINTS.map(([la, lo]) => `${lo},${la}`).join(",");

  const start = ROUTE_WAYPOINTS[0];
  const end = ROUTE_WAYPOINTS[ROUTE_WAYPOINTS.length - 1];

  // Centro approssimativo del percorso (metà Italia)
  let url = `https://maps.geoapify.com/v1/staticmap`;
  url += `?style=osm-carto`;
  url += `&width=1200&height=630`;
  url += `&center=lonlat:13.73,41.43`;
  url += `&zoom=6`;

  // Linea del percorso in rosso
  url += `&geometry=polyline:${pathCoords};linewidth:5;linecolor:%23e11d48`;

  // Marker partenza (verde) e arrivo (rosso)
  url += `&marker=lonlat:${start[1]},${start[0]};color:%23059669;size:small;text:P`;
  url += `&marker=lonlat:${end[1]},${end[0]};color:%23e11d48;size:small;text:A`;

  // Marker posizione attuale runner (blu)
  if (options?.lat != null && options?.lng != null) {
    url += `&marker=lonlat:${options.lng},${options.lat};color:%232563eb;size:medium;text:1`;
  }

  url += `&apiKey=${apiKey}`;

  return url;
}
