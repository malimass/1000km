-- ─────────────────────────────────────────────────────────────────────────────
-- Gratitude Path — Tabella live_position
-- Esegui questo script nel SQL Editor di Supabase Dashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Crea la tabella (singola riga, id sempre = 1)
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

-- 2. Abilita RLS
alter table public.live_position enable row level security;

-- 3. Chiunque può leggere (pagina pubblica)
create policy "public read live_position"
  on public.live_position for select
  using (true);

-- 4. Solo utenti autenticati possono scrivere (admin)
create policy "auth write live_position"
  on public.live_position for all
  using (auth.role() = 'authenticated');

-- 5. Inserisci la riga iniziale
insert into public.live_position (id, is_active)
values (1, false)
on conflict (id) do nothing;

-- 6. Abilita Supabase Realtime su questa tabella
alter publication supabase_realtime add table public.live_position;
