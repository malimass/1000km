-- ─── Schema Supabase per Gratitude Path Admin ───────────────────────────────
-- Esegui questo script nell'SQL Editor del tuo progetto Supabase.
-- (Dashboard → SQL Editor → New query → incolla → Run)

-- Tabella impostazioni admin
CREATE TABLE IF NOT EXISTS admin_settings (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security: ogni utente vede e modifica solo i suoi dati
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente accede ai propri settings"
  ON admin_settings
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Tabella Iscrizioni alle Tappe ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iscrizioni (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tappa_numero      int         NOT NULL CHECK (tappa_numero BETWEEN 1 AND 14),
  nome              text        NOT NULL,
  cognome           text        NOT NULL,
  email             text        NOT NULL,
  telefono          text,
  vuole_maglia      boolean     NOT NULL DEFAULT false,
  taglia_maglia     text        CHECK (taglia_maglia IN ('XS','S','M','L','XL','XXL')),
  donazione_euro    numeric(10,2) NOT NULL DEFAULT 0 CHECK (donazione_euro >= 0),
  -- pagamento_stato valori:
  --   'gratuito'          → iscrizione gratuita, nessun pagamento
  --   'in_attesa'         → pagamento Stripe avviato, in attesa di conferma
  --   'completato'        → pagamento Stripe confermato
  --   'fallito'           → pagamento Stripe fallito o annullato
  --   'in_attesa_bonifico'→ bonifico bancario richiesto, in attesa
  pagamento_stato   text        NOT NULL DEFAULT 'gratuito'
                                CHECK (pagamento_stato IN (
                                  'gratuito','in_attesa','completato',
                                  'fallito','in_attesa_bonifico'
                                )),
  stripe_session_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE iscrizioni ENABLE ROW LEVEL SECURITY;

-- Chiunque può iscriversi (INSERT pubblico)
CREATE POLICY "Iscrizione pubblica"
  ON iscrizioni
  FOR INSERT
  WITH CHECK (true);

-- Solo utenti autenticati (admin) possono leggere i dati personali
CREATE POLICY "Solo admin legge iscrizioni"
  ON iscrizioni
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo utenti autenticati possono aggiornare (es. conferma pagamento)
CREATE POLICY "Solo admin aggiorna iscrizioni"
  ON iscrizioni
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ─── Funzione pubblica per contare iscritti per tappa ────────────────────────
-- Espone solo aggregati (nessun dato personale) accessibili senza autenticazione.
CREATE OR REPLACE FUNCTION get_iscritti_per_tappa()
RETURNS TABLE(tappa_numero int, totale bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tappa_numero, COUNT(*)::bigint AS totale
  FROM   iscrizioni
  WHERE  pagamento_stato IN ('gratuito', 'completato', 'in_attesa_bonifico')
  GROUP  BY tappa_numero;
$$;

-- ─── Dopo aver eseguito lo schema ────────────────────────────────────────────
-- 1. Vai su Authentication → Users → Add user
-- 2. Inserisci email e password dell'account admin
-- 3. Copia SUPABASE_URL e ANON KEY da Project Settings → API
-- 4. Aggiungili su Vercel come variabili d'ambiente:
--      VITE_SUPABASE_URL
--      VITE_SUPABASE_ANON_KEY
-- 5. Per i pagamenti Stripe, aggiungi nell'Edge Function Secrets:
--      STRIPE_SECRET_KEY   (da Stripe Dashboard → Developers → API Keys)
-- 6. Aggiorna VITE_STRIPE_PUBLISHABLE_KEY in .env.local e Vercel
-- 7. Fai un nuovo deploy su Vercel
