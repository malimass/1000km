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

-- ─── Dopo aver eseguito lo schema ────────────────────────────────────────────
-- 1. Vai su Authentication → Users → Add user
-- 2. Inserisci email e password dell'account admin
-- 3. Copia SUPABASE_URL e ANON KEY da Project Settings → API
-- 4. Aggiungili su Vercel come variabili d'ambiente:
--      VITE_SUPABASE_URL
--      VITE_SUPABASE_ANON_KEY
-- 5. Fai un nuovo deploy su Vercel
