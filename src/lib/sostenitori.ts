/**
 * sostenitori.ts
 * ──────────────
 * Carica e salva i dati della pagina "Sostenitori del cammino" via Neon API Routes.
 * Fallback su localStorage.
 */

import { apiFetch } from "./supabase";

export type Sostenitore = {
  id:      string;
  nome:    string;
  testo:   string;
  logoUrl: string;
};

export type SosteniPage = {
  title: string;
  intro: string;
  items: Sostenitore[];
};

const LS_KEY = "gp_sostenitori_page";

export const SOSTENI_DEFAULTS: SosteniPage = {
  title: "I Sostenitori del Cammino",
  intro: "",
  items: [],
};

export function lsLoadSosteni(): SosteniPage {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...SOSTENI_DEFAULTS };
    return { ...SOSTENI_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...SOSTENI_DEFAULTS };
  }
}

export function lsSaveSosteni(data: SosteniPage): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

export async function loadSosteniPage(): Promise<SosteniPage> {
  try {
    const res = await fetch("/api/sostenitori");
    if (!res.ok) return lsLoadSosteni();
    const data = await res.json();
    const page = { ...SOSTENI_DEFAULTS, ...(data as Partial<SosteniPage>) };
    lsSaveSosteni(page);
    return page;
  } catch {
    return lsLoadSosteni();
  }
}

export async function saveSosteniPage(page: SosteniPage): Promise<void> {
  lsSaveSosteni(page);
  try {
    await apiFetch("/api/sostenitori", {
      method: "POST",
      body: JSON.stringify(page),
    });
  } catch { /* noop */ }
}
