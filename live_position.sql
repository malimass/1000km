-- ─────────────────────────────────────────────────────────────────────────────
-- Gratitude Path — Tabelle GPS live
-- Esegui questo script nel SQL Editor di Supabase Dashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ TABELLA 1: live_position (posizione corrente, riga singola) ═══════════════

create table if not exists public.live_position (
  id          smallint primary key default 1,
  lat         double precision,
  lng         double precision,
  speed       real,            -- m/s (null se non disponibile)
  accuracy    real,            -- metri
  heading     real,            -- gradi 0-360 (null se fermo)
  updated_at  timestamptz default now(),
  is_active   boolean default false,
  constraint single_row check (id = 1)
);

alter table public.live_position enable row level security;

create policy "public read live_position"
  on public.live_position for select using (true);

create policy "auth write live_position"
  on public.live_position for all using (auth.role() = 'authenticated');

insert into public.live_position (id, is_active)
values (1, false)
on conflict (id) do nothing;

alter publication supabase_realtime add table public.live_position;


-- ══ TABELLA 2: route_positions (traccia percorso, append-only) ═══════════════
-- Un record viene aggiunto ogni ~30 m di spostamento oppure ogni 60 secondi.
-- session_id = data del giorno (es. "2026-04-18") per raggruppare per tappa.

create table if not exists public.route_positions (
  id          bigserial primary key,
  lat         double precision not null,
  lng         double precision not null,
  speed       real,
  accuracy    real,
  heading     real,
  recorded_at timestamptz default now(),
  session_id  text not null          -- es. "2026-04-18"
);

create index if not exists route_positions_session_idx
  on public.route_positions (session_id, recorded_at);

alter table public.route_positions enable row level security;

create policy "public read route_positions"
  on public.route_positions for select using (true);

create policy "auth write route_positions"
  on public.route_positions for all using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.route_positions;
