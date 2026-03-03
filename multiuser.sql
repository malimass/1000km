-- ═══════════════════════════════════════════════════════════════
-- SISTEMA MULTI-UTENTE — Gratitude Path Coach
-- Esegui questo SQL nell'editor SQL di Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Profili (atleti e coach)
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role          text NOT NULL CHECK (role IN ('athlete', 'coach')),
  display_name  text NOT NULL,
  email         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_write_own" ON profiles FOR ALL   USING (auth.uid() = id);

-- 2. Profili atletici (dati fisici)
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id                  uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  age                 integer,
  weight_kg           numeric,
  height_cm           numeric,
  gender              text CHECK (gender IN ('M', 'F')),
  rest_hr             integer,
  experience_years    numeric,
  max_hr              integer,
  coach_id            uuid REFERENCES profiles(id),  -- coach scelto dall'atleta
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
-- Atleta vede/modifica il proprio
CREATE POLICY "ap_own" ON athlete_profiles FOR ALL USING (auth.uid() = id);
-- Coach vede i propri atleti
CREATE POLICY "ap_coach_read" ON athlete_profiles FOR SELECT
  USING (auth.uid() = coach_id);

-- 3. Aggiunge athlete_id alle sessioni esistenti
ALTER TABLE coach_sessions ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES profiles(id);

-- Aggiorna RLS di coach_sessions
DROP POLICY IF EXISTS "coach_all" ON coach_sessions;

-- Atleta: vede e scrive solo le proprie sessioni
CREATE POLICY "sessions_athlete_own" ON coach_sessions
  FOR ALL USING (auth.uid() = athlete_id);

-- Coach: legge le sessioni degli atleti assegnati
CREATE POLICY "sessions_coach_read" ON coach_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athlete_profiles ap
      WHERE ap.id = coach_sessions.athlete_id
        AND ap.coach_id = auth.uid()
    )
  );

-- Retrocompatibilità: sessioni senza athlete_id (vecchio sistema PIN)
CREATE POLICY "sessions_legacy" ON coach_sessions
  FOR ALL USING (athlete_id IS NULL);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: crea profilo automaticamente alla registrazione
-- Necessario perché con email-confirmation attiva non esiste
-- ancora una sessione (auth.uid() = NULL) quando l'utente
-- viene creato, quindi la client-side insert fallirebbe su RLS.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'athlete') = 'athlete' THEN
    INSERT INTO public.athlete_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
