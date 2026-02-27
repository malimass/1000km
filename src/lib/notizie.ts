/**
 * notizie.ts — Helper Supabase per news feed, raccolta fondi e servizi.
 */

import { supabase } from "./supabase";

// ─── Notizie ─────────────────────────────────────────────────────────────────

export type Categoria = "generale" | "tappa" | "emergenza" | "raccolta";

export interface Notizia {
  id:           string;
  titolo:       string;
  corpo:        string;
  immagine_url: string | null;
  categoria:    Categoria;
  tappa_num:    number | null;
  pubblicata:   boolean;
  created_at:   string;
  updated_at:   string;
}

/** Carica le ultime N notizie pubblicate, ordinate dalla più recente. */
export async function loadNotizie(limit = 30): Promise<Notizia[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("notizie")
    .select("*")
    .eq("pubblicata", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Notizia[]) ?? [];
}

/** Sottoscrizione Realtime al feed notizie. */
export function subscribeNotizie(cb: (n: Notizia) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("notizie-feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notizie" },
      (payload) => {
        const n = payload.new as Notizia;
        if (n.pubblicata) cb(n);
      },
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

/** (Admin) Pubblica una nuova notizia. */
export async function pubblicaNotizia(
  n: Omit<Notizia, "id" | "created_at" | "updated_at">,
): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("notizie").insert(n);
  return error?.message ?? null;
}

/** (Admin) Aggiorna una notizia esistente. */
export async function aggiornaNotizia(
  id: string,
  patch: Partial<Omit<Notizia, "id" | "created_at">>,
): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase
    .from("notizie")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  return error?.message ?? null;
}

/** (Admin) Elimina una notizia. */
export async function eliminaNotizia(id: string): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("notizie").delete().eq("id", id);
  return error?.message ?? null;
}

// ─── Raccolta fondi ──────────────────────────────────────────────────────────

export interface RaccoltaFondi {
  importo_euro: number;
  target_euro:  number;
  donatori:     number;
  updated_at:   string;
}

export async function loadRaccoltaFondi(): Promise<RaccoltaFondi | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("raccolta_fondi")
    .select("importo_euro, target_euro, donatori, updated_at")
    .eq("id", 1)
    .single();
  return (data as RaccoltaFondi) ?? null;
}

export function subscribeRaccoltaFondi(
  cb: (r: RaccoltaFondi) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("raccolta-fondi-channel")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "raccolta_fondi" },
      (payload) => { cb(payload.new as RaccoltaFondi); },
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

/** (Admin) Aggiorna i dati della raccolta fondi. */
export async function aggiornaRaccolta(
  importo_euro: number,
  donatori: number,
): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase
    .from("raccolta_fondi")
    .update({ importo_euro, donatori, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return error?.message ?? null;
}

// ─── Push Tokens ─────────────────────────────────────────────────────────────

/** Salva il token push (FCM/APNs) per l'utente corrente. */
export async function savePushToken(
  userId: string,
  token: string,
  platform: "android" | "ios" | "web",
): Promise<void> {
  if (!supabase) return;
  await supabase.from("push_tokens").upsert(
    { user_id: userId, token, platform, updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
}
