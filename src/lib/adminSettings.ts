/**
 * adminSettings.ts
 * ─────────────────
 * Carica e salva le impostazioni admin con strategia ibrida:
 *  - Se Supabase è configurato  → Supabase (fonte di verità) + localStorage (cache)
 *  - Se Supabase non è presente → solo localStorage (comportamento precedente)
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export type AdminSettings = {
  fbPageId:    string;
  fbToken:     string;
  igUserId:    string;
  igImageUrl:  string;
  cloudName:   string;
  cloudPreset: string;
  // Video YouTube — Crocifisso Nero (id · titolo · descrizione)
  ytCn1: string; ytCn1Title: string; ytCn1Desc: string;
  ytCn2: string; ytCn2Title: string; ytCn2Desc: string;
  ytCn3: string; ytCn3Title: string; ytCn3Desc: string;
  // Condivisione social — testi configurabili
  shareTitle:     string;  // titolo del post (es. "Anch'io cammino per una giusta causa!")
  shareBody:      string;  // corpo del messaggio
  shareSocialTag: string;  // handle social (es. "@1000kmdigratitudine")
  shareHashtags:  string;  // hashtag (es. "#1000kmdiGratitudine #Komen …")
  shareUrl:       string;  // link condivisione (es. "https://1000kmdigratitudine.it/partecipa")
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
};

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS = {
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
};

function lsGet(k: string) {
  try { return localStorage.getItem(k) ?? ""; } catch { return ""; }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v.trim()); } catch { /* noop */ }
}

export function loadFromLocalStorage(): AdminSettings {
  return {
    fbPageId:    lsGet(LS.fbPageId),
    fbToken:     lsGet(LS.fbToken),
    igUserId:    lsGet(LS.igUserId),
    igImageUrl:  lsGet(LS.igImageUrl),
    cloudName:   lsGet(LS.cloudName),
    cloudPreset: lsGet(LS.cloudPreset),
    ytCn1: lsGet(LS.ytCn1), ytCn1Title: lsGet(LS.ytCn1Title), ytCn1Desc: lsGet(LS.ytCn1Desc),
    ytCn2: lsGet(LS.ytCn2), ytCn2Title: lsGet(LS.ytCn2Title), ytCn2Desc: lsGet(LS.ytCn2Desc),
    ytCn3: lsGet(LS.ytCn3), ytCn3Title: lsGet(LS.ytCn3Title), ytCn3Desc: lsGet(LS.ytCn3Desc),
    shareTitle:     lsGet(LS.shareTitle),
    shareBody:      lsGet(LS.shareBody),
    shareSocialTag: lsGet(LS.shareSocialTag),
    shareHashtags:  lsGet(LS.shareHashtags),
    shareUrl:       lsGet(LS.shareUrl),
  };
}

function cacheToLocalStorage(s: AdminSettings) {
  lsSet(LS.fbPageId,    s.fbPageId);
  lsSet(LS.fbToken,     s.fbToken);
  lsSet(LS.igUserId,    s.igUserId);
  lsSet(LS.igImageUrl,  s.igImageUrl);
  lsSet(LS.cloudName,   s.cloudName);
  lsSet(LS.cloudPreset, s.cloudPreset);
  lsSet(LS.ytCn1, s.ytCn1); lsSet(LS.ytCn1Title, s.ytCn1Title); lsSet(LS.ytCn1Desc, s.ytCn1Desc);
  lsSet(LS.ytCn2, s.ytCn2); lsSet(LS.ytCn2Title, s.ytCn2Title); lsSet(LS.ytCn2Desc, s.ytCn2Desc);
  lsSet(LS.ytCn3, s.ytCn3); lsSet(LS.ytCn3Title, s.ytCn3Title); lsSet(LS.ytCn3Desc, s.ytCn3Desc);
  lsSet(LS.shareTitle,     s.shareTitle);
  lsSet(LS.shareBody,      s.shareBody);
  lsSet(LS.shareSocialTag, s.shareSocialTag);
  lsSet(LS.shareHashtags,  s.shareHashtags);
  lsSet(LS.shareUrl,       s.shareUrl);
}

// ─── API pubblica ──────────────────────────────────────────────────────────────
/**
 * Carica le impostazioni.
 * Priorità: Supabase → localStorage → default vuoti.
 */
export async function loadSettings(): Promise<AdminSettings> {
  if (!isSupabaseConfigured || !supabase) return loadFromLocalStorage();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loadFromLocalStorage();

  const { data, error } = await supabase
    .from("admin_settings")
    .select("data")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return loadFromLocalStorage();

  const settings = { ...EMPTY, ...(data.data as Partial<AdminSettings>) };
  cacheToLocalStorage(settings); // aggiorna cache locale
  return settings;
}

/**
 * Salva le impostazioni sia su Supabase (se disponibile) che su localStorage.
 */
export async function saveSettings(settings: AdminSettings): Promise<void> {
  cacheToLocalStorage(settings);

  if (!isSupabaseConfigured || !supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("admin_settings")
    .upsert({
      user_id:    user.id,
      data:       settings,
      updated_at: new Date().toISOString(),
    });
}

export type YtVideoData = { id: string; titolo: string; descrizione: string };

/**
 * Legge id, titolo e descrizione dei 3 video YouTube del Crocifisso Nero.
 * Funziona anche senza autenticazione (solo localStorage).
 * Le stringhe vuote indicano che il valore non è ancora stato impostato
 * — la pagina usa i testi di default in quel caso.
 */
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

/**
 * Salva i video YouTube nella tabella `site_settings` (riga singleton id=1).
 * Questa tabella è leggibile pubblicamente senza autenticazione,
 * così i visitatori della pagina CrocifissoNero vedono i video aggiornati.
 */
export async function saveSiteYtVideos(s: SiteYtData): Promise<void> {
  if (!supabase) return;
  await supabase.from("site_settings").upsert({
    id: 1,
    data: {
      ytCn1: s.ytCn1, ytCn1Title: s.ytCn1Title, ytCn1Desc: s.ytCn1Desc,
      ytCn2: s.ytCn2, ytCn2Title: s.ytCn2Title, ytCn2Desc: s.ytCn2Desc,
      ytCn3: s.ytCn3, ytCn3Title: s.ytCn3Title, ytCn3Desc: s.ytCn3Desc,
    },
    updated_at: new Date().toISOString(),
  });
}

/**
 * Legge i video YouTube da Supabase `site_settings` senza richiedere autenticazione.
 * Ritorna null se Supabase non è configurato o la riga non esiste ancora.
 */
export async function loadSiteYtVideos(): Promise<[YtVideoData, YtVideoData, YtVideoData] | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .single();
  if (!data?.data) return null;
  const d = data.data as Record<string, string>;
  return [
    { id: d.ytCn1 ?? "", titolo: d.ytCn1Title ?? "", descrizione: d.ytCn1Desc ?? "" },
    { id: d.ytCn2 ?? "", titolo: d.ytCn2Title ?? "", descrizione: d.ytCn2Desc ?? "" },
    { id: d.ytCn3 ?? "", titolo: d.ytCn3Title ?? "", descrizione: d.ytCn3Desc ?? "" },
  ];
}

// ─── Condivisione social (site_settings, lettura pubblica) ─────────────────────

export type ShareSettings = {
  shareTitle:     string;
  shareBody:      string;
  shareSocialTag: string;
  shareHashtags:  string;
  shareUrl:       string;
};

/** Valori di default usati se l'admin non ha ancora configurato nulla. */
export const SHARE_DEFAULTS: ShareSettings = {
  shareTitle:     "Anch'io cammino per una giusta causa!",
  shareBody:      "un cammino di solidarietà da Bologna alla Calabria per sostenere la ricerca sul cancro al seno con Komen Italia.",
  shareSocialTag: "@1000kmdigratitudine",
  shareHashtags:  "#1000kmdiGratitudine #Komen #solidarieta #AnchIoCammino #Bologna #Calabria",
  shareUrl:       "https://1000kmdigratitudine.it/partecipa",
};

/**
 * Salva i testi di condivisione social nella tabella `site_settings` (id=2).
 * Leggibili pubblicamente senza autenticazione.
 */
export async function saveSiteShareSettings(s: ShareSettings): Promise<void> {
  if (!supabase) return;
  await supabase.from("site_settings").upsert({
    id: 2,
    data: s,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Legge i testi di condivisione social da Supabase `site_settings` senza auth.
 * Ritorna i default se Supabase non è configurato o la riga non esiste ancora.
 */
export async function loadSiteShareSettings(): Promise<ShareSettings> {
  if (!supabase) {
    // Prova localStorage
    const ls: ShareSettings = {
      shareTitle:     lsGet(LS.shareTitle),
      shareBody:      lsGet(LS.shareBody),
      shareSocialTag: lsGet(LS.shareSocialTag),
      shareHashtags:  lsGet(LS.shareHashtags),
      shareUrl:       lsGet(LS.shareUrl),
    };
    // Se tutto vuoto → default
    if (!ls.shareTitle && !ls.shareBody && !ls.shareSocialTag) return SHARE_DEFAULTS;
    return { ...SHARE_DEFAULTS, ...Object.fromEntries(Object.entries(ls).filter(([, v]) => v)) };
  }
  const { data } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", 2)
    .single();
  if (!data?.data) return SHARE_DEFAULTS;
  return { ...SHARE_DEFAULTS, ...(data.data as Partial<ShareSettings>) };
}
