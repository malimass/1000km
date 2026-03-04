/**
 * liveTracking.ts
 * ────────────────
 * Helper GPS live e traccia percorso via Neon API Routes.
 * Il realtime Supabase è sostituito da polling (setInterval).
 */

import { apiFetch } from "./supabase";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type LivePosition = {
  lat:        number;
  lng:        number;
  speed:      number | null;
  accuracy:   number | null;
  heading:    number | null;
  updated_at: string;
  is_active:  boolean;
};

export type RoutePoint = {
  id:          number;
  lat:         number;
  lng:         number;
  recorded_at: string;
  session_id:  string;
  runner_id:   number;
};

// ─── live_position ─────────────────────────────────────────────────────────────

export async function upsertLivePosition(
  fields: Partial<Omit<LivePosition, "updated_at">>,
  runnerId: 1 | 2 = 1,
): Promise<string | null> {
  try {
    const res = await apiFetch("/api/live-position", {
      method: "POST",
      body: JSON.stringify({ runner_id: runnerId, ...fields }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

export async function loadLivePosition(runnerId: 1 | 2 = 1): Promise<LivePosition | null> {
  try {
    const res = await fetch(`/api/live-position?runner_id=${runnerId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function loadAllLivePositions(): Promise<{ 1: LivePosition | null; 2: LivePosition | null }> {
  try {
    const res = await fetch("/api/live-position");
    if (!res.ok) return { 1: null, 2: null };
    return await res.json();
  } catch { return { 1: null, 2: null }; }
}

/**
 * Polling ogni 5 s su live_position (sostituisce Supabase Realtime).
 * Ritorna cleanup.
 */
export function subscribeLivePosition(
  cb: (runnerId: 1 | 2, pos: LivePosition) => void,
): () => void {
  let prev1: string | null = null;
  let prev2: string | null = null;

  const poll = async () => {
    const all = await loadAllLivePositions();
    for (const id of [1, 2] as const) {
      const pos = all[id];
      if (!pos) continue;
      const key = id === 1 ? prev1 : prev2;
      if (pos.updated_at !== key) {
        if (id === 1) prev1 = pos.updated_at;
        else          prev2 = pos.updated_at;
        cb(id, pos);
      }
    }
  };

  poll();
  const timer = setInterval(poll, 5_000);
  return () => clearInterval(timer);
}

// ─── route_positions ───────────────────────────────────────────────────────────

export function todaySessionId(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function appendRoutePoint(
  lat: number,
  lng: number,
  speed: number | null,
  accuracy: number | null,
  heading: number | null,
  sessionId: string,
  runnerId: 1 | 2 = 1,
): Promise<string | null> {
  try {
    const res = await apiFetch("/api/route-positions", {
      method: "POST",
      body: JSON.stringify({ lat, lng, speed, accuracy, heading, session_id: sessionId, runner_id: runnerId }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

export async function loadRoutePositions(
  sessionIds?: string[],
  runnerId?: 1 | 2,
): Promise<RoutePoint[]> {
  try {
    const ids = (sessionIds ?? [todaySessionId()]).join(",");
    const url = runnerId
      ? `/api/route-positions?session_ids=${ids}&runner_id=${runnerId}`
      : `/api/route-positions?session_ids=${ids}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

/**
 * Polling ogni 10 s su route_positions (sostituisce Supabase Realtime).
 * Ritorna cleanup.
 */
export function subscribeRoutePositions(
  cb: (point: RoutePoint) => void,
  runnerId?: 1 | 2,
): () => void {
  const seen = new Set<number>();

  const poll = async () => {
    const points = await loadRoutePositions([todaySessionId()], runnerId);
    for (const p of points) {
      if (!seen.has(p.id)) { seen.add(p.id); cb(p); }
    }
  };

  poll();
  const timer = setInterval(poll, 10_000);
  return () => clearInterval(timer);
}

export async function clearRoutePositions(
  sessionId: string,
  runnerId: 1 | 2,
): Promise<string | null> {
  try {
    const res = await apiFetch(
      `/api/route-positions?session_id=${sessionId}&runner_id=${runnerId}`,
      { method: "DELETE" }
    );
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

// ─── Utility distanza (Haversine) ─────────────────────────────────────────────

export function distanceMeters(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const φ1 = (a[0] * Math.PI) / 180;
  const φ2 = (b[0] * Math.PI) / 180;
  const Δφ = ((b[0] - a[0]) * Math.PI) / 180;
  const Δλ = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
