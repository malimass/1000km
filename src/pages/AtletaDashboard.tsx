/**
 * AtletaDashboard.tsx — Dashboard personale dell'atleta
 * Route: /atleta
 *
 * Funzionalità:
 *  - Profilo fisico (età, peso, altezza…) con scelta del coach
 *  - Upload file FIT/TCX
 *  - Visualizzazione delle proprie sessioni
 *  - KPI personali (readiness, rischio infortuni)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Upload, LogOut, User, Heart, Mountain, Timer, BookOpen,
  Footprints, TrendingUp, Flame, Zap, ChevronDown, ChevronUp, Trash2, ShieldAlert, Target,
} from "lucide-react";
import { parseActivityFile, TrainingSession } from "@/lib/trainingParser";
import {
  analyzeSession, calculateFitnessMetrics, buildWeeklyStats,
  calculateReadiness, calculateInjuryRisk, evaluateSession,
  saveSessions, deleteSession, maxHRFromAge, defaultMaxHR,
  CoachProfile, SessionAnalysis, WeeklyStats,
} from "@/lib/coachAnalysis";
import {
  getCurrentUser, signOutUser, listCoaches, saveAthleteProfile,
  loadAthleteProfile, AuthUser, AthleteProfile,
} from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import ProiezionePercorso from "@/components/ProiezionePercorso";

// ─── helpers ─────────────────────────────────────────────────
function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
function sportIcon(s: string) {
  if (s.includes("run")) return "🏃";
  if (s.includes("cycl") || s.includes("bike")) return "🚴";
  if (s.includes("hik") || s.includes("trail")) return "🥾";
  return "🚶";
}
const ZONE_COLORS = ["#6ee7b7", "#34d399", "#f59e0b", "#f97316", "#ef4444"];

// ─── Caricamento sessioni dell'atleta via API ────────────────
async function loadAthleteSessions(athleteId: string): Promise<Omit<TrainingSession, "trackPoints">[]> {
  try {
    const res = await apiFetch(`/api/coach-sessions?user_id=${athleteId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map((r) => ({
      id: r.id,
      fileName: r.file_name,
      sport: r.sport,
      startTime: new Date(r.start_time),
      durationSec: Number(r.duration_sec),
      distanceM: Number(r.distance_m),
      avgSpeedKmh: Number(r.avg_speed_kmh),
      maxSpeedKmh: Number(r.max_speed_kmh),
      avgHeartRate: r.avg_heart_rate ? Number(r.avg_heart_rate) : null,
      maxHeartRate: r.max_heart_rate ? Number(r.max_heart_rate) : null,
      totalElevationGainM: Number(r.total_elevation_gain_m),
      totalElevationLossM: Number(r.total_elevation_loss_m),
      calories: r.calories ? Number(r.calories) : null,
      trimp: r.trimp ? Number(r.trimp) : null,
      tss: r.tss ? Number(r.tss) : null,
      hrZonesSec: r.hr_zones_sec ?? undefined,
      trackPoints: [],
    }));
  } catch {
    return [];
  }
}

const OBIETTIVI: Record<string, string> = {
  pellegrinaggio: "Completare il pellegrinaggio 1000km",
  maratona: "Preparare una maratona",
  mezza: "Preparare una mezza maratona",
  trail: "Preparare un trail/ultra",
  forma: "Migliorare la forma fisica",
  peso: "Perdere peso camminando/correndo",
  benessere: "Benessere e salute generale",
};

function generateGoalAdvice(
  obiettivo: string,
  sessions: TrainingSession[],
  fitness: { ctl: number; atl: number; tsb: number },
  weekly: WeeklyStats[],
  readiness: { score: number },
): { icon: string; title: string; detail: string; priority: "alta" | "media" | "bassa" }[] {
  const advice: { icon: string; title: string; detail: string; priority: "alta" | "media" | "bassa" }[] = [];
  const totalKm = sessions.reduce((s, x) => s + x.distanceM / 1000, 0);
  const totalSessions = sessions.length;
  const lastWeek = weekly.length > 0 ? weekly[weekly.length - 1] : null;
  const weeklyKm = lastWeek?.totalKm ?? 0;

  // Generic advice based on data
  if (totalSessions === 0) {
    advice.push({ icon: "📤", title: "Carica il tuo primo allenamento", detail: "Importa un file .fit o .tcx per ricevere consigli personalizzati sul tuo obiettivo.", priority: "alta" });
    return advice;
  }

  // Goal-specific advice
  if (obiettivo === "pellegrinaggio") {
    const target = 1000;
    const pct = Math.min(100, Math.round((totalKm / target) * 100));
    advice.push({ icon: "🗺️", title: `Progresso: ${totalKm.toFixed(0)} / ${target} km (${pct}%)`, detail: pct < 30 ? "Sei all'inizio del percorso. Aumenta gradualmente il volume settimanale." : pct < 70 ? "Buon lavoro! Mantieni la costanza e inserisci uscite lunghe." : "Sei nella fase finale! Focus sulla resistenza e il recupero.", priority: pct < 30 ? "alta" : "media" });
    if (weeklyKm < 40) advice.push({ icon: "📏", title: "Aumenta il chilometraggio settimanale", detail: `Questa settimana: ${weeklyKm.toFixed(1)} km. Per il pellegrinaggio servono almeno 40-50 km/settimana.`, priority: "alta" });
    if (fitness.tsb < -15) advice.push({ icon: "😴", title: "Recupera prima di continuare", detail: "Il tuo stato di forma indica stanchezza accumulata. Inserisci 2-3 giorni leggeri.", priority: "alta" });
  } else if (obiettivo === "maratona") {
    if (weeklyKm < 50) advice.push({ icon: "📏", title: "Volume settimanale insufficiente", detail: `${weeklyKm.toFixed(1)} km/sett. Per la maratona servono 50-70 km/sett in fase di carico.`, priority: "alta" });
    advice.push({ icon: "💪", title: "Inserisci un lungo settimanale", detail: "Almeno un'uscita da 28-35 km ogni 2 settimane per abituare il corpo alla distanza.", priority: "media" });
    if (fitness.ctl < 40) advice.push({ icon: "📈", title: "Costruisci la base aerobica", detail: "Il tuo CTL è basso. Punta a 8-10 settimane di volume progressivo in Z2.", priority: "alta" });
  } else if (obiettivo === "mezza") {
    if (weeklyKm < 30) advice.push({ icon: "📏", title: "Aumenta il volume", detail: `${weeklyKm.toFixed(1)} km/sett. Per la mezza maratona servono 30-50 km/sett.`, priority: "alta" });
    advice.push({ icon: "⚡", title: "Lavoro in soglia", detail: "Inserisci 1 seduta settimanale con tratti a ritmo gara (Z3-Z4) per migliorare la resistenza specifica.", priority: "media" });
  } else if (obiettivo === "trail") {
    const totalElev = sessions.reduce((s, x) => s + (x.totalElevationGainM || 0), 0);
    advice.push({ icon: "⛰️", title: `Dislivello totale: ${Math.round(totalElev)} D+`, detail: totalElev < 5000 ? "Cerca percorsi con più dislivello per prepararti al trail." : "Buon lavoro sul dislivello! Continua a variare i terreni.", priority: totalElev < 5000 ? "alta" : "bassa" });
    advice.push({ icon: "🦵", title: "Allena la discesa", detail: "Le discese tecniche sono il punto debole di molti trail runner. Pratica discese ripide per rinforzare i quadricipiti.", priority: "media" });
  } else if (obiettivo === "forma") {
    if (totalSessions < 3) advice.push({ icon: "📅", title: "Costanza è la chiave", detail: "Punta a 3-4 allenamenti settimanali. Anche brevi, ma regolari.", priority: "alta" });
    if (fitness.ctl > 20) advice.push({ icon: "🎉", title: "Ottimo progresso!", detail: "La tua forma sta migliorando. Varia gli allenamenti con diversi tipi di attività.", priority: "bassa" });
    advice.push({ icon: "🔄", title: "Varia l'intensità", detail: "Alterna giorni facili (Z1-Z2) a giorni più intensi (Z3-Z4) per stimolare l'adattamento.", priority: "media" });
  } else if (obiettivo === "peso") {
    const totalCal = sessions.reduce((s, x) => s + (x.calories ?? 0), 0);
    advice.push({ icon: "🔥", title: `Calorie bruciate: ${Math.round(totalCal)} kcal`, detail: "Mantieni sessioni lunghe a bassa intensità (Z1-Z2) per massimizzare il consumo di grassi.", priority: "media" });
    if (weeklyKm < 20) advice.push({ icon: "🚶", title: "Cammina di più", detail: "Anche camminare a passo sostenuto brucia calorie. Punta a 20+ km/settimana.", priority: "alta" });
  } else if (obiettivo === "benessere") {
    advice.push({ icon: "🧘", title: "Ascolta il tuo corpo", detail: "Non forzare mai. 3-4 uscite settimanali a ritmo confortevole sono l'ideale.", priority: "bassa" });
    if (fitness.tsb < -10) advice.push({ icon: "⚠️", title: "Stai esagerando", detail: "I tuoi dati mostrano troppa fatica accumulata. Riduci intensità e volume per qualche giorno.", priority: "alta" });
  }

  // Universal advice
  if (fitness.tsb > 10 && totalSessions > 3) {
    advice.push({ icon: "✅", title: "Sei fresco e pronto", detail: "Buon momento per un allenamento impegnativo o una gara di test.", priority: "bassa" });
  }
  if (fitness.atl > fitness.ctl * 1.3 && totalSessions > 5) {
    advice.push({ icon: "⚠️", title: "Carico acuto elevato", detail: "La fatica recente supera di molto la tua base. Rischio infortuni. Riduci il volume.", priority: "alta" });
  }

  return advice;
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────

export default function AtletaDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile>({});
  const [coaches, setCoaches] = useState<{ id: string; displayName: string }[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auth check
  useEffect(() => {
    getCurrentUser().then(u => {
      if (!u || u.role !== "athlete") { navigate("/accedi", { replace: true }); return; }
      setUser(u);
      loadAthleteProfile(u.id).then(p => { if (p) setAthleteProfile(p); });
      loadAthleteSessions(u.id).then(s => setSessions(s as TrainingSession[]));
      listCoaches().then(setCoaches);
    });
  }, [navigate]);

  const maxHR = athleteProfile.maxHR ?? (athleteProfile.age ? maxHRFromAge(athleteProfile.age) : defaultMaxHR(35));

  // Analisi
  const weekly: WeeklyStats[] = buildWeeklyStats(sessions, maxHR);
  const fitness = calculateFitnessMetrics(sessions, maxHR);
  const readiness = calculateReadiness(sessions, weekly);
  const coachProfile: CoachProfile | null = athleteProfile.age ? {
    age: athleteProfile.age!,
    weightKg: athleteProfile.weightKg!,
    heightCm: athleteProfile.heightCm!,
    gender: athleteProfile.gender ?? "M",
    restHR: athleteProfile.restHR ?? 60,
    experienceYears: athleteProfile.experienceYears ?? 1,
  } : null;
  const injuryRisk = calculateInjuryRisk(sessions, weekly, fitness, coachProfile);

  // Upload
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    setUploadError(null);
    const errors: string[] = [];
    const toAdd: TrainingSession[] = [];

    for (const file of Array.from(files)) {
      try {
        const session = await parseActivityFile(file);
        const analysis = analyzeSession(session, maxHR);
        session.trimp = analysis.trimp;
        session.tss = analysis.tss;
        toAdd.push(session);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    if (errors.length) setUploadError(errors.join(" | "));

    setSessions(prev => {
      const existing = new Set(prev.map(s => s.id));
      const merged = [...prev, ...toAdd.filter(s => !existing.has(s.id))]
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      // Salva via API
      for (const s of toAdd) {
        apiFetch("/api/coach-sessions", {
          method: "POST",
          body: JSON.stringify({
            id: s.id,
            file_name: s.fileName,
            sport: s.sport,
            start_time: s.startTime.toISOString(),
            duration_sec: s.durationSec,
            distance_m: s.distanceM,
            avg_speed_kmh: s.avgSpeedKmh,
            max_speed_kmh: s.maxSpeedKmh,
            avg_heart_rate: s.avgHeartRate,
            max_heart_rate: s.maxHeartRate,
            total_elevation_gain_m: s.totalElevationGainM,
            total_elevation_loss_m: s.totalElevationLossM,
            calories: s.calories,
            trimp: s.trimp,
            tss: s.tss,
            hr_zones_sec: s.hrZonesSec ? Array.from(s.hrZonesSec) : null,
          }),
        }).catch(() => {});
      }
      return merged;
    });
    setUploading(false);
  }, [user, maxHR]);

  const handleDelete = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    apiFetch(`/api/coach-sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await saveAthleteProfile(user.id, athleteProfile);
    setSavingProfile(false);
    setShowProfile(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    navigate("/accedi", { replace: true });
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Caricamento…</p></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-primary shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-green-400" />
            <span className="font-heading font-bold text-primary-foreground text-lg">Il mio allenamento</span>
            <span className="text-primary-foreground/50 text-xs ml-1">{user.displayName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowProfile(v => !v)}
              className="flex items-center gap-1.5 text-xs text-primary-foreground/70 hover:text-primary-foreground px-2 py-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors">
              <User className="w-4 h-4" />
              Profilo
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-primary-foreground/70 hover:text-primary-foreground px-2 py-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors">
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>
        </div>

        {/* Profilo panel */}
        {showProfile && (
          <div className="border-t border-primary-foreground/10 bg-primary/90 px-4 py-4">
            <div className="max-w-5xl mx-auto">
              <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-wide mb-3">Dati fisici</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                {[
                  { label: "Età", key: "age", type: "number", min: 16, max: 80 },
                  { label: "Peso (kg)", key: "weightKg", type: "number", min: 40, max: 150 },
                  { label: "Altezza (cm)", key: "heightCm", type: "number", min: 140, max: 220 },
                  { label: "FC riposo", key: "restHR", type: "number", min: 35, max: 90 },
                  { label: "FC max", key: "maxHR", type: "number", min: 140, max: 220 },
                  { label: "Anni allenamento", key: "experienceYears", type: "number", min: 0, max: 50 },
                ].map(f => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-[10px] text-primary-foreground/60">{f.label}</span>
                    <input
                      type={f.type} min={f.min} max={f.max}
                      value={(athleteProfile as any)[f.key] ?? ""}
                      onChange={e => setAthleteProfile(p => ({ ...p, [f.key]: parseFloat(e.target.value) || undefined }))}
                      className="px-2 py-1.5 text-xs bg-primary-foreground/10 border border-primary-foreground/20 rounded text-primary-foreground focus:outline-none focus:ring-1 focus:ring-green-400"
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-primary-foreground/60">Sesso</span>
                  <select value={athleteProfile.gender ?? "M"}
                    onChange={e => setAthleteProfile(p => ({ ...p, gender: e.target.value as "M" | "F" }))}
                    className="px-2 py-1.5 text-xs bg-primary-foreground/10 border border-primary-foreground/20 rounded text-primary-foreground focus:outline-none">
                    <option value="M">Uomo</option>
                    <option value="F">Donna</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 min-w-[140px]">
                  <span className="text-[10px] text-primary-foreground/60">Coach assegnato</span>
                  <select value={athleteProfile.coachId ?? ""}
                    onChange={e => setAthleteProfile(p => ({ ...p, coachId: e.target.value || undefined }))}
                    className="px-2 py-1.5 text-xs bg-primary-foreground/10 border border-primary-foreground/20 rounded text-primary-foreground focus:outline-none">
                    <option value="">— Nessun coach —</option>
                    {coaches.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 flex-1 min-w-[160px]">
                  <span className="text-[10px] text-primary-foreground/60">Il mio obiettivo</span>
                  <select value={athleteProfile.obiettivo ?? ""}
                    onChange={e => setAthleteProfile(p => ({ ...p, obiettivo: e.target.value || undefined }))}
                    className="px-2 py-1.5 text-xs bg-primary-foreground/10 border border-primary-foreground/20 rounded text-primary-foreground focus:outline-none">
                    <option value="">— Scegli obiettivo —</option>
                    {Object.entries(OBIETTIVI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="mt-4 px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50">
                  {savingProfile ? "Salvataggio…" : "Salva"}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* KPI SUMMARY */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Idoneità", value: `${readiness.score}%`, sub: readiness.label, color: readiness.color },
            { label: "Forma CTL", value: String(fitness.ctl), sub: fitness.ctl > 30 ? "Buona base" : "In costruzione", color: "#22c55e" },
            { label: "Fatica ATL", value: String(fitness.atl), sub: fitness.atl > fitness.ctl ? "Alta" : "OK", color: "#f97316" },
            { label: "Rischio infortuni", value: injuryRisk.level, sub: `${injuryRisk.score}/100`, color: injuryRisk.color },
          ].map(k => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: k.color }} />
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{k.label}</p>
              <p className="text-2xl font-bold font-heading mt-1 leading-none" style={{ color: k.color }}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{k.sub}</p>
            </div>
          ))}
        </section>

        {/* CONSIGLI PERSONALIZZATI */}
        {athleteProfile.obiettivo && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-dona" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Consigli per: {OBIETTIVI[athleteProfile.obiettivo] ?? athleteProfile.obiettivo}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {generateGoalAdvice(athleteProfile.obiettivo, sessions, fitness, weekly, readiness).map((a, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-3 flex gap-3">
                  <span className="text-xl flex-shrink-0">{a.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold leading-tight">{a.title}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        a.priority === "alta" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : a.priority === "media" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}>{a.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Suggerimento per scegliere obiettivo */}
        {!athleteProfile.obiettivo && sessions.length > 0 && (
          <div className="bg-dona/5 border border-dona/20 rounded-xl p-4 text-center">
            <Target className="w-6 h-6 text-dona mx-auto mb-2" />
            <p className="text-sm font-semibold">Scegli il tuo obiettivo</p>
            <p className="text-xs text-muted-foreground mt-1">Apri il <strong>Profilo</strong> e seleziona un obiettivo per ricevere consigli personalizzati.</p>
          </div>
        )}

        {/* UPLOAD */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Carica Allenamento</h2>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <input ref={fileRef} type="file" accept=".fit,.tcx" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
            <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
            {uploading
              ? <p className="text-sm text-green-600 font-semibold animate-pulse">Analisi in corso…</p>
              : <>
                  <p className="text-sm font-semibold">Trascina .fit o .tcx qui</p>
                  <p className="text-xs text-muted-foreground mt-1">Garmin, Polar, Wahoo, Strava export</p>
                </>}
          </div>
          {uploadError && (
            <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">⚠️ {uploadError}</p>
          )}
        </section>

        {/* SESSIONI */}
        {sessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Le mie sessioni ({sessions.length})
              </h2>
              <Link to="/guida-metriche" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <BookOpen className="w-3.5 h-3.5" /> Guida metriche
              </Link>
            </div>
            <div className="space-y-2">
              {sessions.map(s => {
                const analysis = analyzeSession(s, maxHR);
                const ev = evaluateSession(analysis, coachProfile, maxHR);
                const isExpanded = expandedId === s.id;
                return (
                  <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">{sportIcon(s.sport)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold capitalize">{s.sport}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(s.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-sm font-bold">{(s.distanceM / 1000).toFixed(1)} km</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />{fmtDuration(s.durationSec)}</span>
                          {s.avgHeartRate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{s.avgHeartRate} bpm</span>}
                          {s.totalElevationGainM > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mountain className="w-3 h-3" />+{Math.round(s.totalElevationGainM)}m</span>}
                          <span className="text-xs text-yellow-400">{"★".repeat(ev.stars)}{"☆".repeat(5 - ev.stars)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                        {/* Stelle + insights */}
                        <div className="flex items-start gap-3 flex-wrap">
                          <div className="text-center flex-shrink-0">
                            <div className="text-2xl text-yellow-400">{"★".repeat(ev.stars)}{"☆".repeat(5 - ev.stars)}</div>
                            <p className="text-[11px] font-bold" style={{ color: ev.stars >= 4 ? "#22c55e" : ev.stars >= 3 ? "#f59e0b" : "#ef4444" }}>{ev.label}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 flex-1">
                            {ev.insights.map((ins, i) => (
                              <span key={i} className="text-[11px] text-muted-foreground bg-background border border-border rounded-lg px-2 py-1">💬 {ins}</span>
                            ))}
                          </div>
                        </div>
                        {/* Metriche */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {[
                            { l: "Velocità", v: `${s.avgSpeedKmh.toFixed(1)} km/h`, t: "Velocità media mantenuta durante la sessione" },
                            { l: "FC media/max", v: s.avgHeartRate ? `${s.avgHeartRate}/${s.maxHeartRate ?? "—"} bpm` : "—", t: "Frequenza cardiaca media e massima registrata" },
                            { l: "Calorie", v: s.calories ? `${s.calories} kcal` : "—", t: "Stima delle calorie bruciate durante la sessione" },
                            { l: "TRIMP", v: String(analysis.trimp), t: "Training Impulse: misura il carico di allenamento combinando durata e intensità cardiaca. Valori più alti = sessione più impegnativa" },
                          ].map(m => (
                            <div key={m.l} className="bg-background rounded px-2 py-1.5 border border-border cursor-help" title={m.t}>
                              <span className="text-muted-foreground block text-[10px]">{m.l}</span>
                              <strong>{m.v}</strong>
                            </div>
                          ))}
                        </div>
                        {/* Zone bar */}
                        {analysis.zoneDist && analysis.zoneDist.totalSec > 0 && (
                          <div className="flex h-5 rounded overflow-hidden gap-0.5">
                            {[analysis.zoneDist.z1Sec, analysis.zoneDist.z2Sec, analysis.zoneDist.z3Sec, analysis.zoneDist.z4Sec, analysis.zoneDist.z5Sec].map((v, i) => {
                              const pct = (v / analysis.zoneDist!.totalSec) * 100;
                              return pct > 0.5 ? (
                                <div key={i} className="flex items-center justify-center text-[10px] font-bold text-white"
                                  title={`Z${i+1}: ${Math.round(pct)}%`}
                                  style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }}>
                                  {pct > 12 ? `Z${i+1}` : ""}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PROIEZIONE PERCORSO */}
        {sessions.length > 0 && (
          <ProiezionePercorso
            sessions={sessions}
            weightKg={athleteProfile.weightKg}
          />
        )}

        {sessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Footprints className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold">Nessun allenamento caricato</p>
            <p className="text-sm mt-1">Carica un file .fit o .tcx per iniziare</p>
          </div>
        )}
      </main>
    </div>
  );
}
