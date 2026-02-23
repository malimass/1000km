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
};

const EMPTY: AdminSettings = {
  fbPageId:    "",
  fbToken:     "",
  igUserId:    "",
  igImageUrl:  "",
  cloudName:   "",
  cloudPreset: "",
};

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS = {
  fbPageId:    "gp_fb_page_id",
  fbToken:     "gp_fb_token",
  igUserId:    "gp_ig_user_id",
  igImageUrl:  "gp_ig_image_url",
  cloudName:   "gp_cloudinary_name",
  cloudPreset: "gp_cloudinary_preset",
};

function lsGet(k: string) {
  try { return localStorage.getItem(k) ?? ""; } catch { return ""; }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v.trim()); } catch {}
}

export function loadFromLocalStorage(): AdminSettings {
  return {
    fbPageId:    lsGet(LS.fbPageId),
    fbToken:     lsGet(LS.fbToken),
    igUserId:    lsGet(LS.igUserId),
    igImageUrl:  lsGet(LS.igImageUrl),
    cloudName:   lsGet(LS.cloudName),
    cloudPreset: lsGet(LS.cloudPreset),
  };
}

function cacheToLocalStorage(s: AdminSettings) {
  lsSet(LS.fbPageId,    s.fbPageId);
  lsSet(LS.fbToken,     s.fbToken);
  lsSet(LS.igUserId,    s.igUserId);
  lsSet(LS.igImageUrl,  s.igImageUrl);
  lsSet(LS.cloudName,   s.cloudName);
  lsSet(LS.cloudPreset, s.cloudPreset);
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
