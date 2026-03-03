/**
 * auth.ts — Helper Supabase Auth per il sistema multi-utente Coach
 *
 * Ruoli:
 *  - athlete: pellegrin/utente che carica i propri allenamenti
 *  - coach:   allenatore che vede i dati degli atleti assegnati
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export type UserRole = "athlete" | "coach";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

// ─── REGISTRAZIONE ────────────────────────────────────────────

export async function signUpUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { user: null, error: "Supabase non configurato" };

  // Passa role e displayName come metadata: il trigger DB handle_new_user()
  // li usa per creare il profilo con SECURITY DEFINER (bypassa RLS).
  // Questo funziona anche con email-confirmation abilitata (nessuna sessione attiva).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, role } },
  });
  if (error || !data.user) return { user: null, error: error?.message ?? "Errore registrazione" };

  return { user: { id: data.user.id, email, displayName, role }, error: null };
}

// ─── LOGIN ────────────────────────────────────────────────────

export async function signInUser(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { user: null, error: "Supabase non configurato" };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { user: null, error: error?.message ?? "Credenziali non valide" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", data.user.id)
    .single();

  if (!profile) return { user: null, error: "Profilo non trovato" };

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
      displayName: profile.display_name,
      role: profile.role as UserRole,
    },
    error: null,
  };
}

// ─── LOGOUT ───────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

// ─── UTENTE CORRENTE ──────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: profile.email ?? user.email ?? "",
    displayName: profile.display_name,
    role: profile.role as UserRole,
  };
}

// ─── LISTA COACH (per atleti che scelgono il coach) ──────────

export async function listCoaches(): Promise<{ id: string; displayName: string }[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "coach")
    .order("display_name");
  return (data ?? []).map(r => ({ id: r.id, displayName: r.display_name }));
}

// ─── PROFILO ATLETICO ─────────────────────────────────────────

export interface AthleteProfile {
  age?: number;
  weightKg?: number;
  heightCm?: number;
  gender?: "M" | "F";
  restHR?: number;
  experienceYears?: number;
  maxHR?: number;
  coachId?: string;
}

export async function saveAthleteProfile(userId: string, p: AthleteProfile): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from("athlete_profiles").upsert({
    id: userId,
    age: p.age,
    weight_kg: p.weightKg,
    height_cm: p.heightCm,
    gender: p.gender,
    rest_hr: p.restHR,
    experience_years: p.experienceYears,
    max_hr: p.maxHR,
    coach_id: p.coachId,
    updated_at: new Date().toISOString(),
  });
}

export async function loadAthleteProfile(userId: string): Promise<AthleteProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from("athlete_profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return {
    age: data.age,
    weightKg: data.weight_kg,
    heightCm: data.height_cm,
    gender: data.gender,
    restHR: data.rest_hr,
    experienceYears: data.experience_years,
    maxHR: data.max_hr,
    coachId: data.coach_id,
  };
}

// ─── ATLETI DEL COACH ─────────────────────────────────────────

export interface CoachAthlete {
  id: string;
  displayName: string;
  email: string;
  profile: AthleteProfile;
}

export async function loadCoachAthletes(coachId: string): Promise<CoachAthlete[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase
    .from("athlete_profiles")
    .select("id, age, weight_kg, height_cm, gender, rest_hr, experience_years, max_hr, profiles(display_name, email)")
    .eq("coach_id", coachId);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    displayName: r.profiles?.display_name ?? "—",
    email: r.profiles?.email ?? "—",
    profile: {
      age: r.age,
      weightKg: r.weight_kg,
      heightCm: r.height_cm,
      gender: r.gender,
      restHR: r.rest_hr,
      experienceYears: r.experience_years,
      maxHR: r.max_hr,
    },
  }));
}
