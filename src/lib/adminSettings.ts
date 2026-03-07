/**
 * adminSettings.ts
 * ─────────────────
 * Carica e salva le impostazioni admin via Neon API Routes.
 * Fallback su localStorage se non autenticato.
 */

import { apiFetch, getAuthToken } from "./api";

export type AdminSettings = {
  fbPageId:    string;
  fbToken:     string;
  igUserId:    string;
  igImageUrl:  string;
  cloudName:   string;
  cloudPreset: string;
  ytCn1: string; ytCn1Title: string; ytCn1Desc: string;
  ytCn2: string; ytCn2Title: string; ytCn2Desc: string;
  ytCn3: string; ytCn3Title: string; ytCn3Desc: string;
  shareTitle:     string;
  shareBody:      string;
  shareSocialTag: string;
  shareHashtags:  string;
  shareUrl:       string;
  autoPostOnStart: string; // "true" | "false"
};

const EMPTY: AdminSettings = {
  fbPageId:    "",
  fbToken:     "",
  igUserId:    "",
  igImageUrl:  "",
  cloudName:   "",
  cloudPreset: "",
  ytCn1: "", ytCn1Title: "", ytCn1Desc: "",
  ytCn2: "", ytCn2Title: "", ytCn2Desc: "",
  ytCn3: "", ytCn3Title: "", ytCn3Desc: "",
  shareTitle:     "",
  shareBody:      "",
  shareSocialTag: "",
  shareHashtags:  "",
  shareUrl:       "",
  autoPostOnStart: "false",
};

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS: Record<keyof AdminSettings, string> = {
  fbPageId:    "gp_fb_page_id",
  fbToken:     "gp_fb_token",
  igUserId:    "gp_ig_user_id",
  igImageUrl:  "gp_ig_image_url",
  cloudName:   "gp_cloudinary_name",
  cloudPreset: "gp_cloudinary_preset",
  ytCn1: "gp_yt_cn_1", ytCn1Title: "gp_yt_cn_1_title", ytCn1Desc: "gp_yt_cn_1_desc",
  ytCn2: "gp_yt_cn_2", ytCn2Title: "gp_yt_cn_2_title", ytCn2Desc: "gp_yt_cn_2_desc",
  ytCn3: "gp_yt_cn_3", ytCn3Title: "gp_yt_cn_3_title", ytCn3Desc: "gp_yt_cn_3_desc",
  shareTitle:     "gp_share_title",
  shareBody:      "gp_share_body",
  shareSocialTag: "gp_share_social_tag",
  shareHashtags:  "gp_share_hashtags",
  shareUrl:       "gp_share_url",
  autoPostOnStart: "gp_auto_post_on_start",
};

function lsGet(k: string) {
  try { return localStorage.getItem(k) ?? ""; } catch { return ""; }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v.trim()); } catch { /* noop */ }
}

export function loadFromLocalStorage(): AdminSettings {
  return Object.fromEntries(
    Object.entries(LS).map(([key, lsKey]) => [key, lsGet(lsKey)])
  ) as AdminSettings;
}

function cacheToLocalStorage(s: AdminSettings) {
  for (const [key, lsKey] of Object.entries(LS)) {
    lsSet(lsKey, (s as any)[key] ?? "");
  }
}

// ─── API pubblica ──────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AdminSettings> {
  if (!getAuthToken()) return loadFromLocalStorage();
  try {
    const res = await apiFetch("/api/admin-settings");
    if (!res.ok) return loadFromLocalStorage();
    const data = await res.json();
    const settings = { ...EMPTY, ...(data as Partial<AdminSettings>) };
    cacheToLocalStorage(settings);
    return settings;
  } catch {
    return loadFromLocalStorage();
  }
}

export async function saveSettings(settings: AdminSettings): Promise<void> {
  cacheToLocalStorage(settings);
  if (!getAuthToken()) return;
  try {
    await apiFetch("/api/admin-settings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  } catch { /* noop */ }
}

export type YtVideoData = { id: string; titolo: string; descrizione: string };

export function loadYtCrocifissoVideos(): [YtVideoData, YtVideoData, YtVideoData] {
  return [
    { id: lsGet(LS.ytCn1), titolo: lsGet(LS.ytCn1Title), descrizione: lsGet(LS.ytCn1Desc) },
    { id: lsGet(LS.ytCn2), titolo: lsGet(LS.ytCn2Title), descrizione: lsGet(LS.ytCn2Desc) },
    { id: lsGet(LS.ytCn3), titolo: lsGet(LS.ytCn3Title), descrizione: lsGet(LS.ytCn3Desc) },
  ];
}

// ─── site_settings (lettura pubblica senza auth) ───────────────────────────────

type SiteYtData = {
  ytCn1: string; ytCn1Title: string; ytCn1Desc: string;
  ytCn2: string; ytCn2Title: string; ytCn2Desc: string;
  ytCn3: string; ytCn3Title: string; ytCn3Desc: string;
};

export async function saveSiteYtVideos(s: SiteYtData): Promise<void> {
  if (!getAuthToken()) return;
  await apiFetch("/api/site-settings?id=1", { method: "POST", body: JSON.stringify(s) });
}

export async function loadSiteYtVideos(): Promise<[YtVideoData, YtVideoData, YtVideoData] | null> {
  try {
    const res = await fetch("/api/site-settings?id=1");
    if (!res.ok) return null;
    const d = await res.json() as Record<string, string>;
    if (!d || !d.ytCn1) return null;
    return [
      { id: d.ytCn1 ?? "", titolo: d.ytCn1Title ?? "", descrizione: d.ytCn1Desc ?? "" },
      { id: d.ytCn2 ?? "", titolo: d.ytCn2Title ?? "", descrizione: d.ytCn2Desc ?? "" },
      { id: d.ytCn3 ?? "", titolo: d.ytCn3Title ?? "", descrizione: d.ytCn3Desc ?? "" },
    ];
  } catch { return null; }
}

// ─── Condivisione social (site_settings id=2, lettura pubblica) ────────────────

export type ShareSettings = {
  shareTitle:     string;
  shareBody:      string;
  shareSocialTag: string;
  shareHashtags:  string;
  shareUrl:       string;
};

export const SHARE_DEFAULTS: ShareSettings = {
  shareTitle:     "Anch'io cammino per una giusta causa!",
  shareBody:      "un cammino di solidarietà da Bologna alla Calabria per sostenere la ricerca sul cancro al seno con Komen Italia.",
  shareSocialTag: "@1000kmdigratitudine",
  shareHashtags:  "#1000kmdiGratitudine #Komen #solidarieta #AnchIoCammino #Bologna #Calabria",
  shareUrl:       "https://1000kmdigratitudine.it/partecipa",
};

export async function saveSiteShareSettings(s: ShareSettings): Promise<void> {
  if (!getAuthToken()) return;
  await apiFetch("/api/site-settings?id=2", { method: "POST", body: JSON.stringify(s) });
}

export async function loadSiteShareSettings(): Promise<ShareSettings> {
  try {
    const res = await fetch("/api/site-settings?id=2");
    if (!res.ok) return SHARE_DEFAULTS;
    const data = await res.json();
    if (!data || Object.keys(data).length === 0) return SHARE_DEFAULTS;
    return { ...SHARE_DEFAULTS, ...(data as Partial<ShareSettings>) };
  } catch {
    // Prova localStorage come fallback
    const ls: ShareSettings = {
      shareTitle:     lsGet(LS.shareTitle),
      shareBody:      lsGet(LS.shareBody),
      shareSocialTag: lsGet(LS.shareSocialTag),
      shareHashtags:  lsGet(LS.shareHashtags),
      shareUrl:       lsGet(LS.shareUrl),
    };
    if (!ls.shareTitle && !ls.shareBody) return SHARE_DEFAULTS;
    return { ...SHARE_DEFAULTS, ...Object.fromEntries(Object.entries(ls).filter(([, v]) => v)) };
  }
}
