/**
 * sostenitori.ts
 * ──────────────
 * Carica e salva i dati della pagina "Sostenitori del cammino".
 * Strategia ibrida: Supabase (fonte di verità) + localStorage (cache/fallback).
 *
 * Tabella Supabase richiesta (esegui nel SQL Editor):
 *
 *   create table if not exists public.sostenitori_page (
 *     id          integer primary key default 1,
 *     data        jsonb not null default '{}',
 *     updated_at  timestamptz default now()
 *   );
 *   alter table public.sostenitori_page enable row level security;
 *   create policy "public read"  on public.sostenitori_page for select using (true);
 *   create policy "write all"    on public.sostenitori_page for all    using (true) with check (true);
 *   insert into public.sostenitori_page (id, data)
 *     values (1, '{"title":"I Sostenitori del Cammino","intro":"","items":[]}')
 *     on conflict (id) do nothing;
 */

import { supabase } from "./supabase";

export type Sostenitore = {
  id:      string;   // crypto.randomUUID()
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
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

/** Carica la pagina sostenitori. Priorità: Supabase → localStorage. */
export async function loadSosteniPage(): Promise<SosteniPage> {
  if (!supabase) return lsLoadSosteni();
  const { data, error } = await supabase
    .from("sostenitori_page")
    .select("data")
    .eq("id", 1)
    .single();
  if (error || !data) return lsLoadSosteni();
  const page = { ...SOSTENI_DEFAULTS, ...(data.data as Partial<SosteniPage>) };
  lsSaveSosteni(page); // aggiorna cache locale
  return page;
}

/** Salva sia su Supabase che in localStorage. */
export async function saveSosteniPage(page: SosteniPage): Promise<void> {
  lsSaveSosteni(page);
  if (!supabase) return;
  await supabase.from("sostenitori_page").upsert({
    id:         1,
    data:       page,
    updated_at: new Date().toISOString(),
  });
}
