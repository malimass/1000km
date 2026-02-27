-- ============================================================
-- SCHEMA NOTIZIE & PUSH TOKENS — 1000km di Gratitudine
-- Da eseguire su Supabase SQL Editor
-- ============================================================

-- ── Notizie / News feed ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notizie (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo      text        NOT NULL,
  corpo       text        NOT NULL,
  immagine_url text,
  categoria   text        NOT NULL DEFAULT 'generale',
  -- 'generale' | 'tappa' | 'emergenza' | 'raccolta'
  tappa_num   smallint,   -- se categoria='tappa', quale tappa riguarda
  pubblicata  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.notizie ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica delle notizie pubblicate
CREATE POLICY "notizie_public_read"
  ON public.notizie FOR SELECT
  USING (pubblicata = true);

-- Solo utenti autenticati (admin) possono scrivere
CREATE POLICY "notizie_auth_write"
  ON public.notizie FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime: aggiornamento live del feed notizie
ALTER PUBLICATION supabase_realtime ADD TABLE notizie;

-- ── Push Token — registrazione dispositivi ───────────────────────────────────
-- Quando un utente apre l'app nativa, il token FCM/APNs viene salvato qui.
-- L'admin può usare questi token per inviare notifiche push.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  platform    text        NOT NULL DEFAULT 'android',
  -- 'android' | 'ios' | 'web'
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Solo l'utente stesso può leggere/scrivere il proprio token
CREATE POLICY "push_tokens_own"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Raccolta fondi (aggiornamento manuale da admin) ──────────────────────────
-- Singola riga con importo raccolto corrente e target.
-- L'admin aggiorna manualmente dopo ogni verifica con la piattaforma donazioni.
CREATE TABLE IF NOT EXISTS public.raccolta_fondi (
  id            integer PRIMARY KEY DEFAULT 1,
  importo_euro  numeric(10,2) NOT NULL DEFAULT 0,
  target_euro   numeric(10,2) NOT NULL DEFAULT 50000,
  donatori      integer       NOT NULL DEFAULT 0,
  updated_at    timestamptz   DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.raccolta_fondi ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica
CREATE POLICY "raccolta_public_read"
  ON public.raccolta_fondi FOR SELECT USING (true);

-- Solo autenticati (admin) possono aggiornare
CREATE POLICY "raccolta_auth_write"
  ON public.raccolta_fondi FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime per aggiornamento live barra donazioni
ALTER PUBLICATION supabase_realtime ADD TABLE raccolta_fondi;

-- Row iniziale raccolta fondi
INSERT INTO public.raccolta_fondi (id, importo_euro, target_euro, donatori)
VALUES (1, 2500, 50000, 42)
ON CONFLICT (id) DO NOTHING;

-- ── Servizi / Info pratiche ──────────────────────────────────────────────────
-- Contenuto gestibile dall'admin: JSON con sezioni informative.
CREATE TABLE IF NOT EXISTS public.servizi_page (
  id    integer PRIMARY KEY DEFAULT 1,
  data  jsonb   NOT NULL DEFAULT '{
    "sections": [
      {
        "id": "logistica",
        "titolo": "Logistica",
        "icona": "🚐",
        "items": []
      },
      {
        "id": "emergenze",
        "titolo": "Numeri utili",
        "icona": "📞",
        "items": []
      },
      {
        "id": "faq",
        "titolo": "FAQ",
        "icona": "❓",
        "items": []
      }
    ]
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.servizi_page ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servizi_public_read"
  ON public.servizi_page FOR SELECT USING (true);

CREATE POLICY "servizi_auth_write"
  ON public.servizi_page FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

INSERT INTO public.servizi_page (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
