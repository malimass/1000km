/**
 * GPX export utilities — generates GPX files from route coordinates.
 * Compatible with Amazfit Active 2 and other GPS watches/apps.
 */

export interface TappaPoint {
  tappaNum: number;
  lat: number;
  lng: number;
  kmProgr: number;
  label: string;
}

/**
 * Build a GPX XML string from an array of [lat, lng] coordinates.
 */
export function buildGpx(
  coords: [number, number][],
  name: string,
  description?: string,
): string {
  const trkpts = coords
    .map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="1000km di Gratitudine"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>${description ? `\n    <desc>${escapeXml(description)}</desc>` : ""}
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Extract the coords slice for a single tappa (between two consecutive TappaPoints).
 */
export function sliceTappa(
  allCoords: [number, number][],
  tappe: TappaPoint[],
  tappaIndex: number,
): [number, number][] {
  if (tappaIndex < 0 || tappaIndex >= tappe.length - 1) return [];

  const startPt = tappe[tappaIndex];
  const endPt = tappe[tappaIndex + 1];

  // Find closest coord index to each tappa point
  const startIdx = findClosestIndex(allCoords, startPt.lat, startPt.lng);
  const endIdx = findClosestIndex(allCoords, endPt.lat, endPt.lng);

  if (startIdx >= endIdx) return [];
  return allCoords.slice(startIdx, endIdx + 1);
}

/**
 * Download a string as a file in the browser.
 */
export function downloadFile(content: string, filename: string, mime = "application/gpx+xml") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a single tappa as GPX.
 */
export function downloadTappaGpx(
  allCoords: [number, number][],
  tappe: TappaPoint[],
  tappaIndex: number,
) {
  const coords = sliceTappa(allCoords, tappe, tappaIndex);
  if (!coords.length) return;

  const start = tappe[tappaIndex];
  const end = tappe[tappaIndex + 1];
  const km = Math.round(end.kmProgr - start.kmProgr);
  const name = `Tappa ${start.tappaNum + 1} — ${start.label} → ${end.label}`;
  const gpx = buildGpx(coords, name, `${km} km`);
  const filename = `tappa-${String(start.tappaNum + 1).padStart(2, "0")}-${sanitize(start.label)}-${sanitize(end.label)}.gpx`;
  downloadFile(gpx, filename);
}

/**
 * Download the full route as a single GPX.
 */
export function downloadFullRouteGpx(coords: [number, number][]) {
  const gpx = buildGpx(coords, "1000 km di Gratitudine — Percorso completo", "Bologna → Terranova Sappo Minulio");
  downloadFile(gpx, "1000km-percorso-completo.gpx");
}

// ── helpers ──

function findClosestIndex(coords: [number, number][], lat: number, lng: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = (coords[i][0] - lat) ** 2 + (coords[i][1] - lng) ** 2;
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sanitize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "");
}
