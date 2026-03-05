-- Migrazione: crea tabella saved_percorsi
-- Esegui in: Supabase Dashboard → SQL Editor → New query → Run
-- Oppure: psql $DATABASE_URL -f migrations/001_saved_percorsi.sql

CREATE TABLE IF NOT EXISTS public.saved_percorsi (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  partenza      text        NOT NULL,
  arrivo        text        NOT NULL,
  distance_m    numeric     NOT NULL DEFAULT 0,
  km_per_tappa  numeric     NOT NULL DEFAULT 70,
  coords        jsonb       NOT NULL DEFAULT '[]',
  tappe         jsonb       NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_percorsi_user_idx
  ON public.saved_percorsi (user_id, created_at DESC);

-- RLS (Row Level Security) — ogni utente vede solo i propri percorsi
ALTER TABLE public.saved_percorsi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_percorsi_own" ON public.saved_percorsi;

CREATE POLICY "saved_percorsi_own"
  ON public.saved_percorsi FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
