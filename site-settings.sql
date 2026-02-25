-- ─────────────────────────────────────────────────────────────────────────────
-- Gratitude Path — Tabelle configurazione sito + fix sicurezza
-- Esegui questo script nel SQL Editor di Supabase Dashboard
-- (Dashboard → SQL Editor → New query → incolla → Run)
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ 1. TABELLA site_settings ═══════════════════════════════════════════════════
-- Configurazioni pubbliche del sito (leggibili da tutti, scrivibili solo admin).
-- id=1 → Video YouTube (Crocifisso Nero)
-- id=2 → Testi condivisione social

CREATE TABLE IF NOT EXISTS public.site_settings (
  id          integer     PRIMARY KEY,
  data        jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Rimuovi eventuale constraint "singleton" (CHECK id=1) creato in precedenza,
-- perché ora servono più righe (id=1 video, id=2 share).
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS singleton;
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS single_row;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Le policy vengono create solo se non esistono già (DROP IF EXISTS + CREATE)
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_auth_write"  ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_auth_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_auth_delete" ON public.site_settings;

-- Chiunque può leggere (visitatori vedono video e testi social)
CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Solo admin autenticati possono inserire
CREATE POLICY "site_settings_auth_write"
  ON public.site_settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "site_settings_auth_update"
  ON public.site_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "site_settings_auth_delete"
  ON public.site_settings
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Righe iniziali (non sovrascrivono se già presenti)
INSERT INTO public.site_settings (id, data)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_settings (id, data)
VALUES (2, '{}')
ON CONFLICT (id) DO NOTHING;


-- ══ 2. TABELLA sostenitori_page — FIX SICUREZZA ═══════════════════════════════
-- La policy precedente ("write all") permetteva a CHIUNQUE di modificare i dati.
-- Ora solo admin autenticati possono scrivere, tutti possono leggere.
--
-- NOTA: se la tabella non esiste ancora, questo la crea.
--       se esiste già, aggiorna solo le policy.

CREATE TABLE IF NOT EXISTS public.sostenitori_page (
  id          integer     PRIMARY KEY DEFAULT 1,
  data        jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.sostenitori_page ENABLE ROW LEVEL SECURITY;

-- Rimuovi la policy insicura (ignora errore se non esiste)
DROP POLICY IF EXISTS "write all"    ON public.sostenitori_page;
DROP POLICY IF EXISTS "public read"  ON public.sostenitori_page;

-- Chiunque può leggere la pagina sostenitori
CREATE POLICY "sostenitori_public_read"
  ON public.sostenitori_page
  FOR SELECT
  USING (true);

-- Solo admin autenticati possono inserire
CREATE POLICY "sostenitori_auth_write"
  ON public.sostenitori_page
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sostenitori_auth_update"
  ON public.sostenitori_page
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "sostenitori_auth_delete"
  ON public.sostenitori_page
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Riga iniziale (non sovrascrive se già presente)
INSERT INTO public.sostenitori_page (id, data)
VALUES (1, '{"title":"I Sostenitori del Cammino","intro":"","items":[]}')
ON CONFLICT (id) DO NOTHING;


-- ══ 3. LIVE_POSITION — Aggiungi riga runner 2 (se non presente) ═══════════════
-- La tabella live_position supporta 2 runner (id=1 e id=2).
-- Rimuoviamo il constraint single_row per supportare entrambi.

ALTER TABLE public.live_position DROP CONSTRAINT IF EXISTS single_row;

INSERT INTO public.live_position (id, is_active)
VALUES (2, false)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- FATTO! Dopo aver eseguito questo script:
-- - site_settings: video YouTube e testi social persistono nel database
-- - sostenitori_page: solo admin possono modificare i sostenitori
-- - live_position: supporta 2 runner
-- ─────────────────────────────────────────────────────────────────────────────
