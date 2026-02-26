/**
 * communityTracking.ts
 * ─────────────────────
 * Funzioni Supabase per la community pubblica:
 * - profili utenti
 * - posizioni live community (una riga per utente)
 * - tracce percorso community
 * - condivisione social
 *
 * Tabelle richieste: vedi community-schema.sql nella root del progetto.
 */

import { supabase } from "./supabase";
import { loadSiteShareSettings } from "./adminSettings";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type ActivityType = "corri" | "cammino" | "altro";

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  corri:   "🏃",
  cammino: "🚶",
  altro:   "💪",
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  corri:   "Corro",
  cammino: "Cammino",
  altro:   "Partecipo",
};

export const ACTIVITY_GERUND: Record<ActivityType, string> = {
  corri:   "correndo",
  cammino: "camminando",
  altro:   "partecipando",
};

export const ACTIVITY_COLOR: Record<ActivityType, string> = {
  corri:   "#3b82f6",
  cammino: "#22c55e",
  altro:   "#8b5cf6",
};

export type UserProfile = {
  id:            string;
  display_name:  string;
  activity_type: ActivityType;
  city:          string | null;
};

export type CommunityLivePosition = {
  user_id:       string;
  display_name:  string;
  activity_type: ActivityType;
  lat:           number;
  lng:           number;
  speed:         number | null;
  accuracy:      number | null;
  heading:       number | null;
  updated_at:    string;
  is_active:     boolean;
};

// ─── Profili ──────────────────────────────────────────────────────────────────

export async function upsertProfile(
  profile: UserProfile,
): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("profiles").upsert({
    ...profile,
    updated_at: new Date().toISOString(),
  });
  return error?.message ?? null;
}

export async function loadProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, activity_type, city")
    .eq("id", userId)
    .single();
  return (data as UserProfile) ?? null;
}

// ─── Posizioni live community ──────────────────────────────────────────────────

export async function upsertCommunityLivePosition(
  userId: string,
  displayName: string,
  activityType: ActivityType,
  fields: {
    lat: number;
    lng: number;
    speed?: number | null;
    accuracy?: number | null;
    heading?: number | null;
    is_active?: boolean;
  },
): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("community_live_position").upsert({
    user_id:       userId,
    display_name:  displayName,
    activity_type: activityType,
    ...fields,
    updated_at: new Date().toISOString(),
  });
  return error?.message ?? null;
}

export async function setCommunityInactive(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase
    .from("community_live_position")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return error?.message ?? null;
}

/** Soglia oltre la quale una posizione viene considerata "stale" (non più attiva). */
export const COMMUNITY_STALE_MS = 10 * 60 * 1000; // 10 minuti

export async function loadActiveCommunityPositions(): Promise<CommunityLivePosition[]> {
  if (!supabase) return [];
  const cutoff = new Date(Date.now() - COMMUNITY_STALE_MS).toISOString();
  const { data } = await supabase
    .from("community_live_position")
    .select("*")
    .eq("is_active", true)
    .gte("updated_at", cutoff);
  return (data as CommunityLivePosition[]) ?? [];
}

export function subscribeCommunityLivePosition(
  cb: (pos: CommunityLivePosition) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("community-live-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "community_live_position" },
      (payload) => {
        // Ignora DELETE: payload.new è vuoto ({}) e user_id sarebbe undefined
        if (!(payload.new as Partial<CommunityLivePosition>).user_id) return;
        cb(payload.new as CommunityLivePosition);
      },
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

// ─── Traccia percorso community ───────────────────────────────────────────────

export type CommunityRoutePoint = {
  user_id:       string;
  display_name:  string;
  activity_type: ActivityType;
  lat:           number;
  lng:           number;
  recorded_at:   string;
  session_id:    string;
};

/** Carica tutti i punti traccia community per le sessioni fornite, ordinati per tempo. */
export async function loadCommunityRoutePositions(
  sessionIds: string[],
): Promise<CommunityRoutePoint[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("community_route_positions")
    .select("user_id, display_name, activity_type, lat, lng, recorded_at, session_id")
    .in("session_id", sessionIds)
    .order("recorded_at", { ascending: true });
  return (data as CommunityRoutePoint[]) ?? [];
}

/** Sottoscrizione Realtime a nuovi punti traccia community. */
export function subscribeCommunityRoutePositions(
  cb: (point: CommunityRoutePoint) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("community-route-positions-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "community_route_positions" },
      (payload) => { cb(payload.new as CommunityRoutePoint); },
    )
    .subscribe();
  return () => { supabase!.removeChannel(channel); };
}

export async function appendCommunityRoutePoint(
  userId: string,
  displayName: string,
  activityType: ActivityType,
  lat: number,
  lng: number,
  speed: number | null,
  accuracy: number | null,
  heading: number | null,
  sessionId: string,
): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("community_route_positions").insert({
    user_id:       userId,
    display_name:  displayName,
    activity_type: activityType,
    lat, lng, speed, accuracy, heading,
    session_id:  sessionId,
    recorded_at: new Date().toISOString(),
  });
  return error?.message ?? null;
}

// ─── Condivisione social ──────────────────────────────────────────────────────

/**
 * Apre il native share sheet (iOS/Android) o copia negli appunti come fallback.
 * Genera un post pre-compilato con testi configurabili dall'admin.
 */
export async function shareActivity(
  activityType: ActivityType,
  displayName: string,
  kmTracked?: number,
): Promise<void> {
  const cfg = await loadSiteShareSettings();
  const gerund = ACTIVITY_GERUND[activityType];
  const kmText = kmTracked != null && kmTracked > 0.1
    ? ` Ho percorso ${kmTracked.toFixed(1)} km!`
    : "";

  const text =
    `${displayName} sta ${gerund} per ${cfg.shareSocialTag}!${kmText}\n\n` +
    `${cfg.shareTitle} 💗\n` +
    `${cfg.shareBody}\n\n` +
    `Segui il cammino 👉 ${cfg.shareSocialTag}\n` +
    `👉 ${cfg.shareUrl}\n\n` +
    `${cfg.shareHashtags}`;

  const shareData = {
    title: cfg.shareTitle,
    text,
    url:   cfg.shareUrl,
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
    } catch {
      // L'utente ha chiuso il dialog — nessun errore da mostrare
    }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n\n${shareData.url}`);
  }
}
