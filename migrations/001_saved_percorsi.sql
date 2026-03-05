-- Migrazione: crea tabella saved_percorsi
-- Esegui con: psql $DATABASE_URL -f migrations/001_saved_percorsi.sql

CREATE TABLE IF NOT EXISTS saved_percorsi (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  ON saved_percorsi (user_id, created_at DESC);
