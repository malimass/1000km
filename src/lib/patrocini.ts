/**
 * patrocini.ts
 * ────────────
 * Carica e salva i dati della pagina "Patrocini istituzionali" via Neon API Routes.
 * Fallback su localStorage.
 */

import { apiFetch, getAuthToken } from "./api";

export type Patrocinio = {
  id:      string;
  nome:    string;
  logoUrl: string;
  siteUrl?: string;
};

export type PatrociniPage = {
  title: string;
  intro: string;
  items: Patrocinio[];
};

const LS_KEY = "gp_patrocini_page";

export const PATROCINI_DEFAULTS: PatrociniPage = {
  title: "Patrocini istituzionali",
  intro: "",
  items: [],
};

export function lsLoadPatrocini(): PatrociniPage {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...PATROCINI_DEFAULTS };
    return { ...PATROCINI_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...PATROCINI_DEFAULTS };
  }
}

export function lsSavePatrocini(data: PatrociniPage): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

export async function loadPatrociniPage(): Promise<PatrociniPage> {
  try {
    const res = await fetch("/api/patrocini");
    if (!res.ok) return lsLoadPatrocini();
    const data = await res.json();
    const page = { ...PATROCINI_DEFAULTS, ...(data as Partial<PatrociniPage>) };
    lsSavePatrocini(page);
    return page;
  } catch {
    return lsLoadPatrocini();
  }
}

export async function savePatrociniPage(page: PatrociniPage): Promise<void> {
  lsSavePatrocini(page);
  if (!getAuthToken()) return;
  try {
    await apiFetch("/api/patrocini", {
      method: "POST",
      body: JSON.stringify(page),
    });
  } catch { /* noop */ }
}
