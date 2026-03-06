/**
 * auth.ts — Autenticazione JWT via Neon API Routes
 */

import { apiFetch, setAuthToken, clearAuthToken, getAuthToken } from "./api";

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
  try {
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, role }),
    });
    const data = await res.json();
    if (!res.ok) return { user: null, error: data.error ?? "Errore registrazione" };
    setAuthToken(data.token);
    return { user: data.user, error: null };
  } catch {
    return { user: null, error: "Errore di rete" };
  }
}

// ─── LOGIN ────────────────────────────────────────────────────

export async function signInUser(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { user: null, error: data.error ?? "Credenziali non valide" };
    setAuthToken(data.token);
    return { user: data.user, error: null };
  } catch {
    return { user: null, error: "Errore di rete" };
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  clearAuthToken();
}

// ─── UTENTE CORRENTE ──────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!getAuthToken()) return null;
  try {
    const res = await apiFetch("/api/auth/me");
    if (!res.ok) {
      // Token scaduto o non valido → rimuovilo
      if (res.status === 401) clearAuthToken();
      return null;
    }
    return await res.json() as AuthUser;
  } catch {
    return null;
  }
}

// ─── LISTA COACH (per atleti che scelgono il coach) ──────────

export async function listCoaches(): Promise<{ id: string; displayName: string }[]> {
  try {
    const res = await fetch("/api/profiles?role=coach");
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map((r) => ({ id: r.id, displayName: r.display_name }));
  } catch {
    return [];
  }
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

export async function saveAthleteProfile(_userId: string, p: AthleteProfile): Promise<void> {
  await apiFetch("/api/athlete-profiles", {
    method: "POST",
    body: JSON.stringify({
      age: p.age,
      weight_kg: p.weightKg,
      height_cm: p.heightCm,
      gender: p.gender,
      rest_hr: p.restHR,
      experience_years: p.experienceYears,
      max_hr: p.maxHR,
      coach_id: p.coachId,
    }),
  });
}

export async function loadAthleteProfile(userId: string): Promise<AthleteProfile | null> {
  try {
    const res = await apiFetch(`/api/athlete-profiles?user_id=${userId}`);
    if (!res.ok) return null;
    const data = await res.json();
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
  } catch {
    return null;
  }
}

// ─── ATLETI DEL COACH ─────────────────────────────────────────

export interface CoachAthlete {
  id: string;
  displayName: string;
  email: string;
  profile: AthleteProfile;
}

export async function loadCoachAthletes(coachId: string): Promise<CoachAthlete[]> {
  try {
    const res = await apiFetch(`/api/athlete-profiles?coach_id=${coachId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map((r) => ({
      id: r.id,
      displayName: r.display_name ?? "—",
      email: r.email ?? "—",
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
  } catch {
    return [];
  }
}
