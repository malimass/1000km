/**
 * notizie.ts — News feed e raccolta fondi via Neon API Routes.
 * Il "realtime" è sostituito da polling (setInterval).
 */

import { apiFetch } from "./supabase";

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

export async function loadNotizie(limit = 30): Promise<Notizia[]> {
  try {
    const res = await fetch("/api/notizie");
    if (!res.ok) return [];
    const data = await res.json();
    return (data as Notizia[]).slice(0, limit);
  } catch {
    return [];
  }
}

/** Polling ogni 30 s — chiama cb per ogni notizia nuova. Ritorna cleanup. */
export function subscribeNotizie(cb: (n: Notizia) => void): () => void {
  const lastSeen = new Set<string>();

  const poll = async () => {
    const list = await loadNotizie(30);
    for (const n of list) {
      if (!lastSeen.has(n.id)) { cb(n); lastSeen.add(n.id); }
    }
  };

  poll();
  const timer = setInterval(poll, 30_000);
  return () => clearInterval(timer);
}

export async function pubblicaNotizia(
  n: Omit<Notizia, "id" | "created_at" | "updated_at">
): Promise<string | null> {
  try {
    const res = await apiFetch("/api/notizie", { method: "POST", body: JSON.stringify(n) });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

export async function aggiornaNotizia(
  id: string,
  patch: Partial<Omit<Notizia, "id" | "created_at">>
): Promise<string | null> {
  try {
    const res = await apiFetch("/api/notizie", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

export async function eliminaNotizia(id: string): Promise<string | null> {
  try {
    const res = await apiFetch(`/api/notizie?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

// ─── Raccolta fondi ──────────────────────────────────────────────────────────

export interface RaccoltaFondi {
  importo_euro: number;
  target_euro:  number;
  donatori:     number;
  updated_at:   string;
}

export async function loadRaccoltaFondi(): Promise<RaccoltaFondi | null> {
  try {
    const res = await fetch("/api/raccolta-fondi");
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Polling ogni 30 s. Ritorna cleanup. */
export function subscribeRaccoltaFondi(cb: (r: RaccoltaFondi) => void): () => void {
  let lastAt = "";
  const poll = async () => {
    const data = await loadRaccoltaFondi();
    if (data && data.updated_at !== lastAt) { lastAt = data.updated_at; cb(data); }
  };
  poll();
  const timer = setInterval(poll, 30_000);
  return () => clearInterval(timer);
}

export async function aggiornaRaccolta(
  importo_euro: number,
  donatori: number
): Promise<string | null> {
  try {
    const res = await apiFetch("/api/raccolta-fondi", {
      method: "PATCH",
      body: JSON.stringify({ importo_euro, donatori }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

// ─── Push Tokens ─────────────────────────────────────────────────────────────

export async function savePushToken(
  userId: string,
  token: string,
  platform: "android" | "ios" | "web"
): Promise<void> {
  // Implementazione futura tramite API route dedicata.
  console.log("[push token]", { userId, token, platform });
}
