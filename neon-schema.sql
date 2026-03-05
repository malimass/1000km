-- ═══════════════════════════════════════════════════════════════════════════════
-- 1000km di Gratitudine — Schema Neon PostgreSQL
-- ───────────────────────────────────────────────
-- Sostituisce Supabase con Neon come database.
-- Auth, realtime e API sono gestiti da Vercel API Routes + JWT.
--
-- Esegui in Neon Console → SQL Editor (una sola volta).
-- Sicuro su DB esistente: usa CREATE TABLE IF NOT EXISTS e ON CONFLICT DO NOTHING.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Abilita estensione UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS  (rimpiazza auth.users di Supabase)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  display_name  text        NOT NULL,
  role          text        NOT NULL DEFAULT 'athlete'
                            CHECK (role IN ('athlete', 'coach', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADMIN SETTINGS  (impostazioni private per utente admin)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_settings (
  user_id    uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ISCRIZIONI  (iscrizioni alle tappe)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iscrizioni (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tappa_numero      int           NOT NULL CHECK (tappa_numero BETWEEN 1 AND 14),
  nome              text          NOT NULL,
  cognome           text          NOT NULL,
  email             text          NOT NULL,
  telefono          text,
  vuole_maglia      boolean       NOT NULL DEFAULT false,
  taglia_maglia     text          CHECK (taglia_maglia IN ('XS','S','M','L','XL','XXL')),
  donazione_euro    numeric(10,2) NOT NULL DEFAULT 0 CHECK (donazione_euro >= 0),
  pagamento_stato   text          NOT NULL DEFAULT 'gratuito'
                                  CHECK (pagamento_stato IN (
                                    'gratuito','in_attesa','completato',
                                    'fallito','in_attesa_bonifico'
                                  )),
  stripe_session_id text,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iscrizioni_tappa_idx ON iscrizioni (tappa_numero);
CREATE INDEX IF NOT EXISTS iscrizioni_email_idx ON iscrizioni (email);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NOTIZIE  (news feed dell'evento)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notizie (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo       text        NOT NULL,
  corpo        text        NOT NULL,
  immagine_url text,
  categoria    text        NOT NULL DEFAULT 'generale',
  -- valori: 'generale' | 'tappa' | 'emergenza' | 'raccolta'
  tappa_num    smallint,
  pubblicata   boolean     NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notizie_pubblicata_idx ON notizie (pubblicata, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PUSH TOKENS  (notifiche push dispositivi)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES users(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE,
  platform   text        NOT NULL DEFAULT 'android',
  -- valori: 'android' | 'ios' | 'web'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RACCOLTA FONDI  (barra donazioni, riga singola)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS raccolta_fondi (
  id            integer       PRIMARY KEY DEFAULT 1,
  importo_euro  numeric(10,2) NOT NULL DEFAULT 0,
  target_euro   numeric(10,2) NOT NULL DEFAULT 50000,
  donatori      integer       NOT NULL DEFAULT 0,
  updated_at    timestamptz   DEFAULT now(),
  CONSTRAINT raccolta_single_row CHECK (id = 1)
);

INSERT INTO raccolta_fondi (id, importo_euro, target_euro, donatori)
VALUES (1, 0, 50000, 0)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SERVIZI PAGE  (info pratiche, gestibili da admin)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS servizi_page (
  id         integer     PRIMARY KEY DEFAULT 1,
  data       jsonb       NOT NULL DEFAULT '{
    "sections": [
      {"id":"logistica","titolo":"Logistica","icona":"🚐","items":[]},
      {"id":"emergenze","titolo":"Numeri utili","icona":"📞","items":[]},
      {"id":"faq","titolo":"FAQ","icona":"❓","items":[]}
    ]
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT servizi_single_row CHECK (id = 1)
);

INSERT INTO servizi_page (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SITE SETTINGS  (video YouTube id=1, testi social id=2)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  id         integer     PRIMARY KEY,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_settings (id, data) VALUES (1, '{}') ON CONFLICT (id) DO NOTHING;
INSERT INTO site_settings (id, data) VALUES (2, '{}') ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SOSTENITORI PAGE  (lista sponsor/sostenitori)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sostenitori_page (
  id         integer     PRIMARY KEY DEFAULT 1,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO sostenitori_page (id, data)
VALUES (1, '{"title":"I Sostenitori del Cammino","intro":"","items":[]}')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. LIVE POSITION  (posizione GPS runner in tempo reale)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS live_position (
  id         smallint         PRIMARY KEY,
  lat        double precision,
  lng        double precision,
  speed      real,
  accuracy   real,
  heading    real,
  updated_at timestamptz      DEFAULT now(),
  is_active  boolean          DEFAULT false
);

INSERT INTO live_position (id, is_active) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO live_position (id, is_active) VALUES (2, false) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ROUTE POSITIONS  (traccia percorso GPS, append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_positions (
  id          bigserial        PRIMARY KEY,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  speed       real,
  accuracy    real,
  heading     real,
  recorded_at timestamptz      DEFAULT now(),
  session_id  text             NOT NULL,
  runner_id   smallint         DEFAULT 1
);

CREATE INDEX IF NOT EXISTS route_positions_session_idx
  ON route_positions (session_id, recorded_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. PROFILES  (profili utenti community)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id            uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  email         text,
  role          text        NOT NULL DEFAULT 'athlete',
  activity_type text        NOT NULL DEFAULT 'cammino',
  -- valori: 'corri' | 'cammino' | 'altro'
  city          text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. ATHLETE PROFILES  (dati fisici atleta + assegnazione coach)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS athlete_profiles (
  id               uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age              int,
  weight_kg        numeric(5,2),
  height_cm        numeric(5,1),
  gender           text        CHECK (gender IN ('M','F')),
  rest_hr          int,
  experience_years int,
  max_hr           int,
  coach_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS athlete_profiles_coach_idx ON athlete_profiles (coach_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. COMMUNITY LIVE POSITION  (posizione live utenti community)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_live_position (
  user_id       uuid             PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name  text             NOT NULL,
  activity_type text             NOT NULL DEFAULT 'cammino',
  lat           double precision,
  lng           double precision,
  speed         real,
  accuracy      real,
  heading       real,
  updated_at    timestamptz      DEFAULT now(),
  is_active     boolean          DEFAULT false
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 15. COMMUNITY ROUTE POSITIONS  (tracce percorso community, append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_route_positions (
  id            bigserial        PRIMARY KEY,
  user_id       uuid             REFERENCES users(id) ON DELETE CASCADE,
  display_name  text,
  activity_type text,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  speed         real,
  accuracy      real,
  heading       real,
  recorded_at   timestamptz      DEFAULT now(),
  session_id    text             NOT NULL
);

CREATE INDEX IF NOT EXISTS community_route_positions_idx
  ON community_route_positions (user_id, session_id, recorded_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 16. COACH SESSIONS  (sessioni di allenamento)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coach_sessions (
  id                     text        PRIMARY KEY,
  user_id                uuid        REFERENCES users(id) ON DELETE CASCADE,
  file_name              text        NOT NULL,
  sport                  text        NOT NULL,
  start_time             timestamptz NOT NULL,
  duration_sec           numeric     NOT NULL,
  distance_m             numeric     NOT NULL DEFAULT 0,
  avg_speed_kmh          numeric     NOT NULL DEFAULT 0,
  max_speed_kmh          numeric     NOT NULL DEFAULT 0,
  avg_heart_rate         numeric,
  max_heart_rate         numeric,
  total_elevation_gain_m numeric     NOT NULL DEFAULT 0,
  total_elevation_loss_m numeric     NOT NULL DEFAULT 0,
  calories               numeric,
  trimp                  numeric,
  tss                    numeric,
  hr_zones_sec           jsonb,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_sessions_user_idx ON coach_sessions (user_id, start_time DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- FATTO!
-- ───────────────────────────────────────────────
-- Variabili d'ambiente necessarie su Vercel:
--
--   DATABASE_URL      — stringa connessione Neon (postgresql://...)
--   JWT_SECRET        — segreto JWT (stringa random lunga ≥32 char)
--   VITE_ADMIN_PIN    — PIN admin (es. gratitudine2026)
--   STRIPE_SECRET_KEY — chiave segreta Stripe (per create-payment)
--   VITE_GOOGLE_MAPS_API_KEY
--
-- Dopo aver applicato lo schema:
--   1. Registra l'admin via POST /api/auth/register con role='coach'
--   2. Aggiorna il record in users SET role='admin' se vuoi un ruolo dedicato
-- ═══════════════════════════════════════════════════════════════════════════════
