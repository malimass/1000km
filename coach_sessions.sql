-- Tabella Supabase per le sessioni di allenamento del Coach
-- Esegui questo SQL nell'editor SQL di Supabase

CREATE TABLE IF NOT EXISTS coach_sessions (
  id                      text PRIMARY KEY,
  file_name               text        NOT NULL,
  sport                   text        NOT NULL,
  start_time              timestamptz NOT NULL,
  duration_sec            numeric     NOT NULL,
  distance_m              numeric     NOT NULL DEFAULT 0,
  avg_speed_kmh           numeric     NOT NULL DEFAULT 0,
  max_speed_kmh           numeric     NOT NULL DEFAULT 0,
  avg_heart_rate          numeric,
  max_heart_rate          numeric,
  total_elevation_gain_m  numeric     NOT NULL DEFAULT 0,
  total_elevation_loss_m  numeric     NOT NULL DEFAULT 0,
  calories                numeric,
  trimp                   numeric,
  tss                     numeric,
  hr_zones_sec            jsonb,         -- array [z1,z2,z3,z4,z5] in secondi
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- RLS aperto: l'accesso è già protetto dal PIN coach lato app
ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_all" ON coach_sessions
  FOR ALL USING (true) WITH CHECK (true);
