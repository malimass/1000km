import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearAuthToken } from "@/lib/api";
import { getLtwUrl, setLtwUrl, clearLtwUrl } from "@/lib/ltwStore";
import { tappe } from "@/lib/tappe";
import { loadSettings, saveSettings as saveSettingsDB, saveSiteYtVideos, saveSiteYtSanLucaVideos, saveSiteShareSettings, SHARE_DEFAULTS, type AdminSettings } from "@/lib/adminSettings";
import { loadSosteniPage, saveSosteniPage, type Sostenitore, type SosteniPage } from "@/lib/sostenitori";
import { loadPatrociniPage, savePatrociniPage, type Patrocinio, type PatrociniPage } from "@/lib/patrocini";
import {
  upsertLivePosition, appendRoutePoint, clearRoutePositions, distanceMeters, todaySessionId,
  loadAllLivePositions, type LivePosition,
} from "@/lib/liveTracking";
import {
  loadActiveCommunityPositions,
  type CommunityLivePosition,
} from "@/lib/communityTracking";
import { captureMapScreenshot } from "@/lib/mapSnapshot";
import { startGeoTracking, stopGeoTracking, isNativeApp } from "@/lib/capacitorGeo";
import {
  pubblicaNotizia, aggiornaRaccolta, loadRaccoltaFondi, type Categoria,
} from "@/lib/notizie";
import {
  CheckCircle, Trash2, ExternalLink, Settings, ChevronDown, ChevronUp,
  Send, Facebook, Instagram, Camera, ImageIcon, X, Loader2, Video, LogOut,
  MapPin, Youtube, Navigation, Users, Upload, Share2, Map, Bell, TrendingUp,
  Globe, Search, Plus, Shield, BarChart3, Monitor, Smartphone, Tablet,
} from "lucide-react";

const RouteMap = lazy(() => import("@/components/RouteMap"));
const PercorsoBuilder = lazy(() => import("@/components/PercorsoBuilder"));

// ─── Costanti ────────────────────────────────────────────────────────────────
const CAMMINO_START = new Date("2026-04-15T05:00:00");

const HASHTAGS =
  "#1000kmdigratitudine #gratitudepath #camminodigratitudine " +
  "#bologna #calabria #italia #solidarietà #raccoltafondi #ciclismo #running";

// ─── Template post ────────────────────────────────────────────────────────────
const MAP_URL = "https://1000kmdigratitudine.it/il-percorso";

function buildMessage(ltwUrl: string, isTraining: boolean): string {
  const liveLines = ltwUrl
    ? `🗺️ Seguici in live sulla mappa: ${MAP_URL}\n📍 Tracking GPS: ${ltwUrl}`
    : `🗺️ Seguici in live sulla mappa: ${MAP_URL}`;

  if (isTraining) {
    return (
      `🚴‍♂️ Allenamento in preparazione per i 1000 Km di Gratitudine!\n\n` +
      `Il 15 aprile partirò da Bologna per raggiungere Terranova Sappo Minulio (RC): ` +
      `1000 km, 14 tappe, 1 obiettivo.\n\n` +
      `${liveLines}\n\n` +
      HASHTAGS
    );
  }
  const now = new Date();
  const diff = Math.floor((now.getTime() - CAMMINO_START.getTime()) / 86400000);
  const t = tappe[Math.max(0, Math.min(diff, 13))];
  return (
    `🚴‍♂️ Giorno ${t.giorno} del Gratitude Path!\n\n` +
    `Oggi: ${t.da} → ${t.a} · ${t.km} km\n\n` +
    `Sto percorrendo 1000 km da Bologna a Terranova Sappo Minulio (RC) ` +
    `per raccogliere fondi per la ricerca e la solidarietà.\n\n` +
    `${liveLines}\n\n` +
    HASHTAGS
  );
}

// ─── Upload su Cloudinary (foto o video) ─────────────────────────────────────
async function uploadToCloudinary(
  file: File | string,
  cloudName: string,
  uploadPreset: string,
  resourceType: "image" | "video" = "image",
): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: "POST", body: fd },
  );
  const data = await res.json();
  return data.secure_url ?? null;
}

// ─── Meta Graph API — Foto ────────────────────────────────────────────────────
async function fbTextPost(pageId: string, token: string, message: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  return res.json();
}

async function fbPhotoPost(
  pageId: string,
  token: string,
  caption: string,
  imageUrlOrFile: string | File,
) {
  if (typeof imageUrlOrFile === "string") {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrlOrFile, caption, access_token: token }),
    });
    return res.json();
  }
  const fd = new FormData();
  fd.append("source", imageUrlOrFile);
  fd.append("caption", caption);
  fd.append("access_token", token);
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
    method: "POST",
    body: fd,
  });
  return res.json();
}

async function igPhotoPost(igUserId: string, token: string, imageUrl: string, caption: string) {
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const created = await createRes.json();
  if (created.error) throw new Error(created.error.message);

  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: created.id, access_token: token }),
  });
  return publishRes.json();
}

// ─── Meta Graph API — Reel ────────────────────────────────────────────────────
async function fbReelPost(pageId: string, token: string, videoUrl: string, description: string) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "pull",
      file_url: videoUrl,
      description,
      access_token: token,
    }),
  });
  return res.json();
}

async function igReelPost(igUserId: string, token: string, videoUrl: string, caption: string) {
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      access_token: token,
    }),
  });
  const created = await createRes.json();
  if (created.error) throw new Error(created.error.message);

  let isFinished = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v20.0/${created.id}?fields=status_code&access_token=${token}`,
    );
    const status = await statusRes.json();
    if (status.status_code === "FINISHED") { isFinished = true; break; }
    if (status.status_code === "ERROR") throw new Error("Errore elaborazione video su Instagram");
  }
  if (!isFinished) throw new Error("Timeout elaborazione video Instagram: riprova tra qualche secondo");

  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: created.id, access_token: token }),
  });
  return publishRes.json();
}

// ─── TikTok ────────────────────────────────────────────────────────────────
async function shareToTikTok(file: File, caption: string): Promise<{ ok: boolean; msg: string }> {
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return { ok: true, msg: "foglio condivisione aperto — seleziona TikTok" };
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return { ok: false, msg: "condivisione annullata" };
      return { ok: false, msg: String(e) };
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reel-1000km.mp4";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try { await navigator.clipboard.writeText(caption); } catch { /* noop */ }
  return { ok: true, msg: "video scaricato + testo copiato — carica manualmente su TikTok" };
}

// ─── Tipi sezione ─────────────────────────────────────────────────────────────
type Section = "live" | "social" | "notizie" | "raccolta" | "video" | "sostenitori" | "patrocini" | "share" | "settings" | "percorso" | "analisi";

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "live",        label: "Live Tracking", icon: <MapPin className="w-4 h-4" /> },
  { key: "social",      label: "Pubblica",      icon: <Send className="w-4 h-4" /> },
  { key: "notizie",     label: "Notizie",       icon: <Bell className="w-4 h-4" /> },
  { key: "raccolta",    label: "Raccolta",       icon: <TrendingUp className="w-4 h-4" /> },
  { key: "video",       label: "Video YouTube", icon: <Youtube className="w-4 h-4" /> },
  { key: "sostenitori", label: "Sostenitori",   icon: <Users className="w-4 h-4" /> },
  { key: "patrocini",   label: "Patrocini",     icon: <Shield className="w-4 h-4" /> },
  { key: "share",       label: "Condivisione",  icon: <Share2 className="w-4 h-4" /> },
  { key: "settings",    label: "Impostazioni",  icon: <Settings className="w-4 h-4" /> },
  { key: "percorso",    label: "Crea Percorso", icon: <Map className="w-4 h-4" /> },
  { key: "analisi",     label: "Analisi Sito",  icon: <BarChart3 className="w-4 h-4" /> },
];

// ─── Componente principale ────────────────────────────────────────────────────
export default function AdminLive() {
  const navigate = useNavigate();

  // ─ Navigazione sezioni ─
  const [activeSection, setActiveSection] = useState<Section>("live");

  // ─ Live tracking ─
  const [ltwUrl, setLtwUrlLocal] = useState(getLtwUrl);
  const [ltwSaved, setLtwSaved] = useState(false);

  // ─ Settings ─
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [fbPageId,    setFbPageId]    = useState("");
  const [fbToken,     setFbToken]     = useState("");
  const [igUserId,    setIgUserId]    = useState("");
  const [igImageUrl,  setIgImageUrl]  = useState("");
  const [cloudName,   setCloudName]   = useState("");
  const [cloudPreset, setCloudPreset] = useState("");

  // ─ Analytics ─
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsRange, setAnalyticsRange] = useState("7d");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [liveVisitors, setLiveVisitors] = useState<any>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [journeysOpen, setJourneysOpen] = useState(false);

  // ─ GPS Live ─
  const [runnerId,    setRunnerIdState] = useState<1 | 2>(() => {
    const saved = localStorage.getItem("gratitudepath_runner_id");
    return saved === "2" ? 2 : 1;
  });
  const [isTracking,  setIsTracking]  = useState(false);
  const [gpsPos,      setGpsPos]      = useState<{ lat: number; lng: number; speed: number | null; accuracy: number | null } | null>(null);
  const [gpsError,    setGpsError]    = useState("");
  const [dbError,     setDbError]     = useState("");   // errore scrittura Neon
  const [routeCount,    setRouteCount]    = useState(0);  // punti registrati in sessione
  const [clearingRoute, setClearingRoute] = useState(false);
  const [wakeLockOn,    setWakeLockOn]    = useState(false);
  const watchIdRef        = useRef<number | null>(null);
  const lastRoutePointRef = useRef<[number, number] | null>(null);  // ultimo punto salvato
  const lastRouteTimeRef  = useRef<number>(0);                      // timestamp ultimo salvataggio
  const sessionIdRef      = useRef<string>("");
  const wakeLockRef       = useRef<WakeLockSentinel | null>(null);
  const isTrackingRef     = useRef(false);

  function selectRunner(id: 1 | 2) {
    setRunnerIdState(id);
    localStorage.setItem("gratitudepath_runner_id", String(id));
  }

  // ─ Wake Lock (schermo sempre acceso durante il tracking) ─────────────────────
  async function acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      const sentinel = await (navigator as Navigator & { wakeLock: { request(t: string): Promise<WakeLockSentinel> } }).wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockOn(true);
      sentinel.addEventListener("release", () => setWakeLockOn(false));
    } catch { /* noop — permesso negato o browser non supportato */ }
  }

  async function releaseWakeLock() {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch { /* noop */ }
      wakeLockRef.current = null;
    }
    setWakeLockOn(false);
  }

  // Quando l'app torna in foreground (es. dopo una notifica), ri-acquisisce il lock
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && isTrackingRef.current) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ─ Video YouTube ─
  const [ytCn1, setYtCn1] = useState(""); const [ytCn1Title, setYtCn1Title] = useState(""); const [ytCn1Desc, setYtCn1Desc] = useState("");
  const [ytCn2, setYtCn2] = useState(""); const [ytCn2Title, setYtCn2Title] = useState(""); const [ytCn2Desc, setYtCn2Desc] = useState("");
  const [ytCn3, setYtCn3] = useState(""); const [ytCn3Title, setYtCn3Title] = useState(""); const [ytCn3Desc, setYtCn3Desc] = useState("");
  const [ytSaved, setYtSaved] = useState(false);
  // ─ Video YouTube San Luca (singolo video) ─
  const [ytSl1, setYtSl1] = useState(""); const [ytSl1Title, setYtSl1Title] = useState(""); const [ytSl1Desc, setYtSl1Desc] = useState("");
  const [ytSlSaved, setYtSlSaved] = useState(false);

  // ─ Condivisione social ─
  const [shareTitle,     setShareTitle]     = useState("");
  const [shareBody,      setShareBody]      = useState("");
  const [shareSocialTag, setShareSocialTag] = useState("");
  const [shareHashtags,  setShareHashtags]  = useState("");
  const [shareUrl,       setShareUrl]       = useState("");
  const [shareSaved,     setShareSaved]     = useState(false);

  // ─ Auto-post sui social all'avvio GPS ─
  const [autoPostOnStart, setAutoPostOnStart] = useState(false);
  const autoPostDoneRef = useRef(false);

  // ─ Sostenitori ─
  const [sosteniTitle,    setSosteniTitle]    = useState("I Sostenitori del Cammino");
  const [sosteniIntro,    setSosteniIntro]    = useState("");
  const [sosteniItems,    setSosteniItems]    = useState<Sostenitore[]>([]);
  const [sosteniSaved,    setSosteniSaved]    = useState(false);
  const [sosteniUploading, setSosteniUploading] = useState<string | null>(null);
  const sosteniLogoInputRef    = useRef<HTMLInputElement>(null);
  const sosteniUploadTargetRef = useRef<string | null>(null);
  const [scrapeUrl,      setScrapeUrl]      = useState("");
  const [scrapeLoading,  setScrapeLoading]  = useState(false);
  const [scrapeError,    setScrapeError]    = useState("");
  const [scrapePreview,  setScrapePreview]  = useState<Sostenitore | null>(null);

  // ─ Patrocini ─
  const [patrociniItems,    setPatrociniItems]    = useState<Patrocinio[]>([]);
  const [patrociniSaved,    setPatrociniSaved]    = useState(false);
  const [patrociniUploading, setPatrociniUploading] = useState<string | null>(null);
  const patrociniLogoRef    = useRef<HTMLInputElement>(null);
  const patrociniUploadRef  = useRef<string | null>(null);

  // ─ Notizie ─
  const [notiziaTitolo,   setNotiziaTitolo]   = useState("");
  const [notiziaCorpo,    setNotiziaCorpo]    = useState("");
  const [notiziaCategoria, setNotiziaCategoria] = useState<Categoria>("generale");
  const [notiziaTappaNum, setNotiziaTappaNum] = useState<number | "">("");
  const [notiziaImgUrl,   setNotiziaImgUrl]   = useState("");
  const [notiziaSaving,   setNotiziaSaving]   = useState(false);
  const [notiziaDone,     setNotiziaDone]     = useState(false);

  // ─ Raccolta Fondi ─
  const [raccoltaImporto, setRaccoltaImporto] = useState("");
  const [raccoltaDonatori, setRaccoltaDonatori] = useState("");
  const [raccoltaSaving,   setRaccoltaSaving]  = useState(false);
  const [raccoltaDone,     setRaccoltaDone]    = useState(false);

  // ─ Composer ─
  const isTraining = new Date() < CAMMINO_START;
  const [contentType, setContentType] = useState<"photo" | "reel">("photo");
  const [message, setMessage] = useState(() =>
    buildMessage(getLtwUrl() || "https://locatoweb.com/map/single/...", isTraining),
  );
  const [postFb, setPostFb] = useState(true);
  const [postIg, setPostIg] = useState(true);
  const [postTt, setPostTt] = useState(false);

  // ─ Foto ─
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview,  setPhotoPreview]  = useState<string | null>(null);
  const fileInputGallery = useRef<HTMLInputElement>(null);
  const fileInputCamera  = useRef<HTMLInputElement>(null);

  // ─ Video ─
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview,  setVideoPreview]  = useState<string | null>(null);
  const fileInputVideoGallery = useRef<HTMLInputElement>(null);
  const fileInputVideoCamera  = useRef<HTMLInputElement>(null);

  // ─ Pubblicazione ─
  const [posting,      setPosting]      = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [postResult,   setPostResult]   = useState<{ ok: string[]; err: string[] } | null>(null);

  // ─ Snapshot mappa community ─
  const [communityPositions, setCommunityPositions] = useState<CommunityLivePosition[]>([]);
  const [adminLivePos1, setAdminLivePos1] = useState<LivePosition | null>(null);
  const [adminLivePos2, setAdminLivePos2] = useState<LivePosition | null>(null);
  const [snapshotAlert, setSnapshotAlert] = useState(false);
  const [showSnapshotPanel, setShowSnapshotPanel] = useState(false);
  const [snapshotFile, setSnapshotFile] = useState<string | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [snapshotCaption, setSnapshotCaption] = useState("");
  const [snapshotPosting, setSnapshotPosting] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<{ ok: string[]; err: string[] } | null>(null);
  const [capturingMap, setCapturingMap] = useState(false);
  const lastAlertTimeRef = useRef<number>(0);

  // Carica impostazioni
  useEffect(() => {
    loadSettings().then(s => {
      setFbPageId(s.fbPageId);
      setFbToken(s.fbToken);
      setIgUserId(s.igUserId);
      setIgImageUrl(s.igImageUrl);
      setCloudName(s.cloudName);
      setCloudPreset(s.cloudPreset);
      setYtCn1(s.ytCn1); setYtCn1Title(s.ytCn1Title); setYtCn1Desc(s.ytCn1Desc);
      setYtCn2(s.ytCn2); setYtCn2Title(s.ytCn2Title); setYtCn2Desc(s.ytCn2Desc);
      setYtCn3(s.ytCn3); setYtCn3Title(s.ytCn3Title); setYtCn3Desc(s.ytCn3Desc);
      setYtSl1(s.ytSl1); setYtSl1Title(s.ytSl1Title); setYtSl1Desc(s.ytSl1Desc);
      setShareTitle(s.shareTitle); setShareBody(s.shareBody); setShareSocialTag(s.shareSocialTag);
      setShareHashtags(s.shareHashtags); setShareUrl(s.shareUrl);
      setAutoPostOnStart(s.autoPostOnStart === "true");
      setSettingsLoading(false);
    });
    loadSosteniPage().then(p => {
      setSosteniTitle(p.title);
      setSosteniIntro(p.intro);
      setSosteniItems(p.items);
    });
    loadPatrociniPage().then(p => {
      setPatrociniItems(p.items);
    });
    loadRaccoltaFondi().then(r => {
      if (r) {
        setRaccoltaImporto(String(r.importo_euro));
        setRaccoltaDonatori(String(r.donatori));
      }
    });
  }, []);

  useEffect(() => {
    if (ltwUrl) setMessage(buildMessage(ltwUrl, isTraining));
  }, [ltwUrl, isTraining]);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);
  useEffect(() => () => { if (snapshotPreview) URL.revokeObjectURL(snapshotPreview); }, [snapshotPreview]);

  // ─ Monitor posizioni live (admin + community) per snapshot — polling ─
  useEffect(() => {
    const poll = async () => {
      const pos = await loadAllLivePositions();
      setAdminLivePos1(pos[1]);
      setAdminLivePos2(pos[2]);
      const cp = await loadActiveCommunityPositions();
      setCommunityPositions(cp);
    };
    poll();
    const timer = setInterval(poll, 5_000);
    return () => clearInterval(timer);
  }, []);

  // Conta runner attivi — notifica quando ≥ 3
  const activeAdminCount = [adminLivePos1, adminLivePos2].filter(p => p?.is_active).length;
  const activeCommunityCount = communityPositions.filter(p => p.is_active).length;
  const totalActiveRunners = activeAdminCount + activeCommunityCount;

  useEffect(() => {
    const now = Date.now();
    if (totalActiveRunners >= 3 && now - lastAlertTimeRef.current > 30 * 60 * 1000) {
      setSnapshotAlert(true);
      lastAlertTimeRef.current = now;
    }
  }, [totalActiveRunners]);

  // ─ Carica analytics quando si apre la sezione ─
  useEffect(() => {
    if (activeSection !== "analisi") return;
    setAnalyticsLoading(true);
    const jwt = localStorage.getItem("gp_jwt");
    fetch(`/api/analytics?range=${analyticsRange}`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(d => setAnalyticsData(d))
      .catch(() => setAnalyticsData(null))
      .finally(() => setAnalyticsLoading(false));
  }, [activeSection, analyticsRange]);

  // ─ Poll visitatori live ogni 15s ─
  useEffect(() => {
    if (activeSection !== "analisi") return;
    const jwt = localStorage.getItem("gp_jwt");
    const fetchLive = () =>
      fetch("/api/analytics-live", { headers: { Authorization: `Bearer ${jwt}` } })
        .then(r => r.json())
        .then(d => setLiveVisitors(d))
        .catch(() => {});
    fetchLive();
    const timer = setInterval(fetchLive, 15_000);
    return () => clearInterval(timer);
  }, [activeSection]);

  // ─ Carica journeys quando aperto ─
  useEffect(() => {
    if (!journeysOpen || activeSection !== "analisi") return;
    const jwt = localStorage.getItem("gp_jwt");
    fetch("/api/analytics-journeys?limit=20", { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(d => setJourneys(d.sessions ?? []))
      .catch(() => setJourneys([]));
  }, [journeysOpen, activeSection]);

  // ─ Foto handlers ─
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPostResult(null);
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    if (fileInputGallery.current) fileInputGallery.current.value = "";
    if (fileInputCamera.current)  fileInputCamera.current.value  = "";
  }

  // ─ Video handlers ─
  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
    setPostResult(null);
  }

  function removeVideo() {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedVideo(null);
    setVideoPreview(null);
    if (fileInputVideoGallery.current) fileInputVideoGallery.current.value = "";
    if (fileInputVideoCamera.current)  fileInputVideoCamera.current.value  = "";
  }

  // ─ LTW ─
  function handleSaveLtw() {
    setLtwUrl(ltwUrl);
    setLtwSaved(true);
    setTimeout(() => setLtwSaved(false), 2500);
  }

  async function handleCopyShareLink() {
    const url = `${window.location.origin}/il-percorso?ltw=${encodeURIComponent(ltwUrl)}`;
    await navigator.clipboard.writeText(url);
  }

  // ─ Costruisce oggetto AdminSettings completo ─
  function buildAdminSettings(): AdminSettings {
    return { fbPageId, fbToken, igUserId, igImageUrl, cloudName, cloudPreset, ytCn1, ytCn1Title, ytCn1Desc, ytCn2, ytCn2Title, ytCn2Desc, ytCn3, ytCn3Title, ytCn3Desc, ytSl1, ytSl1Title, ytSl1Desc, ytSl2: "", ytSl2Title: "", ytSl2Desc: "", ytSl3: "", ytSl3Title: "", ytSl3Desc: "", shareTitle, shareBody, shareSocialTag, shareHashtags, shareUrl };
  }

  // ─ Impostazioni social ─
  async function handleSaveSettings() {
    await saveSettingsDB(buildAdminSettings());
  }

  // ─ Video YouTube ─
  async function handleSaveYtVideos() {
    await saveSettingsDB(buildAdminSettings());
    await saveSiteYtVideos({ ytCn1, ytCn1Title, ytCn1Desc, ytCn2, ytCn2Title, ytCn2Desc, ytCn3, ytCn3Title, ytCn3Desc });
    setYtSaved(true);
    setTimeout(() => setYtSaved(false), 2500);
  }

  // ─ Video YouTube San Luca ─
  async function handleSaveYtSanLucaVideos() {
    await saveSettingsDB(buildAdminSettings());
    await saveSiteYtSanLucaVideos({ ytSl1, ytSl1Title, ytSl1Desc, ytSl2: "", ytSl2Title: "", ytSl2Desc: "", ytSl3: "", ytSl3Title: "", ytSl3Desc: "" });
    setYtSlSaved(true);
    setTimeout(() => setYtSlSaved(false), 2500);
  }

  // ─ Condivisione social ─
  async function handleSaveShareSettings() {
    await saveSettingsDB(buildAdminSettings());
    await saveSiteShareSettings({ shareTitle, shareBody, shareSocialTag, shareHashtags, shareUrl });
    setShareSaved(true);
    setTimeout(() => setShareSaved(false), 2500);
  }

  // ─ Notizie handlers ─
  async function handlePubblicaNotizia() {
    if (!notiziaTitolo.trim() || !notiziaCorpo.trim()) return;
    setNotiziaSaving(true);
    const err = await pubblicaNotizia({
      titolo:       notiziaTitolo.trim(),
      corpo:        notiziaCorpo.trim(),
      categoria:    notiziaCategoria,
      tappa_num:    notiziaCategoria === "tappa" && notiziaTappaNum !== "" ? Number(notiziaTappaNum) : null,
      immagine_url: notiziaImgUrl.trim() || null,
      pubblicata:   true,
    });
    setNotiziaSaving(false);
    if (!err) {
      setNotiziaTitolo(""); setNotiziaCorpo(""); setNotiziaImgUrl(""); setNotiziaTappaNum("");
      setNotiziaDone(true);
      setTimeout(() => setNotiziaDone(false), 3000);
    }
  }

  // ─ Raccolta Fondi handler ─
  async function handleSaveRaccolta() {
    const importo = parseFloat(raccoltaImporto.replace(",", "."));
    const donatori = parseInt(raccoltaDonatori, 10);
    if (isNaN(importo) || isNaN(donatori)) return;
    setRaccoltaSaving(true);
    await aggiornaRaccolta(importo, donatori);
    setRaccoltaSaving(false);
    setRaccoltaDone(true);
    setTimeout(() => setRaccoltaDone(false), 2500);
  }

  // ─ Sostenitori handlers ─
  async function handleSaveSosteni() {
    const page: SosteniPage = { title: sosteniTitle, intro: sosteniIntro, items: sosteniItems };
    await saveSosteniPage(page);
    setSosteniSaved(true);
    setTimeout(() => setSosteniSaved(false), 2500);
  }

  function addSostenitore() {
    setSosteniItems(prev => [...prev, {
      id:      crypto.randomUUID(),
      nome:    "",
      testo:   "",
      logoUrl: "",
    }]);
  }

  function removeSostenitore(id: string) {
    setSosteniItems(prev => prev.filter(it => it.id !== id));
  }

  function updateSostenitore(id: string, field: keyof Sostenitore, value: string) {
    setSosteniItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  }

  async function handleScrapeUrl() {
    const url = scrapeUrl.trim();
    if (!url) return;
    setScrapeLoading(true);
    setScrapeError("");
    setScrapePreview(null);
    try {
      const resp = await fetch("/api/scrape-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("gp_jwt") ?? ""}`,
        },
        body: JSON.stringify({ url }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: "Errore sconosciuto" }));
        setScrapeError(data.error || `Errore ${resp.status}`);
        return;
      }
      const data = await resp.json();
      setScrapePreview({
        id:      crypto.randomUUID(),
        nome:    data.nome || "",
        testo:   data.testo || "",
        logoUrl: data.logoUrl || "",
        siteUrl: data.siteUrl || url,
      });
    } catch {
      setScrapeError("Impossibile raggiungere il sito");
    } finally {
      setScrapeLoading(false);
    }
  }

  function confirmScrapePreview() {
    if (!scrapePreview) return;
    setSosteniItems(prev => [...prev, scrapePreview]);
    setScrapePreview(null);
    setScrapeUrl("");
    setScrapeError("");
  }

  function cancelScrapePreview() {
    setScrapePreview(null);
    setScrapeError("");
  }

  function openLogoUpload(itemId: string) {
    sosteniUploadTargetRef.current = itemId;
    sosteniLogoInputRef.current?.click();
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = sosteniUploadTargetRef.current;
    e.target.value = "";
    if (!file || !targetId) return;

    // Convert file to base64 data URL (no Cloudinary needed)
    setSosteniUploading(targetId);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSosteniUploading(null);
      setSosteniItems(prev => {
        const updated = prev.map(it => it.id === targetId ? { ...it, logoUrl: dataUrl } : it);
        const page: SosteniPage = { title: sosteniTitle, intro: sosteniIntro, items: updated };
        saveSosteniPage(page);
        setSosteniSaved(true);
        setTimeout(() => setSosteniSaved(false), 2500);
        return updated;
      });
    };
    reader.onerror = () => setSosteniUploading(null);
    reader.readAsDataURL(file);
  }

  // ─ Patrocini handlers ─
  async function handleSavePatrocini() {
    const page: PatrociniPage = { title: "Patrocini istituzionali", intro: "", items: patrociniItems };
    await savePatrociniPage(page);
    setPatrociniSaved(true);
    setTimeout(() => setPatrociniSaved(false), 2500);
  }

  function addPatrocinio() {
    setPatrociniItems(prev => [...prev, {
      id:      crypto.randomUUID(),
      nome:    "",
      logoUrl: "",
    }]);
  }

  function removePatrocinio(id: string) {
    setPatrociniItems(prev => prev.filter(it => it.id !== id));
  }

  function updatePatrocinio(id: string, field: keyof Patrocinio, value: string) {
    setPatrociniItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  }

  function openPatrociniLogoUpload(itemId: string) {
    patrociniUploadRef.current = itemId;
    patrociniLogoRef.current?.click();
  }

  async function handlePatrociniLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = patrociniUploadRef.current;
    e.target.value = "";
    if (!file || !targetId) return;

    setPatrociniUploading(targetId);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPatrociniUploading(null);
      updatePatrocinio(targetId, "logoUrl", dataUrl);
    };
    reader.onerror = () => setPatrociniUploading(null);
    reader.readAsDataURL(file);
  }

  // ─ Auto-post sui social quando si avvia il GPS ─
  async function autoPostToSocial() {
    if (!autoPostOnStart || autoPostDoneRef.current) return;
    autoPostDoneRef.current = true;
    const postMessage = buildMessage(getLtwUrl() || "", isTraining);
    const ok: string[] = [];
    const err: string[] = [];
    // Facebook
    if (fbPageId && fbToken) {
      try {
        const res = await fbTextPost(fbPageId, fbToken, postMessage);
        if (res.error) err.push(`Facebook: ${res.error.message}`);
        else ok.push("Facebook ✓");
      } catch (e) { err.push(`Facebook: ${String(e)}`); }
    }
    // Instagram (serve immagine — usa igImageUrl fallback se presente)
    if (igUserId && fbToken && igImageUrl) {
      try {
        const res = await igPhotoPost(igUserId, fbToken, igImageUrl, postMessage);
        if (res.error) err.push(`Instagram: ${res.error.message}`);
        else ok.push("Instagram ✓");
      } catch (e) { err.push(`Instagram: ${String(e)}`); }
    }
    if (ok.length > 0 || err.length > 0) {
      setPostResult({ ok, err });
    }
  }

  // ─ GPS tracking ─
  async function startGpsTracking() {
    setGpsError("");
    setDbError("");
    autoPostDoneRef.current = false;
    sessionIdRef.current      = todaySessionId();
    lastRoutePointRef.current = null;
    lastRouteTimeRef.current  = 0;
    setRouteCount(0);
    // Non impostiamo isTracking=true qui: lo facciamo alla prima posizione GPS
    // valida, così se il GPS fallisce prima del fix il bottone torna su "Avvia".
    isTrackingRef.current = true;

    // Su app nativa il wake lock non serve (lo schermo può spegnersi)
    if (!isNativeApp()) acquireWakeLock();

    let gotFirstFix = false;

    await startGeoTracking(
      async ({ latitude: lat, longitude: lng, speed, accuracy, heading }) => {
        // Prima posizione valida: attiva lo stato tracking + auto-post
        if (!gotFirstFix) {
          gotFirstFix = true;
          setIsTracking(true);
          autoPostToSocial();
        }
        setGpsPos({ lat, lng, speed, accuracy });

        // ── Aggiorna posizione live ──────────────────────────────────────────
        const liveErr = await upsertLivePosition({ lat, lng, speed, accuracy, heading, is_active: true }, runnerId);
        if (liveErr) setDbError(`Posizione live non salvata: ${liveErr}`);
        else setDbError("");

        // ── Registra punto nella traccia (ogni ≥30 m oppure ≥60 s) ──────────
        const now = Date.now();
        const last = lastRoutePointRef.current;
        const elapsed = now - lastRouteTimeRef.current;
        const movedEnough = !last || distanceMeters(last, [lat, lng]) >= 30;
        const timeEnough  = elapsed >= 60_000;

        if (movedEnough || timeEnough) {
          await appendRoutePoint(lat, lng, speed, accuracy, heading, sessionIdRef.current, runnerId);
          lastRoutePointRef.current = [lat, lng];
          lastRouteTimeRef.current  = now;
          setRouteCount(c => c + 1);
        }
      },
      (errMsg) => {
        setGpsError(errMsg);
        // Se GPS fallisce prima del primo fix, resetta lo stato
        if (!gotFirstFix) {
          isTrackingRef.current = false;
          setIsTracking(false);
          releaseWakeLock();
        }
      },
    );

  }

  async function stopGpsTracking() {
    await stopGeoTracking();
    // Pulisci il vecchio watchId web (per retrocompatibilità)
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isTrackingRef.current = false;
    setIsTracking(false);
    setGpsPos(null);
    releaseWakeLock();
    await upsertLivePosition({ is_active: false }, runnerId);
  }

  async function handleClearRoute() {
    if (!window.confirm(`Cancellare la traccia di oggi per ${runnerId === 1 ? "Massimo" : "Nunzio"}? L'azione è irreversibile.`)) return;
    setClearingRoute(true);
    const err = await clearRoutePositions(todaySessionId(), runnerId);
    setClearingRoute(false);
    if (err) setDbError(`Errore cancellazione traccia: ${err}`);
    else { setRouteCount(0); setDbError(""); }
  }

  // Ferma il watch e rilascia il wake lock se si smonta il componente
  useEffect(() => () => {
    stopGeoTracking();
    if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current);
    if (wakeLockRef.current) { try { wakeLockRef.current.release(); } catch { /* noop */ } }
  }, []);

  // ─ Logout ─
  async function handleLogout() {
    clearAuthToken();
    localStorage.removeItem("gp_admin_auth");
    navigate("/admin-login", { replace: true });
  }

  // ─ Pubblica ─
  async function handlePublish() {
    setPosting(true);
    setPostResult(null);
    const ok: string[] = [];
    const err: string[] = [];

    if (contentType === "photo") {
      let uploadedUrl: string | null = null;
      if (selectedPhoto && cloudName && cloudPreset) {
        setUploadStatus("Caricamento foto…");
        try {
          uploadedUrl = await uploadToCloudinary(selectedPhoto, cloudName, cloudPreset, "image");
          if (!uploadedUrl) err.push("Cloudinary: upload fallito, riprova");
        } catch (e) {
          err.push(`Cloudinary: ${String(e)}`);
        }
      }
      const imageUrl = uploadedUrl ?? (selectedPhoto ? null : igImageUrl) ?? null;

      if (postFb) {
        setUploadStatus("Pubblicazione su Facebook…");
        try {
          let res;
          if (imageUrl) {
            res = await fbPhotoPost(fbPageId, fbToken, message, imageUrl);
          } else if (selectedPhoto) {
            res = await fbPhotoPost(fbPageId, fbToken, message, selectedPhoto);
          } else {
            res = await fbTextPost(fbPageId, fbToken, message);
          }
          if (res.error) err.push(`Facebook: ${res.error.message}`);
          else ok.push("Facebook ✓");
        } catch (e) {
          err.push(`Facebook: ${String(e)}`);
        }
      }

      if (postIg) {
        setUploadStatus("Pubblicazione su Instagram…");
        if (!imageUrl) {
          if (selectedPhoto && !cloudName) {
            err.push("Instagram: configura Cloudinary nelle impostazioni per postare foto");
          } else {
            err.push("Instagram: aggiungi una foto o imposta un URL immagine nelle impostazioni");
          }
        } else {
          try {
            const res = await igPhotoPost(igUserId, fbToken, imageUrl, message);
            if (res.error) err.push(`Instagram: ${res.error.message}`);
            else ok.push("Instagram ✓");
          } catch (e) {
            err.push(`Instagram: ${String(e)}`);
          }
        }
      }

    } else {
      if (!selectedVideo) {
        err.push("Seleziona un video per pubblicare un reel");
        setPostResult({ ok, err });
        setPosting(false);
        setUploadStatus("");
        return;
      }

      if ((postFb || postIg) && (!cloudName || !cloudPreset)) {
        err.push("Configura Cloudinary nelle impostazioni per pubblicare reel su FB/IG");
      }

      let videoUrl: string | null = null;
      if ((postFb || postIg) && cloudName && cloudPreset) {
        setUploadStatus("Caricamento video su Cloudinary…");
        try {
          videoUrl = await uploadToCloudinary(selectedVideo, cloudName, cloudPreset, "video");
          if (!videoUrl) err.push("Cloudinary: upload video fallito, riprova");
        } catch (e) {
          err.push(`Cloudinary: ${String(e)}`);
        }
      }

      if (postFb && videoUrl) {
        setUploadStatus("Pubblicazione Reel su Facebook…");
        try {
          const res = await fbReelPost(fbPageId, fbToken, videoUrl, message);
          if (res.error) err.push(`Facebook Reel: ${res.error.message}`);
          else ok.push("Facebook Reel ✓");
        } catch (e) {
          err.push(`Facebook Reel: ${String(e)}`);
        }
      }

      if (postIg && videoUrl) {
        setUploadStatus("Elaborazione Reel Instagram… (potrebbe richiedere fino a 30 secondi)");
        try {
          const res = await igReelPost(igUserId, fbToken, videoUrl, message);
          if (res.error) err.push(`Instagram Reel: ${res.error.message}`);
          else ok.push("Instagram Reel ✓");
        } catch (e) {
          err.push(`Instagram Reel: ${String(e)}`);
        }
      }

      if (postTt) {
        setUploadStatus("Apertura condivisione TikTok…");
        const result = await shareToTikTok(selectedVideo, message);
        if (result.ok) ok.push(`TikTok ✓ (${result.msg})`);
        else err.push(`TikTok: ${result.msg}`);
      }
    }

    setUploadStatus("");
    setPostResult({ ok, err });
    setPosting(false);
  }

  // ─ Snapshot mappa → social ─
  function buildSnapshotCaption(): string {
    return (
      `🗺️ ${totalActiveRunners} runner stanno percorrendo il Gratitude Path in questo momento!\n\n` +
      `Unisciti anche tu: scarica l'app e condividi il tuo cammino 🏃‍♂️\n\n` +
      `👉 ${MAP_URL}\n\n` +
      HASHTAGS
    );
  }

  function handleCaptureMap() {
    const url = captureMapScreenshot({ lat: adminLivePos1?.lat, lng: adminLivePos1?.lng });
    if (url) {
      setSnapshotFile(url);
      setSnapshotPreview(url);
    }
  }

  async function handlePublishSnapshot() {
    if (!snapshotFile) return;
    setSnapshotPosting(true);
    setSnapshotResult(null);
    const ok: string[] = [];
    const err: string[] = [];

    let uploadedUrl: string | null = null;
    if (cloudName && cloudPreset) {
      try {
        uploadedUrl = await uploadToCloudinary(snapshotFile, cloudName, cloudPreset, "image");
        if (!uploadedUrl) err.push("Cloudinary: upload fallito");
      } catch (e) {
        err.push(`Cloudinary: ${String(e)}`);
      }
    }

    if (fbPageId && fbToken) {
      try {
        const res = uploadedUrl
          ? await fbPhotoPost(fbPageId, fbToken, snapshotCaption, uploadedUrl)
          : await fbPhotoPost(fbPageId, fbToken, snapshotCaption, snapshotFile);
        if (res.error) err.push(`Facebook: ${res.error.message}`);
        else ok.push("Facebook ✓");
      } catch (e) {
        err.push(`Facebook: ${String(e)}`);
      }
    } else {
      err.push("Facebook: credenziali mancanti — configura nelle Impostazioni");
    }

    if (igUserId && fbToken && uploadedUrl) {
      try {
        const res = await igPhotoPost(igUserId, fbToken, uploadedUrl, snapshotCaption);
        if (res.error) err.push(`Instagram: ${res.error.message}`);
        else ok.push("Instagram ✓");
      } catch (e) {
        err.push(`Instagram: ${String(e)}`);
      }
    } else if (!uploadedUrl) {
      err.push("Instagram: configura Cloudinary per postare lo screenshot");
    }

    setSnapshotResult({ ok, err });
    setSnapshotPosting(false);
  }

  function dismissSnapshot() {
    if (snapshotPreview) URL.revokeObjectURL(snapshotPreview);
    setSnapshotFile(null);
    setSnapshotPreview(null);
    setSnapshotAlert(false);
    setShowSnapshotPanel(false);
    setSnapshotResult(null);
  }

  const canPublish = (() => {
    const anyPlatform = postFb || postIg || (contentType === "reel" && postTt);
    if (!anyPlatform) return false;
    if (postFb && (!fbToken || !fbPageId)) return false;
    if (postIg && (!fbToken || !igUserId)) return false;
    return true;
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">

      {/* ══ SIDEBAR — solo desktop (md+) ══════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 border-r border-border bg-card/40 sticky top-0 h-screen shrink-0">
        {/* Logo / titolo */}
        <div className="p-5 border-b border-border">
          <p className="font-heading text-sm font-bold text-foreground leading-tight">
            Admin · Gratitude Path
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTraining ? "Modalità allenamento" : "Cammino in corso 🚴‍♂️"}
          </p>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${activeSection === item.key
                  ? "bg-dona/10 text-dona"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/il-percorso"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            ← Percorso pubblico
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
        </div>
      </aside>

      {/* ══ AREA PRINCIPALE ════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Header mobile */}
        <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-heading text-sm font-bold text-foreground">Admin · Gratitude Path</p>
              <p className="text-[11px] text-muted-foreground">
                {isTraining ? "Modalità allenamento" : "Cammino in corso 🚴‍♂️"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Esci
            </button>
          </div>

          {/* Tab bar mobile */}
          <div className="flex border-t border-border overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors border-b-2
                  ${activeSection === item.key
                    ? "border-dona text-dona"
                    : "border-transparent text-muted-foreground"
                  }`}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                <span className="truncate w-full text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenuto sezioni */}
        <div className="flex-1 p-4 pb-20 md:p-8 overflow-y-auto">
          <div className="max-w-lg mx-auto md:max-w-2xl md:mx-0 space-y-5">

            {/* Caricamento */}
            {settingsLoading && (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Caricamento impostazioni…
              </div>
            )}

            {/* ── Notifica snapshot mappa community ──────────────────────── */}
            {snapshotAlert && !showSnapshotPanel && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full p-2 mt-0.5 shrink-0">
                    <Map className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      🗺️ {totalActiveRunners} runner attivi sulla mappa!
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cattura uno screenshot della mappa e pubblicalo su Facebook e Instagram.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setShowSnapshotPanel(true);
                        setSnapshotCaption(buildSnapshotCaption());
                      }}
                      className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Cattura e Posta
                    </button>
                    <button onClick={dismissSnapshot} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Pannello snapshot mappa community ──────────────────────── */}
            {showSnapshotPanel && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                    <Map className="w-4 h-4" /> Screenshot Mappa Live
                  </h2>
                  <button onClick={dismissSnapshot} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {totalActiveRunners} runner attivi ({activeAdminCount} admin + {activeCommunityCount} community)
                </p>

                {/* Mappa embedded */}
                <Suspense fallback={<div className="h-80 bg-muted rounded-xl animate-pulse flex items-center justify-center text-xs text-muted-foreground">Caricamento mappa…</div>}>
                  <RouteMap
                    containerId="admin-snapshot-map"
                    livePos={adminLivePos1}
                    livePos2={adminLivePos2}
                    communityPositions={communityPositions}
                  />
                </Suspense>

                {/* Cattura */}
                <button
                  onClick={handleCaptureMap}
                  disabled={capturingMap}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {capturingMap
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Cattura in corso…</>
                    : <><Camera className="w-4 h-4" /> Cattura Screenshot</>
                  }
                </button>

                {/* Anteprima screenshot */}
                {snapshotPreview && (
                  <>
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={snapshotPreview} alt="Screenshot mappa" className="w-full" />
                      <button
                        onClick={() => {
                          if (snapshotPreview) URL.revokeObjectURL(snapshotPreview);
                          setSnapshotFile(null);
                          setSnapshotPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Testo del post */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Testo del post</label>
                      <textarea
                        rows={6}
                        value={snapshotCaption}
                        onChange={e => setSnapshotCaption(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
                      />
                    </div>

                    {/* Risultato */}
                    {snapshotResult && (
                      <div className="space-y-1">
                        {snapshotResult.ok.map((p, i) => <p key={i} className="text-xs text-green-600 font-semibold">✓ {p}</p>)}
                        {snapshotResult.err.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                      </div>
                    )}

                    {/* Pubblica */}
                    <button
                      onClick={handlePublishSnapshot}
                      disabled={snapshotPosting || !snapshotFile}
                      className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
                    >
                      {snapshotPosting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Pubblicazione…</>
                        : <><Send className="w-4 h-4" /> Pubblica su Facebook + Instagram</>
                      }
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── SEZIONE: Live Tracking ─────────────────────────────────────── */}
            {activeSection === "live" && (<>
              {/* Pannello GPS diretto */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h2 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                  <Navigation className="w-4 h-4" /> GPS Diretto
                </h2>

                {!isTracking ? (
                  <>
                    {/* Selettore corridore */}
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Quale corridore sei?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectRunner(1)}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold border-2 transition-colors
                            ${runnerId === 1 ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border bg-muted/40 text-muted-foreground"}`}
                        >
                          🏃‍♂️ Massimo
                        </button>
                        <button
                          onClick={() => selectRunner(2)}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold border-2 transition-colors
                            ${runnerId === 2 ? "border-orange-500 bg-orange-50 text-orange-700" : "border-border bg-muted/40 text-muted-foreground"}`}
                        >
                          🏃‍♂️ Nunzio
                        </button>
                      </div>
                    </div>
                    {/* Toggle auto-post social */}
                    <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoPostOnStart}
                        onChange={e => {
                          setAutoPostOnStart(e.target.checked);
                          // Salva la preferenza
                          loadSettings().then(s => saveSettingsDB({ ...s, autoPostOnStart: e.target.checked ? "true" : "false" }));
                        }}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span className="text-xs text-muted-foreground">
                        <Send className="w-3 h-3 inline mr-1" />
                        Pubblica automaticamente sui social all'avvio
                      </span>
                    </label>

                    <button
                      onClick={startGpsTracking}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <Navigation className="w-4 h-4" /> Avvia Tracking GPS
                    </button>
                    <button
                      onClick={handleClearRoute}
                      disabled={clearingRoute}
                      className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground border border-border rounded-lg py-2 text-xs font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {clearingRoute ? "Cancellazione…" : "Cancella traccia di oggi"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-green-600">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                      </span>
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        {runnerId === 1 ? "🏃‍♂️ Massimo" : "🏃‍♂️ Nunzio"}
                      </span>
                      LIVE — Aggiornamento continuo
                    </div>
                    {gpsPos && (
                      <div className="bg-muted rounded-lg px-4 py-3 mb-3 font-mono text-xs space-y-1 text-foreground">
                        <p>Lat: {gpsPos.lat.toFixed(6)}</p>
                        <p>Lng: {gpsPos.lng.toFixed(6)}</p>
                        {gpsPos.speed != null && (
                          <p>Velocità: {(gpsPos.speed * 3.6).toFixed(1)} km/h</p>
                        )}
                        {gpsPos.accuracy != null && (
                          <p>Precisione: ±{Math.round(gpsPos.accuracy)} m</p>
                        )}
                      </div>
                    )}
                    {!gpsPos && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Acquisizione segnale GPS…
                      </div>
                    )}
                    {dbError && (
                      <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 font-semibold">
                        ⚠️ {dbError}
                      </div>
                    )}
                    {routeCount > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">
                        📍 {routeCount} punt{routeCount === 1 ? "o" : "i"} registrat{routeCount === 1 ? "o" : "i"} nella traccia
                      </p>
                    )}
                    {isNativeApp() ? (
                      <div className="mb-3 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 bg-green-50 border border-green-200 text-green-700">
                        <span>📲</span> App nativa — GPS attivo in background anche con schermo spento
                      </div>
                    ) : (
                      <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${wakeLockOn ? "bg-green-50 border border-green-200 text-green-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700"}`}>
                        {wakeLockOn
                          ? <><span>🔆</span> Schermo sempre acceso — il GPS continua anche in tasca</>
                          : <><span>⚠️</span> Tieni lo schermo acceso — se si blocca il GPS si ferma</>
                        }
                      </div>
                    )}
                    <button
                      onClick={stopGpsTracking}
                      className="w-full flex items-center justify-center gap-2 bg-red-500 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" /> Ferma Tracking
                    </button>
                    <button
                      onClick={handleClearRoute}
                      disabled={clearingRoute}
                      className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground border border-border rounded-lg py-2 text-xs font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {clearingRoute ? "Cancellazione…" : "Cancella traccia di oggi"}
                    </button>
                  </>
                )}
                {gpsError && <p className="text-xs text-red-500 mt-2">{gpsError}</p>}
              </div>

              {/* Separatore */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">oppure usa LocaToWeb</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Card LTW originale */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h2 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide">
                  📍 Link Live Tracking
                </h2>
                {getLtwUrl() && (
                  <p className="text-xs text-green-600 font-mono break-all mb-2">{getLtwUrl()}</p>
                )}
                <input
                  type="url"
                  placeholder="https://locatoweb.com/map/single/..."
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono mb-1 focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                  value={ltwUrl}
                  onChange={e => { setLtwUrlLocal(e.target.value); setLtwSaved(false); }}
                  onPaste={e => {
                    const pasted = e.clipboardData.getData("text").trim();
                    if (pasted.startsWith("https://locatoweb.com/")) {
                      e.preventDefault();
                      setLtwUrlLocal(pasted);
                      setLtwUrl(pasted);
                      setLtwSaved(true);
                      setMessage(buildMessage(pasted, isTraining));
                      setTimeout(() => setLtwSaved(false), 2500);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mb-3">💡 Incolla → si salva automaticamente</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveLtw}
                    disabled={!ltwUrl.startsWith("https://locatoweb.com/")}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-dona text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    {ltwSaved ? <><CheckCircle className="w-4 h-4" />Salvato!</> : "Salva"}
                  </button>
                  {ltwUrl && (
                    <button
                      onClick={handleCopyShareLink}
                      className="px-3 border border-dona/30 text-dona rounded-lg text-sm hover:bg-dona/5"
                      title="Copia link condivisibile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { clearLtwUrl(); setLtwUrlLocal(""); }}
                    className="px-3 border border-border text-muted-foreground rounded-lg text-sm hover:bg-muted"
                    title="Cancella URL"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>)}

            {/* ── SEZIONE: Pubblica sui social ───────────────────────────────── */}
            {activeSection === "social" && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h2 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
                  📣 Pubblica sui social
                </h2>

                {/* Tipo contenuto */}
                <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => { setContentType("photo"); setPostResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-all
                      ${contentType === "photo" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Camera className="w-4 h-4" /> Foto
                  </button>
                  <button
                    onClick={() => { setContentType("reel"); setPostResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-all
                      ${contentType === "reel" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Video className="w-4 h-4" /> Reel
                  </button>
                </div>

                {/* Template */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setMessage(buildMessage(ltwUrl || "https://...", true))}
                    className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
                  >
                    Template allenamento
                  </button>
                  <button
                    onClick={() => setMessage(buildMessage(ltwUrl || "https://...", false))}
                    className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
                  >
                    Template evento
                  </button>
                </div>

                {/* Testo */}
                <textarea
                  rows={8}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-body mb-4 focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />

                {/* Foto */}
                {contentType === "photo" && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-foreground mb-2">📷 Foto (opzionale)</p>
                    <input ref={fileInputGallery} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <input ref={fileInputCamera}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />

                    {photoPreview ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={photoPreview} alt="Anteprima" className="w-full h-52 object-cover" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button onClick={() => fileInputGallery.current?.click()}
                            className="bg-black/60 text-white rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                            Cambia
                          </button>
                          <button onClick={removePhoto}
                            className="bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {!cloudName && (
                          <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 px-3 py-1.5">
                            <p className="text-xs text-white font-semibold text-center">
                              ⚠️ Configura Cloudinary nelle impostazioni per postare su Instagram
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => fileInputCamera.current?.click()}
                          className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-dona/50 hover:bg-dona/5 transition-all">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Scatta foto</span>
                        </button>
                        <button onClick={() => fileInputGallery.current?.click()}
                          className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-dona/50 hover:bg-dona/5 transition-all">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Dalla galleria</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Video (Reel) */}
                {contentType === "reel" && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-foreground mb-2">🎬 Video (richiesto)</p>
                    <input ref={fileInputVideoGallery} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                    <input ref={fileInputVideoCamera}  type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoChange} />

                    {videoPreview ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <video src={videoPreview} controls className="w-full max-h-64 rounded-xl bg-black" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button onClick={() => fileInputVideoGallery.current?.click()}
                            className="bg-black/60 text-white rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                            Cambia
                          </button>
                          <button onClick={removeVideo}
                            className="bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {!cloudName && (
                          <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 px-3 py-1.5">
                            <p className="text-xs text-white font-semibold text-center">
                              ⚠️ Configura Cloudinary nelle impostazioni per pubblicare reel
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => fileInputVideoCamera.current?.click()}
                          className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-dona/50 hover:bg-dona/5 transition-all">
                          <Video className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Registra video</span>
                        </button>
                        <button onClick={() => fileInputVideoGallery.current?.click()}
                          className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-dona/50 hover:bg-dona/5 transition-all">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Dalla galleria</span>
                        </button>
                      </div>
                    )}
                    {postTt && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                        ℹ️ <strong>TikTok</strong>: al momento della pubblicazione si aprirà il foglio
                        di condivisione iOS — seleziona TikTok dall'elenco.
                      </p>
                    )}
                  </div>
                )}

                {/* Piattaforme */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setPostFb(v => !v)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all
                      ${postFb ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground"}`}
                  >
                    <Facebook className="w-4 h-4" /> Facebook
                  </button>
                  <button
                    onClick={() => setPostIg(v => !v)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all
                      ${postIg ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent" : "border-border text-muted-foreground"}`}
                  >
                    <Instagram className="w-4 h-4" /> Instagram
                  </button>
                  {contentType === "reel" && (
                    <button
                      onClick={() => setPostTt(v => !v)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all
                        ${postTt ? "bg-black text-white border-black" : "border-border text-muted-foreground"}`}
                    >
                      <TikTokIcon active={postTt} /> TikTok
                    </button>
                  )}
                </div>

                {/* Stato upload */}
                {uploadStatus && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    <span>{uploadStatus}</span>
                  </div>
                )}

                {/* Risultato */}
                {postResult && (
                  <div className="mb-3 space-y-1">
                    {postResult.ok.map((p, i) => <p key={i} className="text-xs text-green-600 font-semibold">✓ {p}</p>)}
                    {postResult.err.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                  </div>
                )}

                {!fbToken && (postFb || postIg) && (
                  <p className="text-xs text-amber-600 mb-3">
                    ⚠️ Imposta le credenziali Meta nelle{" "}
                    <button onClick={() => setActiveSection("settings")} className="underline">Impostazioni</button>{" "}
                    per poter pubblicare.
                  </p>
                )}

                <button
                  onClick={handlePublish}
                  disabled={!canPublish || posting}
                  className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  {posting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />{uploadStatus || "Pubblicazione…"}</>
                    : <><Send className="w-4 h-4" />{contentType === "reel" ? "Pubblica Reel" : "Pubblica ora"}</>
                  }
                </button>
              </div>
            )}

            {/* ── SEZIONE: Notizie ───────────────────────────────────────────── */}
            {activeSection === "notizie" && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Pubblica Notizia
                </h2>
                <p className="text-xs text-muted-foreground">
                  Le notizie vengono pubblicate immediatamente sulla pagina{" "}
                  <Link to="/notizie" target="_blank" className="underline text-dona">
                    /notizie
                  </Link>{" "}
                  e notificate in tempo reale a tutti i visitatori.
                </p>

                {/* Titolo */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={notiziaTitolo}
                    onChange={e => setNotiziaTitolo(e.target.value)}
                    placeholder="Es. Massimo ha completato la tappa 3!"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {(["generale", "tappa", "raccolta", "emergenza"] as Categoria[]).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setNotiziaCategoria(cat)}
                        className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                          notiziaCategoria === cat
                            ? "bg-dona text-white border-dona"
                            : "border-border text-muted-foreground hover:border-dona/40"
                        }`}
                      >
                        {cat === "generale" ? "Generale" : cat === "tappa" ? "Tappa" : cat === "raccolta" ? "Raccolta" : "Avviso"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numero tappa (solo se categoria = tappa) */}
                {notiziaCategoria === "tappa" && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Numero tappa</label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={notiziaTappaNum}
                      onChange={e => setNotiziaTappaNum(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Es. 3"
                      className="w-32 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                    />
                  </div>
                )}

                {/* Corpo */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Testo *</label>
                  <textarea
                    rows={5}
                    value={notiziaCorpo}
                    onChange={e => setNotiziaCorpo(e.target.value)}
                    placeholder="Scrivi qui il testo completo della notizia…"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{notiziaCorpo.length} caratteri</p>
                </div>

                {/* URL immagine */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">URL immagine (opzionale)</label>
                  <input
                    type="url"
                    value={notiziaImgUrl}
                    onChange={e => setNotiziaImgUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/…"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                  />
                </div>

                {/* Feedback */}
                {notiziaDone && (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                    <CheckCircle className="w-4 h-4" /> Notizia pubblicata!
                  </div>
                )}

                <button
                  onClick={handlePubblicaNotizia}
                  disabled={notiziaSaving || !notiziaTitolo.trim() || !notiziaCorpo.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  {notiziaSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Pubblicazione…</>
                    : <><Bell className="w-4 h-4" /> Pubblica notizia</>
                  }
                </button>
              </div>
            )}

            {/* ── SEZIONE: Raccolta Fondi ─────────────────────────────────────── */}
            {activeSection === "raccolta" && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Raccolta Fondi Live
                </h2>
                <p className="text-xs text-muted-foreground">
                  Aggiorna il contatore live della raccolta fondi visibile sulla pagina{" "}
                  <Link to="/dona" target="_blank" className="underline text-dona">
                    /dona
                  </Link>.
                  La barra si aggiornerà in tempo reale per tutti i visitatori.
                </p>

                {/* Importo */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Importo raccolto (€)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">€</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={raccoltaImporto}
                      onChange={e => setRaccoltaImporto(e.target.value)}
                      placeholder="Es. 4500"
                      className="flex-1 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Donatori */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Numero donatori
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={raccoltaDonatori}
                    onChange={e => setRaccoltaDonatori(e.target.value)}
                    placeholder="Es. 87"
                    className="w-40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                  />
                </div>

                {/* Anteprima barra */}
                {raccoltaImporto && !isNaN(parseFloat(raccoltaImporto)) && (
                  <div className="bg-muted/40 rounded-xl p-4">
                    <p className="text-xs font-semibold text-foreground mb-2">Anteprima barra progresso</p>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-dona to-dona/80 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (parseFloat(raccoltaImporto) / 50000) * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        € {parseFloat(raccoltaImporto || "0").toLocaleString("it-IT")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {((parseFloat(raccoltaImporto) / 50000) * 100).toFixed(1)}% di € 50.000
                      </span>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {raccoltaDone && (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                    <CheckCircle className="w-4 h-4" /> Raccolta aggiornata!
                  </div>
                )}

                <button
                  onClick={handleSaveRaccolta}
                  disabled={raccoltaSaving || !raccoltaImporto || !raccoltaDonatori}
                  className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  {raccoltaSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvataggio…</>
                    : <><TrendingUp className="w-4 h-4" /> Aggiorna raccolta</>
                  }
                </button>
              </div>
            )}

            {/* ── SEZIONE: Video YouTube ─────────────────────────────────────── */}
            {activeSection === "video" && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h2 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide">
                    🎬 Video YouTube — Crocifisso Nero
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Inserisci l'ID del video YouTube (es. da{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong></code>{" "}
                    → copia solo la parte in grassetto).
                  </p>

                  <div className="space-y-5">
                    <YtVideoField
                      num={1}
                      ytId={ytCn1} onYtId={setYtCn1}
                      title={ytCn1Title} onTitle={setYtCn1Title}
                      desc={ytCn1Desc}  onDesc={setYtCn1Desc}
                      defaultTitle="La Storia del Crocifisso Nero"
                      defaultDesc="Le origini e la leggenda del sacro simulacro ligneo venerato a Terranova Sappo Minulio, tra fede popolare e tradizione secolare."
                    />
                    <YtVideoField
                      num={2}
                      ytId={ytCn2} onYtId={setYtCn2}
                      title={ytCn2Title} onTitle={setYtCn2Title}
                      desc={ytCn2Desc}  onDesc={setYtCn2Desc}
                      defaultTitle="La Devozione e le Celebrazioni"
                      defaultDesc="Le feste patronali e i pellegrinaggi che ogni anno richiamano migliaia di fedeli da tutta la Calabria e dal sud Italia."
                    />
                    <YtVideoField
                      num={3}
                      ytId={ytCn3} onYtId={setYtCn3}
                      title={ytCn3Title} onTitle={setYtCn3Title}
                      desc={ytCn3Desc}  onDesc={setYtCn3Desc}
                      defaultTitle="I Miracoli e le Grazie"
                      defaultDesc="Le testimonianze dei fedeli e i prodigi tramandati dalla tradizione locale legati al SS Crocifisso Nero."
                    />
                  </div>

                  <button
                    onClick={handleSaveYtVideos}
                    className="mt-5 w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    {ytSaved
                      ? <><CheckCircle className="w-4 h-4" /> Salvato!</>
                      : <><Youtube className="w-4 h-4" /> Salva video</>
                    }
                  </button>

                  <p className="mt-3 text-[11px] text-muted-foreground text-center">
                    I link vengono salvati localmente e applicati alla pagina{" "}
                    <Link to="/ss-crocifisso-nero" className="underline text-dona" target="_blank">
                      Crocifisso Nero
                    </Link>{" "}
                    su questo dispositivo.
                  </p>
                </div>

                {/* ── San Luca ─────────────────────────────────────────────── */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h2 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide">
                    🎬 Video YouTube — Madonna di San Luca
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Inserisci l'ID del video YouTube (es. da{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong></code>{" "}
                    → copia solo la parte in grassetto).
                  </p>

                  <div className="space-y-5">
                    <YtVideoField
                      num={1}
                      ytId={ytSl1} onYtId={setYtSl1}
                      title={ytSl1Title} onTitle={setYtSl1Title}
                      desc={ytSl1Desc}  onDesc={setYtSl1Desc}
                      defaultTitle="Il Santuario della Madonna di San Luca"
                      defaultDesc="La storia secolare del Santuario sul Colle della Guardia e il portico più lungo del mondo che lo collega a Bologna."
                    />
                  </div>

                  <button
                    onClick={handleSaveYtSanLucaVideos}
                    className="mt-5 w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    {ytSlSaved
                      ? <><CheckCircle className="w-4 h-4" /> Salvato!</>
                      : <><Youtube className="w-4 h-4" /> Salva video</>
                    }
                  </button>

                  <p className="mt-3 text-[11px] text-muted-foreground text-center">
                    I link vengono salvati localmente e applicati alla pagina{" "}
                    <Link to="/madonna-di-san-luca" className="underline text-dona" target="_blank">
                      Madonna di San Luca
                    </Link>{" "}
                    su questo dispositivo.
                  </p>
                </div>
              </div>
            )}

            {/* ── SEZIONE: Sostenitori ───────────────────────────────────────── */}
            {activeSection === "sostenitori" && (
              <div className="space-y-4">
                {/* Input logo nascosto condiviso */}
                <input
                  ref={sosteniLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileChange}
                />

                {/* Titolo e intro */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4" /> Pagina Sostenitori
                  </h2>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Titolo pagina</label>
                    <input
                      type="text"
                      value={sosteniTitle}
                      onChange={e => setSosteniTitle(e.target.value)}
                      placeholder="I Sostenitori del Cammino"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Testo introduttivo</label>
                    <textarea
                      rows={3}
                      value={sosteniIntro}
                      onChange={e => setSosteniIntro(e.target.value)}
                      placeholder="Un ringraziamento speciale a tutte le aziende e persone che sostengono il cammino…"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
                    />
                  </div>
                </div>

                {/* Aggiungi da URL */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Aggiungi da sito web
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={scrapeUrl}
                      onChange={e => { setScrapeUrl(e.target.value); setScrapeError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleScrapeUrl()}
                      placeholder="Incolla URL del sostenitore (es. https://azienda.it)"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                    />
                    <button
                      onClick={handleScrapeUrl}
                      disabled={scrapeLoading || !scrapeUrl.trim()}
                      className="flex items-center gap-1.5 border border-border rounded-lg px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {scrapeLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizzo…</>
                        : <><Search className="w-4 h-4" /> Analizza</>
                      }
                    </button>
                  </div>

                  {scrapeError && (
                    <p className="text-xs text-red-500">{scrapeError}</p>
                  )}

                  {/* Anteprima card dal sito */}
                  {scrapePreview && (
                    <div className="border-2 border-dona/40 rounded-xl p-4 bg-dona/5 space-y-3">
                      <p className="text-xs font-bold text-dona uppercase tracking-wide">Anteprima sostenitore</p>
                      <div className="flex items-start gap-4">
                        {scrapePreview.logoUrl ? (
                          <img
                            src={scrapePreview.logoUrl}
                            alt={scrapePreview.nome}
                            className="h-16 w-16 object-contain rounded border border-border bg-white flex-shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="h-16 w-16 rounded border-2 border-dashed border-border flex items-center justify-center bg-muted/30 flex-shrink-0">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-0.5">Nome</label>
                            <input
                              type="text"
                              value={scrapePreview.nome}
                              onChange={e => setScrapePreview(prev => prev ? { ...prev, nome: e.target.value } : null)}
                              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-foreground mb-0.5">Descrizione</label>
                            <textarea
                              rows={2}
                              value={scrapePreview.testo}
                              onChange={e => setScrapePreview(prev => prev ? { ...prev, testo: e.target.value } : null)}
                              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground resize-none"
                            />
                          </div>
                          {scrapePreview.siteUrl && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              <Globe className="w-3 h-3 inline mr-1" />{scrapePreview.siteUrl}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={confirmScrapePreview}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-dona text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          <Plus className="w-4 h-4" /> Conferma e aggiungi
                        </button>
                        <button
                          onClick={cancelScrapePreview}
                          className="flex items-center justify-center gap-1.5 border border-border rounded-lg px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
                        >
                          <X className="w-4 h-4" /> Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista sostenitori */}
                {sosteniItems.map((item, idx) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Sostenitore {idx + 1}
                      </span>
                      <button
                        onClick={() => removeSostenitore(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                      {item.logoUrl ? (
                        <div className="relative">
                          <img
                            src={item.logoUrl}
                            alt={item.nome}
                            className="h-14 w-auto max-w-[120px] object-contain rounded border border-border bg-muted/30"
                          />
                          <button
                            onClick={() => updateSostenitore(item.id, "logoUrl", "")}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => openLogoUpload(item.id)}
                        disabled={sosteniUploading === item.id}
                        className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {sosteniUploading === item.id
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Caricamento…</>
                          : <><Upload className="w-3.5 h-3.5" /> {item.logoUrl ? "Cambia logo" : "Carica logo"}</>
                        }
                      </button>
                    </div>

                    {/* Nome */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Nome azienda</label>
                      <input
                        type="text"
                        value={item.nome}
                        onChange={e => updateSostenitore(item.id, "nome", e.target.value)}
                        placeholder="Es. Azienda XYZ"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                      />
                    </div>

                    {/* Testo */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Descrizione</label>
                      <textarea
                        rows={2}
                        value={item.testo}
                        onChange={e => updateSostenitore(item.id, "testo", e.target.value)}
                        placeholder="Breve descrizione del sostenitore…"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
                      />
                    </div>

                    {/* Sito web */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Sito web</label>
                      <input
                        type="url"
                        value={item.siteUrl ?? ""}
                        onChange={e => updateSostenitore(item.id, "siteUrl", e.target.value)}
                        placeholder="https://www.azienda.it"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                      />
                    </div>
                  </div>
                ))}

                {/* Aggiungi + Salva */}
                <button
                  onClick={addSostenitore}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm font-semibold text-muted-foreground hover:border-dona/50 hover:text-dona hover:bg-dona/5 transition-all"
                >
                  + Aggiungi sostenitore
                </button>

                <button
                  onClick={handleSaveSosteni}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {sosteniSaved
                    ? <><CheckCircle className="w-4 h-4" /> Salvato!</>
                    : <><Users className="w-4 h-4" /> Salva sostenitori</>
                  }
                </button>

                <p className="text-[11px] text-muted-foreground text-center">
                  I dati vengono salvati su Neon e visibili sulla{" "}
                  <Link to="/sostenitori" target="_blank" className="underline text-dona">
                    pagina pubblica
                  </Link>.
                </p>
              </div>
            )}

            {/* ── SEZIONE: Patrocini ───────────────────────────────────────── */}
            {activeSection === "patrocini" && (
              <div className="space-y-4">
                {/* Input logo nascosto */}
                <input
                  ref={patrociniLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePatrociniLogoChange}
                />

                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4" /> Pagina Patrocini istituzionali
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Gestisci gli enti che hanno concesso il patrocinio morale al progetto.
                  </p>
                </div>

                {/* Lista patrocini */}
                {patrociniItems.map((item, idx) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        Patrocinio {idx + 1}
                      </span>
                      <button
                        onClick={() => removePatrocinio(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                      {item.logoUrl ? (
                        <div className="relative">
                          <img
                            src={item.logoUrl}
                            alt={item.nome}
                            className="h-14 w-auto max-w-[120px] object-contain rounded border border-border bg-muted/30"
                          />
                          <button
                            onClick={() => updatePatrocinio(item.id, "logoUrl", "")}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => openPatrociniLogoUpload(item.id)}
                        disabled={patrociniUploading === item.id}
                        className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {patrociniUploading === item.id
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Caricamento…</>
                          : <><Upload className="w-3.5 h-3.5" /> {item.logoUrl ? "Cambia logo" : "Carica logo"}</>
                        }
                      </button>
                    </div>

                    {/* Nome ente */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Nome ente</label>
                      <input
                        type="text"
                        value={item.nome}
                        onChange={e => updatePatrocinio(item.id, "nome", e.target.value)}
                        placeholder="Es. Comune di Bologna"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                      />
                    </div>

                    {/* Sito web */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Sito web</label>
                      <input
                        type="url"
                        value={item.siteUrl ?? ""}
                        onChange={e => updatePatrocinio(item.id, "siteUrl", e.target.value)}
                        placeholder="https://www.comune.bologna.it"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
                      />
                    </div>
                  </div>
                ))}

                {/* Aggiungi + Salva */}
                <button
                  onClick={addPatrocinio}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm font-semibold text-muted-foreground hover:border-dona/50 hover:text-dona hover:bg-dona/5 transition-all"
                >
                  + Aggiungi patrocinio
                </button>

                <button
                  onClick={handleSavePatrocini}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {patrociniSaved
                    ? <><CheckCircle className="w-4 h-4" /> Salvato!</>
                    : <><Shield className="w-4 h-4" /> Salva patrocini</>
                  }
                </button>

                <p className="text-[11px] text-muted-foreground text-center">
                  I dati vengono salvati su Neon e visibili sulla{" "}
                  <Link to="/patrocini" target="_blank" className="underline text-dona">
                    pagina pubblica
                  </Link>.
                </p>
              </div>
            )}

            {/* ── SEZIONE: Condivisione social ──────────────────────────────── */}
            {activeSection === "share" && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                  📤 Testi condivisione social
                </h2>
                <p className="text-xs text-muted-foreground">
                  Questi testi vengono usati quando un corridore condivide la propria attività sui social.
                  Lascia vuoto per usare il testo predefinito.
                </p>

                <Field
                  label="Titolo del post"
                  value={shareTitle}
                  onChange={setShareTitle}
                  placeholder={SHARE_DEFAULTS.shareTitle}
                  hint="Es. «Anch'io cammino per una giusta causa!»"
                />

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Testo del messaggio</label>
                  <textarea
                    rows={3}
                    value={shareBody}
                    onChange={e => setShareBody(e.target.value)}
                    placeholder={SHARE_DEFAULTS.shareBody}
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Descrizione della campagna che accompagna il post</p>
                </div>

                <Field
                  label="Tag social (Facebook / Instagram)"
                  value={shareSocialTag}
                  onChange={setShareSocialTag}
                  placeholder={SHARE_DEFAULTS.shareSocialTag}
                  hint="Es. «@1000kmdigratitudine» — viene inserito nel testo e taggato automaticamente"
                />

                <Field
                  label="Hashtag"
                  value={shareHashtags}
                  onChange={setShareHashtags}
                  placeholder={SHARE_DEFAULTS.shareHashtags}
                  hint="Separati da spazio. Es. «#1000kmdiGratitudine #Komen #AnchIoCammino»"
                />

                <Field
                  label="Link condivisione"
                  value={shareUrl}
                  onChange={setShareUrl}
                  placeholder={SHARE_DEFAULTS.shareUrl}
                  hint="URL della pagina a cui rimandare i post"
                />

                {/* Anteprima */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold text-foreground mb-2">Anteprima post</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {shareTitle || SHARE_DEFAULTS.shareTitle} 💗{"\n"}
                    🏃 3.2 km correndo in 25 min{"\n\n"}
                    Sto partecipando a {shareSocialTag || SHARE_DEFAULTS.shareSocialTag} — {shareBody || SHARE_DEFAULTS.shareBody}{"\n\n"}
                    Segui il cammino 👉 {shareSocialTag || SHARE_DEFAULTS.shareSocialTag}{"\n"}
                    Unisciti anche tu! 👉 {shareUrl || SHARE_DEFAULTS.shareUrl}{"\n\n"}
                    {shareHashtags || SHARE_DEFAULTS.shareHashtags}
                  </div>
                </div>

                <button
                  onClick={handleSaveShareSettings}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {shareSaved
                    ? <><CheckCircle className="w-4 h-4" /> Salvato!</>
                    : <><Share2 className="w-4 h-4" /> Salva testi condivisione</>
                  }
                </button>
              </div>
            )}

            {/* ── SEZIONE: Impostazioni social ───────────────────────────────── */}
            {activeSection === "settings" && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
                  ⚙️ Impostazioni social
                </h2>

                <div className="border-t border-border pt-4" />

                {/* Meta */}
                <p className="text-xs font-bold text-foreground">Meta (Facebook / Instagram)</p>
                <Field label="Facebook Page ID"  value={fbPageId}   onChange={setFbPageId}   placeholder="123456789012345" />
                <Field label="Page Access Token" value={fbToken}    onChange={setFbToken}    placeholder="EAABsb…" type="password" />
                <Field label="Instagram User ID" value={igUserId}   onChange={setIgUserId}   placeholder="17841400…" />
                <Field label="URL immagine fallback Instagram" value={igImageUrl} onChange={setIgImageUrl}
                  placeholder="https://tuosito.com/og-image.jpg"
                  hint="Usata quando non carichi una foto" />

                {/* Cloudinary */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold text-foreground mb-3">
                    Cloudinary — upload foto e video per IG/FB
                  </p>
                  <Field label="Cloud Name" value={cloudName} onChange={setCloudName} placeholder="il-tuo-cloud" />
                  <div className="mt-3">
                    <Field label="Upload Preset (unsigned)" value={cloudPreset} onChange={setCloudPreset}
                      placeholder="ml_default"
                      hint="Crea un preset unsigned su cloudinary.com → Settings → Upload → Upload Presets" />
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Come creare un account Cloudinary gratuito →
                    </summary>
                    <ol className="mt-2 text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Registrati gratis su <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="underline text-dona">cloudinary.com</a></li>
                      <li>Copia il <strong>Cloud Name</strong> dalla dashboard</li>
                      <li>Vai su <strong>Settings → Upload → Upload Presets → Add preset</strong></li>
                      <li>Imposta <strong>Signing Mode: Unsigned</strong> → salva</li>
                      <li>Copia il nome del preset e incollalo qui</li>
                    </ol>
                  </details>
                </div>

                {/* TikTok info */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <TikTokIcon active={false} /> TikTok
                  </p>
                  <p className="text-xs text-muted-foreground">
                    La pubblicazione su TikTok avviene tramite il foglio di condivisione nativo
                    iOS/Android — non richiede credenziali. Assicurati di avere l'app TikTok
                    installata sul telefono.
                  </p>
                </div>

                {/* Meta guide */}
                <div className="border-t border-border pt-4">
                  <details>
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Come ottenere le credenziali Meta →
                    </summary>
                    <ol className="mt-2 text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li><a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline text-dona">developers.facebook.com</a> → Crea app → tipo <strong>Business</strong> → collega <strong>1000kmdigratitudine</strong></li>
                      <li>Aggiungi: <strong>Facebook Login for Business</strong> + <strong>Instagram Graph API</strong></li>
                      <li><a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="underline text-dona">Graph API Explorer</a> → token con: <code className="bg-muted px-1 rounded text-[10px]">pages_manage_posts, instagram_content_publish, instagram_basic</code></li>
                      <li>Converti in long-lived token (60 gg) dal <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noreferrer" className="underline text-dona">Token Debugger</a></li>
                      <li><strong>Page ID</strong>: Pagina FB → Info → ID</li>
                      <li><strong>Instagram User ID</strong>: Explorer → <code className="bg-muted px-1 rounded text-[10px]">GET /{"{page-id}"}?fields=instagram_business_account</code></li>
                    </ol>
                  </details>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Salva impostazioni
                </button>
              </div>
            )}

            {/* ══ ANALISI SITO ══════════════════════════════════════════════ */}
            {activeSection === "analisi" && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Analisi Sito
                  </h2>
                  <select
                    value={analyticsRange}
                    onChange={e => setAnalyticsRange(e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"
                  >
                    <option value="24h">Ultime 24h</option>
                    <option value="7d">Ultimi 7 giorni</option>
                    <option value="30d">Ultimi 30 giorni</option>
                    <option value="90d">Ultimi 90 giorni</option>
                  </select>
                </div>

                {/* Visitatori LIVE */}
                {liveVisitors && (
                  <div className="border border-border rounded-xl p-4 bg-background">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                      </span>
                      <p className="text-xs font-bold text-foreground">
                        {liveVisitors.online} {liveVisitors.online === 1 ? "visitatore" : "visitatori"} online ora
                      </p>
                    </div>
                    {liveVisitors.sessions?.length > 0 && (
                      <div className="space-y-1.5">
                        {liveVisitors.sessions.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              {s.device === "mobile" ? <Smartphone className="w-3 h-3 text-muted-foreground flex-shrink-0" /> :
                               s.device === "tablet" ? <Tablet className="w-3 h-3 text-muted-foreground flex-shrink-0" /> :
                               <Monitor className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                              <span className="font-mono text-foreground truncate">{s.path}</span>
                              {(s.city || s.country) && (
                                <span className="text-muted-foreground">({s.city ? `${s.city}, ${s.country}` : s.country})</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(s.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {liveVisitors.activePages?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Pagine attive</p>
                        <div className="flex flex-wrap gap-1.5">
                          {liveVisitors.activePages.map((p: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-[11px] font-mono text-foreground">
                              {p.path} <span className="text-dona font-bold">{p.visitors}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {liveVisitors.online === 0 && (
                      <p className="text-xs text-muted-foreground">Nessun visitatore negli ultimi 5 minuti</p>
                    )}
                  </div>
                )}

                {analyticsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!analyticsLoading && analyticsData && (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{analyticsData.totalViews?.toLocaleString("it-IT") ?? 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Visite totali</p>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{analyticsData.uniqueVisitors?.toLocaleString("it-IT") ?? analyticsData.uniqueSessions?.toLocaleString("it-IT") ?? 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Visitatori unici</p>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{analyticsData.returningVisitors?.toLocaleString("it-IT") ?? 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Visitatori ricorrenti</p>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{analyticsData.bounceRate ?? 0}%</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Bounce rate</p>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{analyticsData.uniqueSessions?.toLocaleString("it-IT") ?? 0}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Sessioni</p>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {analyticsData.avgDuration ? `${Math.floor(analyticsData.avgDuration / 60)}:${String(analyticsData.avgDuration % 60).padStart(2, "0")}` : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">Tempo medio/pag</p>
                      </div>
                    </div>

                    {/* Conversioni */}
                    {analyticsData.conversions?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Conversioni</p>
                        <div className="space-y-2">
                          {analyticsData.conversions.map((c: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                              <span className="text-foreground">
                                <span className="inline-flex items-center gap-1">
                                  {c.event_type === "donazione" ? "💰" : c.event_type === "iscrizione" ? "📝" : c.event_type === "registrazione" ? "👤" : "🔑"}
                                  {" "}{c.event_type}
                                </span>
                                {c.event_data && <span className="text-muted-foreground ml-1.5 font-mono">{c.event_data}</span>}
                              </span>
                              <span className="text-dona font-bold">{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily chart (simple bar chart) */}
                    {analyticsData.dailyViews?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Visite giornaliere</p>
                        <div className="flex items-end gap-1 h-32">
                          {(() => {
                            const maxV = Math.max(...analyticsData.dailyViews.map((d: any) => d.views), 1);
                            return analyticsData.dailyViews.map((d: any, i: number) => (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                <span className="text-[9px] text-muted-foreground">{d.views}</span>
                                <div
                                  className="w-full bg-dona/80 rounded-t min-h-[2px]"
                                  style={{ height: `${(d.views / maxV) * 100}%` }}
                                  title={`${d.day}: ${d.views} visite`}
                                />
                                <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                                  {new Date(d.day).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Top pagine */}
                    {analyticsData.topPages?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Pagine più visitate</p>
                        <div className="space-y-2">
                          {analyticsData.topPages.map((p: any, i: number) => {
                            const maxV = analyticsData.topPages[0].views;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-foreground font-mono truncate mr-2">{p.path}</span>
                                  <span className="text-muted-foreground whitespace-nowrap">{p.views}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-dona/70 rounded-full" style={{ width: `${(p.views / maxV) * 100}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Device breakdown */}
                    {analyticsData.deviceBreakdown?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Dispositivi</p>
                        <div className="grid grid-cols-3 gap-3">
                          {analyticsData.deviceBreakdown.map((d: any) => (
                            <div key={d.device} className="text-center">
                              <div className="flex justify-center mb-1">
                                {d.device === "mobile" ? <Smartphone className="w-5 h-5 text-dona" /> :
                                 d.device === "tablet" ? <Tablet className="w-5 h-5 text-dona" /> :
                                 d.device === "desktop" ? <Monitor className="w-5 h-5 text-dona" /> :
                                 <Globe className="w-5 h-5 text-muted-foreground" />}
                              </div>
                              <p className="text-lg font-bold text-foreground">{d.count}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{d.device}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top referrer */}
                    {analyticsData.topReferrers?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Provenienza (Referrer)</p>
                        <div className="space-y-1.5">
                          {analyticsData.topReferrers.map((r: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-foreground truncate mr-2">{r.referrer}</span>
                              <span className="text-muted-foreground">{r.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top paesi */}
                    {analyticsData.topCountries?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Paesi</p>
                        <div className="flex flex-wrap gap-2">
                          {analyticsData.topCountries.map((c: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full text-xs font-medium text-foreground">
                              {c.country ?? "?"} <span className="text-muted-foreground">{c.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top città */}
                    {analyticsData.topCities?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Top Città</p>
                        <div className="space-y-2">
                          {analyticsData.topCities.map((c: any, i: number) => {
                            const maxV = analyticsData.topCities[0].count;
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-foreground">
                                    {c.city}{c.country ? ` (${c.country})` : ""}
                                  </span>
                                  <span className="text-muted-foreground">{c.count}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-dona/70 rounded-full" style={{ width: `${(c.count / maxV) * 100}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Click recenti */}
                    {analyticsData.recentClicks?.length > 0 && (
                      <div className="border border-border rounded-xl p-4 bg-background">
                        <p className="text-xs font-bold text-foreground mb-3">Click recenti</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {analyticsData.recentClicks.map((c: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-foreground truncate mr-2">
                                <span className="font-mono text-muted-foreground">{c.path}</span>{" "}
                                → {c.event_data}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap text-[10px]">
                                {new Date(c.created_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Percorsi utente (journeys) */}
                    <div className="border border-border rounded-xl p-4 bg-background">
                      <button
                        onClick={() => setJourneysOpen(o => !o)}
                        className="w-full flex justify-between items-center text-xs font-bold text-foreground"
                      >
                        <span>Percorsi utente (ultimi 7gg)</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${journeysOpen ? "rotate-180" : ""}`} />
                      </button>
                      {journeysOpen && (
                        <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
                          {journeys.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">Nessun percorso registrato.</p>
                          )}
                          {journeys.map((s: any, i: number) => (
                            <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  {s.device === "mobile" ? <Smartphone className="w-3 h-3" /> :
                                   s.device === "tablet" ? <Tablet className="w-3 h-3" /> :
                                   <Monitor className="w-3 h-3" />}
                                  {s.city && <span>{s.city}{s.country ? ` (${s.country})` : ""}</span>}
                                </span>
                                <span>{new Date(s.started_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 items-center">
                                {(s.events as any[])
                                  .filter((e: any) => e.event_type === "pageview")
                                  .map((e: any, j: number, arr: any[]) => (
                                    <span key={j} className="flex items-center gap-1">
                                      <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{e.path}</span>
                                      {j < arr.length - 1 && <span className="text-[10px] text-muted-foreground">→</span>}
                                    </span>
                                  ))}
                              </div>
                              {(s.events as any[]).some((e: any) => ["donazione", "iscrizione", "registrazione"].includes(e.event_type)) && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {(s.events as any[])
                                    .filter((e: any) => ["donazione", "iscrizione", "registrazione"].includes(e.event_type))
                                    .map((e: any, j: number) => (
                                      <span key={j} className="text-[10px] bg-dona/10 text-dona px-2 py-0.5 rounded-full font-medium">
                                        {e.event_type === "donazione" ? "💰" : e.event_type === "iscrizione" ? "📝" : "👤"}
                                        {" "}{e.event_type}{e.event_data ? ` (${e.event_data})` : ""}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Empty state */}
                    {analyticsData.totalViews === 0 && (
                      <div className="text-center py-8">
                        <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nessuna visita registrata nel periodo selezionato.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Il tracking è attivo — i dati appariranno quando gli utenti visiteranno il sito.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!analyticsLoading && !analyticsData && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Errore nel caricamento dei dati analytics.
                  </p>
                )}
              </div>
            )}

            {/* ══ CREA PERCORSO ═════════════════════════════════════════════ */}
            {activeSection === "percorso" && (
              <Suspense fallback={
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              }>
                <PercorsoBuilder />
              </Suspense>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card video YouTube (ID + titolo + descrizione) ──────────────────────────
function YtVideoField({
  num, ytId, onYtId, title, onTitle, desc, onDesc, defaultTitle, defaultDesc,
}: {
  num: number;
  ytId: string;    onYtId: (v: string) => void;
  title: string;   onTitle: (v: string) => void;
  desc: string;    onDesc: (v: string) => void;
  defaultTitle: string;
  defaultDesc: string;
}) {
  const idValid = ytId.trim().length > 0 && !ytId.startsWith("YOUTUBE_ID");
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-background">
      <p className="text-xs font-bold text-foreground">Video {num}</p>

      {/* Titolo */}
      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Titolo</label>
        <input
          type="text"
          value={title}
          onChange={e => onTitle(e.target.value)}
          placeholder={defaultTitle}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-card text-foreground"
        />
      </div>

      {/* Descrizione */}
      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Descrizione</label>
        <textarea
          rows={3}
          value={desc}
          onChange={e => onDesc(e.target.value)}
          placeholder={defaultDesc}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-dona/40 bg-card text-foreground"
        />
      </div>

      {/* ID YouTube */}
      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">ID YouTube</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ytId}
            onChange={e => onYtId(e.target.value.trim())}
            placeholder="es. dQw4w9WgXcQ"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-dona/40 bg-card text-foreground"
          />
          {idValid && (
            <a
              href={`https://www.youtube.com/watch?v=${ytId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center px-3 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Apri su YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        {idValid
          ? <p className="text-[10px] text-green-600 mt-1">✓ ID impostato</p>
          : <p className="text-[10px] text-muted-foreground mt-1">Parte finale dell'URL YouTube dopo <code className="bg-muted px-0.5 rounded">?v=</code></p>
        }
      </div>
    </div>
  );
}

// ─── TikTok SVG icon ──────────────────────────────────────────────────────────
function TikTokIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={active ? "white" : "currentColor"} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.78 1.52V6.75a4.84 4.84 0 0 1-1.01-.06Z" />
    </svg>
  );
}

// ─── Campo input helper ───────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = "text", hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
