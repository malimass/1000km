-- ============================================================
-- COMMUNITY SCHEMA — 1000km di Gratitudine
-- Da eseguire su Supabase SQL Editor
-- ============================================================

-- ── Tabella profili utenti community ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  activity_type text        NOT NULL DEFAULT 'cammino', -- corri|cammino|pedalo|nuoto|altro
  city          text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_own_write"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Tabella posizioni live community (una riga per utente attivo) ─────────────
CREATE TABLE IF NOT EXISTS public.community_live_position (
  user_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  activity_type text        NOT NULL DEFAULT 'cammino',
  lat           double precision,
  lng           double precision,
  speed         real,
  accuracy      real,
  heading       real,
  updated_at    timestamptz DEFAULT now(),
  is_active     boolean     DEFAULT false
);

ALTER TABLE public.community_live_position ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_live_public_read"
  ON public.community_live_position FOR SELECT USING (true);

CREATE POLICY "community_live_own_write"
  ON public.community_live_position FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Abilita Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE community_live_position;

-- ── Tabella traccia percorso community (append-only) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.community_route_positions (
  id            bigserial   PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  activity_type text,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  speed         real,
  accuracy      real,
  heading       real,
  recorded_at   timestamptz DEFAULT now(),
  session_id    text        NOT NULL  -- es. "2026-04-18"
);

CREATE INDEX IF NOT EXISTS community_route_positions_idx
  ON public.community_route_positions (user_id, session_id, recorded_at);

ALTER TABLE public.community_route_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_route_public_read"
  ON public.community_route_positions FOR SELECT USING (true);

CREATE POLICY "community_route_own_insert"
  ON public.community_route_positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_route_own_delete"
  ON public.community_route_positions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Note di configurazione ────────────────────────────────────────────────────
-- Su Supabase > Authentication > Settings:
--   • Disabilita "Enable email confirmations" per permettere login immediato
--   • Oppure configura un template email personalizzato con il brand dell'app
