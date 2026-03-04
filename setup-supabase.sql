-- ═══════════════════════════════════════════════════════════════════════════════
-- 1000km di Gratitudine — Setup Supabase COMPLETO
-- ───────────────────────────────────────────────
-- Copia e incolla TUTTO in:
--   Supabase Dashboard → SQL Editor → New query → Run
--
-- Esegui UNA SOLA VOLTA su un progetto nuovo.
-- Su un progetto esistente è sicuro: usa CREATE TABLE IF NOT EXISTS
-- e ON CONFLICT DO NOTHING, quindi non sovrascrive nulla.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADMIN SETTINGS  (impostazioni private per utente admin)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_settings (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utente accede ai propri settings" ON public.admin_settings;
CREATE POLICY "Utente accede ai propri settings"
  ON public.admin_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ISCRIZIONI  (iscrizioni alle tappe)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.iscrizioni (
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

ALTER TABLE public.iscrizioni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Iscrizione pubblica"       ON public.iscrizioni;
DROP POLICY IF EXISTS "Solo admin legge iscrizioni" ON public.iscrizioni;
DROP POLICY IF EXISTS "Solo admin aggiorna iscrizioni" ON public.iscrizioni;

CREATE POLICY "Iscrizione pubblica"
  ON public.iscrizioni FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo admin legge iscrizioni"
  ON public.iscrizioni FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admin aggiorna iscrizioni"
  ON public.iscrizioni FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Funzione pubblica: conta iscritti per tappa (no dati personali)
CREATE OR REPLACE FUNCTION public.get_iscritti_per_tappa()
RETURNS TABLE(tappa_numero int, totale bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT tappa_numero, COUNT(*)::bigint AS totale
  FROM   public.iscrizioni
  WHERE  pagamento_stato IN ('gratuito', 'completato', 'in_attesa_bonifico')
  GROUP  BY tappa_numero;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NOTIZIE  (news feed dell'evento)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notizie (
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

ALTER TABLE public.notizie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notizie_public_read" ON public.notizie;
DROP POLICY IF EXISTS "notizie_auth_write"  ON public.notizie;

CREATE POLICY "notizie_public_read"
  ON public.notizie FOR SELECT USING (pubblicata = true);

CREATE POLICY "notizie_auth_write"
  ON public.notizie FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.notizie;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PUSH TOKENS  (notifiche push dispositivi)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE,
  platform   text        NOT NULL DEFAULT 'android',
  -- valori: 'android' | 'ios' | 'web'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_own" ON public.push_tokens;

CREATE POLICY "push_tokens_own"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RACCOLTA FONDI  (barra donazioni, riga singola)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.raccolta_fondi (
  id            integer       PRIMARY KEY DEFAULT 1,
  importo_euro  numeric(10,2) NOT NULL DEFAULT 0,
  target_euro   numeric(10,2) NOT NULL DEFAULT 50000,
  donatori      integer       NOT NULL DEFAULT 0,
  updated_at    timestamptz   DEFAULT now(),
  CONSTRAINT raccolta_single_row CHECK (id = 1)
);

ALTER TABLE public.raccolta_fondi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raccolta_public_read" ON public.raccolta_fondi;
DROP POLICY IF EXISTS "raccolta_auth_write"  ON public.raccolta_fondi;

CREATE POLICY "raccolta_public_read"
  ON public.raccolta_fondi FOR SELECT USING (true);

CREATE POLICY "raccolta_auth_write"
  ON public.raccolta_fondi FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.raccolta_fondi;

INSERT INTO public.raccolta_fondi (id, importo_euro, target_euro, donatori)
VALUES (1, 0, 50000, 0)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SERVIZI PAGE  (info pratiche, gestibili da admin)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.servizi_page (
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

ALTER TABLE public.servizi_page ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "servizi_public_read" ON public.servizi_page;
DROP POLICY IF EXISTS "servizi_auth_write"  ON public.servizi_page;

CREATE POLICY "servizi_public_read"
  ON public.servizi_page FOR SELECT USING (true);

CREATE POLICY "servizi_auth_write"
  ON public.servizi_page FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

INSERT INTO public.servizi_page (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SITE SETTINGS  (video YouTube id=1, testi social id=2)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.site_settings (
  id         integer     PRIMARY KEY,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS singleton;
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS single_row;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_auth_write"  ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_auth_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_auth_delete" ON public.site_settings;

CREATE POLICY "site_settings_public_read"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "site_settings_auth_write"
  ON public.site_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "site_settings_auth_update"
  ON public.site_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "site_settings_auth_delete"
  ON public.site_settings FOR DELETE
  USING (auth.role() = 'authenticated');

INSERT INTO public.site_settings (id, data) VALUES (1, '{}') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.site_settings (id, data) VALUES (2, '{}') ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SOSTENITORI PAGE  (lista sponsor/sostenitori)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sostenitori_page (
  id         integer     PRIMARY KEY DEFAULT 1,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sostenitori_page ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "write all"               ON public.sostenitori_page;
DROP POLICY IF EXISTS "public read"             ON public.sostenitori_page;
DROP POLICY IF EXISTS "sostenitori_public_read" ON public.sostenitori_page;
DROP POLICY IF EXISTS "sostenitori_auth_write"  ON public.sostenitori_page;
DROP POLICY IF EXISTS "sostenitori_auth_update" ON public.sostenitori_page;
DROP POLICY IF EXISTS "sostenitori_auth_delete" ON public.sostenitori_page;

CREATE POLICY "sostenitori_public_read"
  ON public.sostenitori_page FOR SELECT USING (true);

CREATE POLICY "sostenitori_auth_write"
  ON public.sostenitori_page FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sostenitori_auth_update"
  ON public.sostenitori_page FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sostenitori_auth_delete"
  ON public.sostenitori_page FOR DELETE
  USING (auth.role() = 'authenticated');

INSERT INTO public.sostenitori_page (id, data)
VALUES (1, '{"title":"I Sostenitori del Cammino","intro":"","items":[]}')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. LIVE POSITION  (posizione GPS runner in tempo reale)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.live_position (
  id         smallint         PRIMARY KEY,
  lat        double precision,
  lng        double precision,
  speed      real,
  accuracy   real,
  heading    real,
  updated_at timestamptz      DEFAULT now(),
  is_active  boolean          DEFAULT false
);

-- Rimuovi eventuali constraint single_row precedenti (supporta 2 runner)
ALTER TABLE public.live_position DROP CONSTRAINT IF EXISTS single_row;

ALTER TABLE public.live_position ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read live_position" ON public.live_position;
DROP POLICY IF EXISTS "auth write live_position"  ON public.live_position;

CREATE POLICY "public read live_position"
  ON public.live_position FOR SELECT USING (true);

CREATE POLICY "auth write live_position"
  ON public.live_position FOR ALL
  USING (auth.role() = 'authenticated');

INSERT INTO public.live_position (id, is_active) VALUES (1, false) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.live_position (id, is_active) VALUES (2, false) ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_position;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ROUTE POSITIONS  (traccia percorso GPS, append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.route_positions (
  id          bigserial        PRIMARY KEY,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  speed       real,
  accuracy    real,
  heading     real,
  recorded_at timestamptz      DEFAULT now(),
  session_id  text             NOT NULL,   -- es. "2026-04-18"
  runner_id   smallint         DEFAULT 1
);

CREATE INDEX IF NOT EXISTS route_positions_session_idx
  ON public.route_positions (session_id, recorded_at);

ALTER TABLE public.route_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read route_positions" ON public.route_positions;
DROP POLICY IF EXISTS "auth write route_positions"  ON public.route_positions;

CREATE POLICY "public read route_positions"
  ON public.route_positions FOR SELECT USING (true);

CREATE POLICY "auth write route_positions"
  ON public.route_positions FOR ALL
  USING (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.route_positions;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. PROFILES  (profili utenti community)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  activity_type text        NOT NULL DEFAULT 'cammino',
  -- valori: 'corri' | 'cammino' | 'pedalo' | 'nuoto' | 'altro'
  city          text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_write"   ON public.profiles;

CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles_own_write"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. COMMUNITY LIVE POSITION  (posizione live utenti community)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_live_position (
  user_id       uuid             PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE public.community_live_position ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_live_public_read" ON public.community_live_position;
DROP POLICY IF EXISTS "community_live_own_write"   ON public.community_live_position;

CREATE POLICY "community_live_public_read"
  ON public.community_live_position FOR SELECT USING (true);

CREATE POLICY "community_live_own_write"
  ON public.community_live_position FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_live_position;


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. COMMUNITY ROUTE POSITIONS  (tracce percorso community, append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.community_route_positions (
  id            bigserial        PRIMARY KEY,
  user_id       uuid             REFERENCES auth.users(id) ON DELETE CASCADE,
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
  ON public.community_route_positions (user_id, session_id, recorded_at);

ALTER TABLE public.community_route_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_route_public_read" ON public.community_route_positions;
DROP POLICY IF EXISTS "community_route_own_insert"  ON public.community_route_positions;
DROP POLICY IF EXISTS "community_route_own_delete"  ON public.community_route_positions;

CREATE POLICY "community_route_public_read"
  ON public.community_route_positions FOR SELECT USING (true);

CREATE POLICY "community_route_own_insert"
  ON public.community_route_positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_route_own_delete"
  ON public.community_route_positions FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. COACH SESSIONS  (sessioni di allenamento coach)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_sessions (
  id                     text        PRIMARY KEY,
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
  hr_zones_sec           jsonb,      -- array [z1,z2,z3,z4,z5] in secondi
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_all" ON public.coach_sessions;

CREATE POLICY "coach_all"
  ON public.coach_sessions FOR ALL
  USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- FATTO!
-- ───────────────────────────────────────────────
-- Passi successivi:
--
-- 1. Authentication → Users → Add user
--    Inserisci email e password del tuo account admin.
--
-- 2. Authentication → Settings
--    Disabilita "Enable email confirmations" per login immediato.
--
-- 3. Project Settings → API
--    Copia SUPABASE_URL e ANON KEY e aggiungile su Vercel:
--      VITE_SUPABASE_URL
--      VITE_SUPABASE_ANON_KEY
--
-- 4. Aggiungi su Vercel anche:
--      VITE_ADMIN_PIN         (es. gratitude2026)
--      VITE_ADMIN_EMAIL       (email dell'account admin creato sopra)
--      VITE_ADMIN_PASS        (password dell'account admin)
--      VITE_GOOGLE_MAPS_API_KEY
--
-- 5. Fai un nuovo deploy su Vercel.
-- ═══════════════════════════════════════════════════════════════════════════════
