/**
 * communityTracking.ts
 * ─────────────────────
 * Funzioni community via Neon API Routes.
 * Il realtime Neon è sostituito da polling (setInterval).
 */

import { apiFetch } from "./api";
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

export async function upsertProfile(profile: UserProfile): Promise<string | null> {
  try {
    const res = await apiFetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify({
        display_name:  profile.display_name,
        activity_type: profile.activity_type,
        city:          profile.city,
      }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

export async function loadProfile(userId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/profiles?id=${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ─── Posizioni live community ──────────────────────────────────────────────────

export async function upsertCommunityLivePosition(
  _userId: string,
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
  try {
    const res = await apiFetch("/api/community/live-position", {
      method: "POST",
      body: JSON.stringify({
        display_name:  displayName,
        activity_type: activityType,
        ...fields,
      }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

export async function setCommunityInactive(_userId: string): Promise<string | null> {
  return upsertCommunityLivePosition(_userId, "", "altro", { lat: 0, lng: 0, is_active: false });
}

export const COMMUNITY_STALE_MS = 10 * 60 * 1000; // 10 minuti

export async function loadActiveCommunityPositions(): Promise<CommunityLivePosition[]> {
  try {
    const res = await fetch("/api/community/live-position");
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

/**
 * Polling ogni 5 s (sostituisce polling API).
 * Ritorna cleanup.
 */
export function subscribeCommunityLivePosition(
  cb: (pos: CommunityLivePosition) => void,
): () => void {
  const seen = new Map<string, string>(); // user_id → updated_at

  const poll = async () => {
    const positions = await loadActiveCommunityPositions();
    for (const pos of positions) {
      if (seen.get(pos.user_id) !== pos.updated_at) {
        seen.set(pos.user_id, pos.updated_at);
        cb(pos);
      }
    }
  };

  poll();
  const timer = setInterval(poll, 5_000);
  return () => clearInterval(timer);
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

export async function loadCommunityRoutePositions(
  sessionIds: string[],
): Promise<CommunityRoutePoint[]> {
  try {
    const results: CommunityRoutePoint[] = [];
    for (const sid of sessionIds) {
      const res = await fetch(`/api/community/route-positions?session_id=${sid}`);
      if (res.ok) {
        const data = await res.json();
        results.push(...(data as CommunityRoutePoint[]));
      }
    }
    return results.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  } catch { return []; }
}

/** Polling ogni 10 s (sostituisce polling API). */
export function subscribeCommunityRoutePositions(
  cb: (point: CommunityRoutePoint) => void,
): () => void {
  const seen = new Set<number>();
  const today = new Date().toISOString().slice(0, 10);

  const poll = async () => {
    const res = await fetch(`/api/community/route-positions?session_id=${today}`);
    if (!res.ok) return;
    const points = await res.json() as any[];
    for (const p of points) {
      if (!seen.has(p.id)) { seen.add(p.id); cb(p); }
    }
  };

  poll();
  const timer = setInterval(poll, 10_000);
  return () => clearInterval(timer);
}

export async function appendCommunityRoutePoint(
  _userId: string,
  displayName: string,
  activityType: ActivityType,
  lat: number,
  lng: number,
  speed: number | null,
  accuracy: number | null,
  heading: number | null,
  sessionId: string,
): Promise<string | null> {
  try {
    const res = await apiFetch("/api/community/route-positions", {
      method: "POST",
      body: JSON.stringify({
        display_name:  displayName,
        activity_type: activityType,
        lat, lng, speed, accuracy, heading,
        session_id: sessionId,
      }),
    });
    if (!res.ok) { const d = await res.json(); return d.error ?? "Errore"; }
    return null;
  } catch { return "Errore di rete"; }
}

// ─── Condivisione social ──────────────────────────────────────────────────────

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

  const shareData = { title: cfg.shareTitle, text, url: cfg.shareUrl };

  if (navigator.share && navigator.canShare?.(shareData)) {
    try { await navigator.share(shareData); } catch { /* dialog chiuso */ }
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${text}\n\n${shareData.url}`);
  }
}
