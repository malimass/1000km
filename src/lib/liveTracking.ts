/**
 * liveTracking.ts
 * ────────────────
 * Helper per salvare e leggere la posizione GPS live su Supabase.
 *
 * Tabella richiesta: public.live_position
 * → vedi live_position.sql nella root del progetto per crearla.
 */

import { supabase } from "./supabase";

export type LivePosition = {
  lat:        number;
  lng:        number;
  speed:      number | null;   // m/s
  accuracy:   number | null;   // metri
  heading:    number | null;   // gradi 0–360
  updated_at: string;
  is_active:  boolean;
};

/**
 * Salva (upsert) la posizione e/o lo stato attivo su Supabase.
 * Usa sempre id=1 (tabella a riga singola).
 */
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

/**
 * Carica l'ultima posizione nota (chiamata una volta al mount).
 * Restituisce null se Supabase non è configurato o la riga non esiste.
 */
export async function loadLivePosition(): Promise<LivePosition | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("live_position")
    .select("*")
    .eq("id", 1)
    .single();
  return (data as LivePosition) ?? null;
}

/**
 * Si iscrive agli aggiornamenti Realtime di live_position.
 * Restituisce una funzione di cleanup (da chiamare nell'useEffect return).
 */
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
