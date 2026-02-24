/**
 * liveTracking.ts
 * ────────────────
 * Helper per GPS live e registrazione del percorso su Supabase.
 *
 * Tabelle richieste: vedi live_position.sql nella root del progetto.
 *
 *  • live_position   — riga singola (id=1), posizione corrente in tempo reale
 *  • route_positions — append-only, ogni ~30 m o 60 s → disegna la traccia
 */

import { supabase } from "./supabase";

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
};

// ─── live_position ─────────────────────────────────────────────────────────────

/** Upsert posizione corrente e/o stato is_active. */
export async function upsertLivePosition(
  fields: Partial<Omit<LivePosition, "updated_at">>,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("live_position").upsert({
    id: 1,
    ...fields,
    updated_at: new Date().toISOString(),
  });
}

/** Carica l'ultima posizione nota (al mount della pagina pubblica). */
export async function loadLivePosition(): Promise<LivePosition | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("live_position")
    .select("*")
    .eq("id", 1)
    .single();
  return (data as LivePosition) ?? null;
}

/** Sottoscrizione Realtime a live_position. Ritorna cleanup. */
export function subscribeLivePosition(
  cb: (pos: LivePosition) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("live-position-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_position" },
      (payload) => cb(payload.new as LivePosition),
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

// ─── route_positions ───────────────────────────────────────────────────────────

/** session_id = data del giorno corrente (es. "2026-04-18"). */
export function todaySessionId(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Aggiunge un punto alla traccia. */
export async function appendRoutePoint(
  lat: number,
  lng: number,
  speed: number | null,
  accuracy: number | null,
  heading: number | null,
  sessionId: string,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("route_positions").insert({
    lat, lng, speed, accuracy, heading,
    session_id: sessionId,
    recorded_at: new Date().toISOString(),
  });
}

/**
 * Carica tutti i punti della traccia per le sessioni fornite
 * (default: sessione di oggi). Ordinati per tempo crescente.
 */
export async function loadRoutePositions(
  sessionIds?: string[],
): Promise<RoutePoint[]> {
  if (!supabase) return [];
  const ids = sessionIds ?? [todaySessionId()];
  const { data } = await supabase
    .from("route_positions")
    .select("id, lat, lng, recorded_at, session_id")
    .in("session_id", ids)
    .order("recorded_at", { ascending: true });
  return (data as RoutePoint[]) ?? [];
}

/** Sottoscrizione Realtime a nuovi punti della traccia. Ritorna cleanup. */
export function subscribeRoutePositions(
  cb: (point: RoutePoint) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("route-positions-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "route_positions" },
      (payload) => cb(payload.new as RoutePoint),
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

// ─── Utility distanza (Haversine) ─────────────────────────────────────────────

/** Distanza in metri tra due coordinate [lat, lng]. */
export function distanceMeters(
  a: [number, number],
  b: [number, number],
): number {
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
