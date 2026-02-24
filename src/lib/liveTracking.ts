/**
 * liveTracking.ts
 * ────────────────
 * Helper per GPS live e registrazione del percorso su Supabase.
 *
 * Tabelle richieste: vedi live_position.sql nella root del progetto.
 *
 *  • live_position   — due righe (id=1 corridore 1, id=2 corridore 2)
 *  • route_positions — append-only con colonna runner_id
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
  runner_id:   number;
};

// ─── live_position ─────────────────────────────────────────────────────────────

/** Upsert posizione corrente per il corridore specificato (1 o 2). */
export async function upsertLivePosition(
  fields: Partial<Omit<LivePosition, "updated_at">>,
  runnerId: 1 | 2 = 1,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("live_position").upsert({
    id: runnerId,
    ...fields,
    updated_at: new Date().toISOString(),
  });
}

/** Carica l'ultima posizione nota di un corridore. */
export async function loadLivePosition(runnerId: 1 | 2 = 1): Promise<LivePosition | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("live_position")
    .select("*")
    .eq("id", runnerId)
    .single();
  return (data as LivePosition) ?? null;
}

/** Carica le posizioni di entrambi i corridori. */
export async function loadAllLivePositions(): Promise<{ 1: LivePosition | null; 2: LivePosition | null }> {
  if (!supabase) return { 1: null, 2: null };
  const { data } = await supabase
    .from("live_position")
    .select("*")
    .in("id", [1, 2]);
  const result: { 1: LivePosition | null; 2: LivePosition | null } = { 1: null, 2: null };
  (data ?? []).forEach((row: LivePosition & { id: number }) => {
    result[row.id as 1 | 2] = row;
  });
  return result;
}

/**
 * Sottoscrizione Realtime a live_position (entrambi i corridori).
 * Il callback riceve l'id del corridore e la nuova posizione.
 * Ritorna cleanup.
 */
export function subscribeLivePosition(
  cb: (runnerId: 1 | 2, pos: LivePosition) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("live-position-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_position" },
      (payload) => {
        const row = payload.new as LivePosition & { id: number };
        cb(row.id as 1 | 2, row);
      },
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

// ─── route_positions ───────────────────────────────────────────────────────────

/** session_id = data del giorno corrente (es. "2026-04-18"). */
export function todaySessionId(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Aggiunge un punto alla traccia del corridore specificato. */
export async function appendRoutePoint(
  lat: number,
  lng: number,
  speed: number | null,
  accuracy: number | null,
  heading: number | null,
  sessionId: string,
  runnerId: 1 | 2 = 1,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("route_positions").insert({
    lat, lng, speed, accuracy, heading,
    session_id: sessionId,
    recorded_at: new Date().toISOString(),
    runner_id: runnerId,
  });
}

/**
 * Carica tutti i punti della traccia per le sessioni fornite,
 * opzionalmente filtrati per corridore. Ordinati per tempo crescente.
 */
export async function loadRoutePositions(
  sessionIds?: string[],
  runnerId?: 1 | 2,
): Promise<RoutePoint[]> {
  if (!supabase) return [];
  const ids = sessionIds ?? [todaySessionId()];
  let query = supabase
    .from("route_positions")
    .select("id, lat, lng, recorded_at, session_id, runner_id")
    .in("session_id", ids)
    .order("recorded_at", { ascending: true });
  if (runnerId !== undefined) query = query.eq("runner_id", runnerId);
  const { data } = await query;
  return (data as RoutePoint[]) ?? [];
}

/** Sottoscrizione Realtime a nuovi punti, opzionalmente filtrati per corridore. */
export function subscribeRoutePositions(
  cb: (point: RoutePoint) => void,
  runnerId?: 1 | 2,
): () => void {
  if (!supabase) return () => {};
  const channelName = runnerId
    ? `route-positions-channel-${runnerId}`
    : "route-positions-channel";
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "route_positions" },
      (payload) => {
        const pt = payload.new as RoutePoint;
        if (runnerId === undefined || pt.runner_id === runnerId) cb(pt);
      },
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
