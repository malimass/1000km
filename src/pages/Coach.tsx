/**
 * Coach.tsx — Dashboard analisi allenamenti per il pellegrinaggio 1000km
 *
 * Sezioni:
 *  1. Upload FIT/TCX
 *  2. Lista sessioni con metriche
 *  3. Grafico Forma/Fatica/Forma (CTL/ATL/TSB)
 *  4. Volume settimanale
 *  5. Distribuzione zone HR
 *  6. Profilo andatura ultima sessione
 *  7. Raccomandazioni coach
 *  8. Readiness score pellegrinaggio
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Upload, Trash2, LogOut, Activity, TrendingUp, Heart,
  Mountain, Timer, Flame, Footprints, ChevronDown, ChevronUp, RefreshCw,
  Zap, User, ShieldAlert, Star, X, Users,
} from "lucide-react";
import { parseActivityFile, TrainingSession } from "@/lib/trainingParser";
import {
  analyzeSession, generateRecommendations, calculateFitnessMetrics,
  buildFitnessHistory, buildWeeklyStats, calculateReadiness, buildPaceProfile,
  calculateHRZones, saveSessions, loadSessionsLocal, loadSessionsAsync, deleteSession,
  defaultMaxHR, maxHRFromAge, calcBMI,
  loadProfile, saveProfile, calculateInjuryRisk, evaluateSession,
  SessionAnalysis, WeeklyStats, CoachProfile,
} from "@/lib/coachAnalysis";
import { getCurrentUser, loadCoachAthletes, CoachAthlete, saveAthleteProfile, loadAthleteProfile } from "@/lib/auth";
import { supabase, isSupabaseConfigured, clearAuthToken } from "@/lib/supabase";

// ─── COSTANTI COLORI ─────────────────────────────────────────────────────────

const ZONE_COLORS = ["#6ee7b7", "#34d399", "#f59e0b", "#f97316", "#ef4444"];
const ZONE_LABELS = ["Z1 Recupero", "Z2 Aerobico", "Z3 Capacità", "Z4 Soglia", "Z5 VO2max"];

// ─── HELPERS FORMATAZIONE ────────────────────────────────────────────────────

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtPace(minKm: number): string {
  if (!minKm || minKm <= 0 || minKm > 60) return "—";
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")} min/km`;
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function sportIcon(sport: string): string {
  if (sport.includes("run")) return "🏃";
  if (sport.includes("cycl") || sport.includes("bike")) return "🚴";
  if (sport.includes("hik") || sport.includes("trail")) return "🥾";
  return "🚶";
}

// ─── COMPONENTE PRINCIPALE ───────────────────────────────────────────────────

// ─── PROFILE MODAL ───────────────────────────────────────────────────────────

function ProfileModal({ initial, onSave }: { initial: CoachProfile | null; onSave: (p: CoachProfile) => void }) {
  const empty: CoachProfile = { age: 35, weightKg: 70, heightCm: 170, gender: "M", restHR: 60, experienceYears: 2 };
  const [form, setForm] = useState<CoachProfile>(initial ?? empty);
  const set = (k: keyof CoachProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: k === "gender" ? e.target.value : (parseFloat(e.target.value) || 0) }));
  const bmi = form.heightCm > 0 ? (form.weightKg / Math.pow(form.heightCm / 100, 2)).toFixed(1) : "—";
  const suggestedMaxHR = maxHRFromAge(form.age);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold font-heading">Profilo Atleta</h2>
          <span className="text-xs text-muted-foreground ml-1">— per un'analisi personalizzata</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Età (anni)", key: "age", min: 16, max: 80, step: 1 },
            { label: "Peso (kg)", key: "weightKg", min: 40, max: 150, step: 0.5 },
            { label: "Altezza (cm)", key: "heightCm", min: 140, max: 220, step: 1 },
            { label: "FC riposo (bpm)", key: "restHR", min: 35, max: 90, step: 1 },
            { label: "Anni di allenamento", key: "experienceYears", min: 0, max: 50, step: 0.5 },
          ].map(f => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">{f.label}</span>
              <input
                type="number" min={f.min} max={f.max} step={f.step}
                value={form[f.key as keyof CoachProfile]}
                onChange={set(f.key as keyof CoachProfile)}
                className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Sesso</span>
            <select value={form.gender} onChange={set("gender")}
              className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="M">Uomo</option>
              <option value="F">Donna</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span>BMI: <strong>{bmi}</strong></span>
          <span>FC max suggerita (Tanaka): <strong>{suggestedMaxHR} bpm</strong></span>
        </div>

        <button
          onClick={() => onSave(form)}
          className="mt-5 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Salva profilo
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE ───────────────────────────────────────────────────

export default function Coach() {
  const navigate = useNavigate();

  // Profilo atleta
  const [profile, setProfile] = useState<CoachProfile | null>(() => loadProfile());
  const [showProfileModal, setShowProfileModal] = useState(() => !loadProfile());

  const handleSaveProfile = (p: CoachProfile) => {
    saveProfile(p); // localStorage
    setProfile(p);
    setShowProfileModal(false);
    const hr = maxHRFromAge(p.age);
    setMaxHR(hr);
    localStorage.setItem("gp_coach_maxhr", String(hr));
    // Salva su Supabase se autenticato (sincronizza tra browser)
    if (coachUserId) saveAthleteProfile(coachUserId, p);
  };

  // FC max (auto-calcolata da età, o manuale)
  const [maxHR, setMaxHR] = useState<number>(() => {
    const stored = localStorage.getItem("gp_coach_maxhr");
    if (stored) return parseInt(stored);
    const p = loadProfile();
    return p ? maxHRFromAge(p.age) : defaultMaxHR(35);
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "atleti">("dashboard");
  const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);

  // Carica atleti e profilo da Supabase se coach autenticato
  useEffect(() => {
    getCurrentUser().then(async u => {
      if (u?.role === "coach") {
        setCoachUserId(u.id);
        loadCoachAthletes(u.id).then(setAthletes);
        // Carica profilo da Supabase (sincronizza tra browser)
        const remote = await loadAthleteProfile(u.id);
        if (remote && (remote.age || remote.weightKg)) {
          const p: CoachProfile = {
            age: remote.age ?? 35,
            weightKg: remote.weightKg ?? 70,
            heightCm: remote.heightCm ?? 170,
            gender: (remote.gender as "M" | "F") ?? "M",
            restHR: remote.restHR ?? 60,
            experienceYears: remote.experienceYears ?? 2,
          };
          saveProfile(p); // aggiorna localStorage locale
          setProfile(p);
          setShowProfileModal(false);
          setMaxHR(maxHRFromAge(p.age));
        }
      }
    });
  }, []);

  // Sessioni (metadati persistiti su Supabase + localStorage; trackPoints solo in memoria)
  const [sessions, setSessions] = useState<TrainingSession[]>(() =>
    loadSessionsLocal().map(s => ({ ...s, trackPoints: [] })) as TrainingSession[]
  );

  // Carica da Supabase al mount
  useEffect(() => {
    loadSessionsAsync().then(loaded => {
      setSessions(loaded.map(s => ({ ...s, trackPoints: [] })) as TrainingSession[]);
    });
  }, []);

  // Sessioni con trackpoint (solo quella corrente/analizzata)
  const [richSessions, setRichSessions] = useState<Map<string, TrainingSession>>(new Map());

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Analisi derivate
  const allSessions = sessions.map(s => richSessions.get(s.id) ?? s);
  const weekly: WeeklyStats[] = buildWeeklyStats(allSessions, maxHR);
  const fitness = calculateFitnessMetrics(allSessions, maxHR);
  const fitnessHistory = buildFitnessHistory(allSessions, maxHR, 90);
  const readiness = calculateReadiness(allSessions, weekly);
  const recommendations = generateRecommendations(allSessions, fitness, weekly, maxHR);
  const injuryRisk = calculateInjuryRisk(allSessions, weekly, fitness, profile);

  // Ultima sessione con traccia per pace profile
  const lastRich = Array.from(richSessions.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
  const paceProfile = lastRich ? buildPaceProfile(lastRich) : [];

  // Zone distribution dell'ultima sessione ricca
  const lastAnalysis: SessionAnalysis | null = lastRich ? analyzeSession(lastRich, maxHR) : null;
  const zoneData = lastAnalysis?.zoneDist ? [
    { name: "Z1", value: Math.round(lastAnalysis.zoneDist.z1Sec / 60), color: ZONE_COLORS[0] },
    { name: "Z2", value: Math.round(lastAnalysis.zoneDist.z2Sec / 60), color: ZONE_COLORS[1] },
    { name: "Z3", value: Math.round(lastAnalysis.zoneDist.z3Sec / 60), color: ZONE_COLORS[2] },
    { name: "Z4", value: Math.round(lastAnalysis.zoneDist.z4Sec / 60), color: ZONE_COLORS[3] },
    { name: "Z5", value: Math.round(lastAnalysis.zoneDist.z5Sec / 60), color: ZONE_COLORS[4] },
  ].filter(d => d.value > 0) : [];

  // ── UPLOAD ──────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const newSessions: TrainingSession[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const session = await parseActivityFile(file);
        const analysis = analyzeSession(session, maxHR);
        session.trimp = analysis.trimp;
        session.tss = analysis.tss;
        session.hrZonesSec = lastAnalysis?.zoneDist
          ? [
              lastAnalysis.zoneDist.z1Sec, lastAnalysis.zoneDist.z2Sec,
              lastAnalysis.zoneDist.z3Sec, lastAnalysis.zoneDist.z4Sec,
              lastAnalysis.zoneDist.z5Sec,
            ]
          : undefined;
        newSessions.push(session);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (errors.length > 0) setUploadError(errors.join(" | "));

    setSessions(prev => {
      const existing = new Set(prev.map(s => s.id));
      const toAdd = newSessions.filter(s => !existing.has(s.id));
      const merged = [...prev, ...toAdd].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      saveSessions(merged);
      return merged;
    });
    setRichSessions(prev => {
      const map = new Map(prev);
      newSessions.forEach(s => map.set(s.id, s));
      return map;
    });
    setUploading(false);
  }, [maxHR, lastAnalysis]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = (id: string) => {
    setSessions(prev => deleteSession(id, prev));
    setRichSessions(prev => { const m = new Map(prev); m.delete(id); return m; });
  };

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem("gp_coach_auth");
    navigate("/coach-login");
  };

  const saveMaxHR = (v: number) => {
    setMaxHR(v);
    localStorage.setItem("gp_coach_maxhr", String(v));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── PROFILE MODAL ───────────────────────────── */}
      {showProfileModal && (
        <ProfileModal initial={profile} onSave={handleSaveProfile} />
      )}

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-primary shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="font-heading text-primary-foreground font-bold text-lg">Area Coach</span>
            <span className="text-primary-foreground/50 text-xs font-body ml-1">Gratitude Path</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab atleti (solo coach Supabase) */}
            {coachUserId && (
              <div className="flex bg-primary-foreground/10 rounded-lg p-0.5">
                <button onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === "dashboard" ? "bg-primary-foreground text-primary" : "text-primary-foreground/70 hover:text-primary-foreground"}`}>
                  Dashboard
                </button>
                <button onClick={() => setActiveTab("atleti")}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === "atleti" ? "bg-primary-foreground text-primary" : "text-primary-foreground/70 hover:text-primary-foreground"}`}>
                  <Users className="w-3 h-3" />
                  Atleti {athletes.length > 0 && `(${athletes.length})`}
                </button>
              </div>
            )}
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-1.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-primary-foreground/10" title="Profilo atleta">
              <User className="w-4 h-4" />
              {profile ? `${profile.age}a · ${profile.weightKg}kg` : "Profilo"}
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="p-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors" title="FC Max">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-primary-foreground/10">
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>
        </div>

        {/* Settings inline */}
        {showSettings && (
          <div className="border-t border-primary-foreground/10 bg-primary/90 px-4 py-3">
            <div className="max-w-6xl mx-auto flex items-center gap-4 flex-wrap">
              <label className="text-xs text-primary-foreground/80 font-semibold">FC Max:</label>
              <input
                type="number" min={140} max={220}
                value={maxHR}
                onChange={e => saveMaxHR(parseInt(e.target.value) || 185)}
                className="w-20 px-2 py-1 text-sm bg-primary-foreground/10 border border-primary-foreground/20 rounded text-primary-foreground focus:outline-none focus:ring-1 focus:ring-green-400"
              />
              <span className="text-xs text-primary-foreground/60">bpm (usata per zone e TRIMP)</span>
              <span className="text-xs text-primary-foreground/40">|</span>
              {(() => { const z = calculateHRZones(maxHR); return (
                <span className="text-xs text-primary-foreground/60">
                  Z1 &lt;{z.z1[1]} · Z2 {z.z2[0]}–{z.z2[1]} · Z3 {z.z3[0]}–{z.z3[1]} · Z4 {z.z4[0]}–{z.z4[1]} · Z5 &gt;{z.z5[0]}
                </span>
              ); })()}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">

        {/* ── VISTA ATLETI (solo tab atleti) ─────────── */}
        {activeTab === "atleti" && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              I tuoi atleti ({athletes.length})
            </h2>
            {athletes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-semibold">Nessun atleta assegnato</p>
                <p className="text-sm mt-1">Gli atleti ti vedranno nella lista quando si registrano e scelgono il loro coach</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {athletes.map(a => {
                  const bmi = a.profile.weightKg && a.profile.heightCm
                    ? (a.profile.weightKg / Math.pow(a.profile.heightCm / 100, 2)).toFixed(1)
                    : null;
                  const maxHRAtleta = a.profile.maxHR ?? (a.profile.age ? maxHRFromAge(a.profile.age) : 185);
                  return (
                    <div key={a.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-foreground">{a.displayName}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: "Età", value: a.profile.age ? `${a.profile.age}a` : "—" },
                          { label: "Peso", value: a.profile.weightKg ? `${a.profile.weightKg} kg` : "—" },
                          { label: "BMI", value: bmi ?? "—" },
                          { label: "Altezza", value: a.profile.heightCm ? `${a.profile.heightCm} cm` : "—" },
                          { label: "FC riposo", value: a.profile.restHR ? `${a.profile.restHR} bpm` : "—" },
                          { label: "FC max", value: `${maxHRAtleta} bpm` },
                          { label: "Esperienza", value: a.profile.experienceYears ? `${a.profile.experienceYears}a` : "—" },
                          { label: "Sesso", value: a.profile.gender ?? "—" },
                        ].map(m => (
                          <div key={m.label} className="bg-muted rounded-lg px-2 py-1.5">
                            <span className="text-[10px] text-muted-foreground block">{m.label}</span>
                            <span className="text-xs font-bold">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Tutto il resto solo in tab dashboard */}
        {activeTab !== "atleti" && <>

        {/* ── VALUTAZIONE ─────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* — Readiness card — */}
          <div
            className="lg:col-span-2 relative overflow-hidden rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, ${readiness.color}18, ${readiness.color}06)`,
              border: `1px solid ${readiness.color}30`,
            }}
          >
            {/* Cerchio decorativo sfondo */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 pointer-events-none"
              style={{ background: readiness.color }}
            />

            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Idoneità Pellegrinaggio
            </p>

            {/* Score ring + label */}
            <div className="flex items-center gap-5 mb-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9"
                    stroke={readiness.color} strokeOpacity="0.15" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9"
                    stroke={readiness.color} strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42 * readiness.score / 100} ${2 * Math.PI * 42}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-heading leading-none" style={{ color: readiness.color }}>
                    {readiness.score}
                  </span>
                  <span className="text-[9px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-4xl font-bold font-heading leading-none" style={{ color: readiness.color }}>
                  {readiness.score}%
                </p>
                <p className="text-sm font-semibold mt-1.5" style={{ color: readiness.color }}>
                  {readiness.label}
                </p>
              </div>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-2">
              {(Object.entries(readiness.breakdown) as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-16 text-right text-[11px] text-muted-foreground capitalize truncate">{k}</span>
                  <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: `${readiness.color}20` }}>
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: readiness.color }} />
                  </div>
                  <span className="w-7 text-[11px] font-bold tabular-nums" style={{ color: readiness.color }}>{v}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* — KPI grid 3×2 — */}
          {(() => {
            const totalKm = sessions.reduce((acc, s) => acc + s.distanceM / 1000, 0);
            const totalDeniv = sessions.reduce((acc, s) => acc + s.totalElevationGainM, 0);
            const kpis = [
              {
                label: "Forma", sub: "CTL",
                value: String(fitness.ctl),
                icon: <TrendingUp className="w-4 h-4" />,
                color: "#22c55e",
                note: fitness.ctl > 50 ? "Buona base" : fitness.ctl > 25 ? "In costruzione" : "Da sviluppare",
              },
              {
                label: "Fatica", sub: "ATL 7gg",
                value: String(fitness.atl),
                icon: <Flame className="w-4 h-4" />,
                color: "#f97316",
                note: fitness.atl > fitness.ctl ? "Alta" : "Sotto controllo",
              },
              {
                label: "Stato forma", sub: "TSB",
                value: fitness.tsb > 0 ? `+${fitness.tsb}` : String(fitness.tsb),
                icon: <Zap className="w-4 h-4" />,
                color: fitness.tsb >= 5 ? "#22c55e" : fitness.tsb <= -10 ? "#ef4444" : "#f59e0b",
                note: fitness.tsb > 5 ? "Riposato" : fitness.tsb < -10 ? "Stanco" : "Bilanciato",
              },
              {
                label: "Sessioni", sub: "totali",
                value: String(sessions.length),
                icon: <Activity className="w-4 h-4" />,
                color: "#818cf8",
                note: sessions.length > 0 ? `ultima: ${fmtDate(sessions[0].startTime)}` : "Nessuna",
              },
              {
                label: "Km totali", sub: "percorsi",
                value: totalKm.toFixed(0),
                icon: <Footprints className="w-4 h-4" />,
                color: "#06b6d4",
                note: `media ${sessions.length ? (totalKm / sessions.length).toFixed(1) : "0"} km/sessione`,
              },
              {
                label: "Dislivello", sub: "totale",
                value: totalDeniv > 999 ? `${(totalDeniv / 1000).toFixed(1)}k` : String(Math.round(totalDeniv)),
                icon: <Mountain className="w-4 h-4" />,
                color: "#a78bfa",
                note: `${Math.round(totalDeniv)} m +`,
              },
            ];
            return (
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {kpis.map(kpi => (
                  <div
                    key={kpi.label}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between overflow-hidden relative"
                  >
                    {/* Bordo colorato superiore */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: kpi.color }} />
                    <div className="flex items-center gap-1.5 mb-3 mt-1" style={{ color: kpi.color }}>
                      {kpi.icon}
                      <span className="text-xs font-bold">{kpi.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-0.5">· {kpi.sub}</span>
                    </div>
                    <div className="text-3xl font-bold font-heading leading-none tabular-nums" style={{ color: kpi.color }}>
                      {kpi.value}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 truncate">{kpi.note}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* ── RISCHIO INFORTUNI ────────────────────── */}
        <section
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${injuryRisk.color}15, ${injuryRisk.color}05)`,
            border: `1px solid ${injuryRisk.color}30`,
          }}
        >
          <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full opacity-10 pointer-events-none"
            style={{ background: injuryRisk.color }} />

          <div className="flex items-start gap-4 flex-wrap">
            {/* Score */}
            <div className="flex items-center gap-3 min-w-[160px]">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" stroke={injuryRisk.color} strokeOpacity="0.15" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" stroke={injuryRisk.color} strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42 * injuryRisk.score / 100} ${2 * Math.PI * 42}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" style={{ color: injuryRisk.color }} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rischio Infortuni</p>
                <p className="text-2xl font-bold font-heading leading-none" style={{ color: injuryRisk.color }}>
                  {injuryRisk.level}
                </p>
                <p className="text-xs text-muted-foreground">{injuryRisk.score}/100</p>
              </div>
            </div>

            {/* Fattori */}
            <div className="flex flex-wrap gap-2 flex-1">
              {injuryRisk.factors.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border"
                  style={{
                    borderColor: f.risk === "danger" ? "#ef444440" : f.risk === "warn" ? "#f59e0b40" : "#22c55e30",
                    background: f.risk === "danger" ? "#ef444410" : f.risk === "warn" ? "#f59e0b10" : "#22c55e08",
                  }}>
                  <span>{f.risk === "danger" ? "🔴" : f.risk === "warn" ? "🟡" : "🟢"}</span>
                  <div>
                    <span className="font-semibold text-foreground">{f.label}</span>
                    <span className="text-muted-foreground ml-1 hidden sm:inline">— {f.detail}</span>
                  </div>
                </div>
              ))}
              {!profile && (
                <button onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors">
                  <User className="w-3 h-3" />
                  Inserisci profilo per analisi completa
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── UPLOAD AREA ──────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Carica Allenamento</h2>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-green-500/50 hover:bg-green-500/5 transition-all"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".fit,.tcx"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            {uploading ? (
              <p className="text-sm text-green-600 font-semibold animate-pulse">Analisi in corso…</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">Trascina file .fit o .tcx</p>
                <p className="text-xs text-muted-foreground mt-1">oppure clicca per selezionare · Garmin, Polar, Wahoo, Strava export</p>
              </>
            )}
          </div>
          {uploadError && (
            <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              ⚠️ {uploadError}
            </div>
          )}
        </section>

        {/* ── LISTA SESSIONI ───────────────────────── */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Sessioni caricate ({sessions.length})
            </h2>
            <div className="space-y-2">
              {sessions.map(s => {
                const rich = richSessions.get(s.id) ?? s;
                const analysis = analyzeSession(rich, maxHR);
                const isExpanded = expandedId === s.id;
                const paceProf = isExpanded && rich.trackPoints.length > 0 ? buildPaceProfile(rich) : [];

                return (
                  <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* ─ Row principale ─ */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">{sportIcon(s.sport)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground capitalize">{s.sport}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(s.startTime)}</span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.fileName}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm font-bold">{(s.distanceM / 1000).toFixed(1)} km</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />{fmtDuration(s.durationSec)}</span>
                          {s.avgHeartRate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{s.avgHeartRate} bpm</span>}
                          {s.totalElevationGainM > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mountain className="w-3 h-3" />+{Math.round(s.totalElevationGainM)}m</span>}
                          <span className="text-xs font-semibold" style={{ color: "#f97316" }}>TRIMP {analysis.trimp}</span>
                          {/* Stelle valutazione nella row */}
                          <span className="text-xs text-yellow-400">{"★".repeat(evaluateSession(analysis, profile, maxHR).stars)}{"☆".repeat(5 - evaluateSession(analysis, profile, maxHR).stars)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Valutazione sessione">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors" title="Elimina">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* ─ Drawer valutazione ─ */}
                    {isExpanded && (() => {
                      const ev = evaluateSession(analysis, profile, maxHR);
                      const zd = analysis.zoneDist;
                      const dominantZoneIdx = zd
                        ? [zd.z1Sec, zd.z2Sec, zd.z3Sec, zd.z4Sec, zd.z5Sec].reduce((mi, v, i, a) => v > a[mi] ? i : mi, 0)
                        : -1;
                      return (
                        <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">

                          {/* Valutazione globale */}
                          <div className="flex items-start gap-4 flex-wrap">
                            <div className="flex-shrink-0 text-center">
                              <div className="text-3xl text-yellow-400 leading-none">
                                {"★".repeat(ev.stars)}{"☆".repeat(5 - ev.stars)}
                              </div>
                              <p className="text-xs font-bold mt-1" style={{
                                color: ev.stars >= 4 ? "#22c55e" : ev.stars >= 3 ? "#f59e0b" : "#ef4444"
                              }}>{ev.label}</p>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-2">
                              {ev.insights.map((ins, i) => (
                                <span key={i} className="text-[11px] text-muted-foreground bg-background border border-border rounded-lg px-2.5 py-1.5 leading-snug">
                                  💬 {ins}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Metriche griglia */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: "Velocità media", value: `${s.avgSpeedKmh.toFixed(1)} km/h` },
                              { label: "Andatura media", value: fmtPace(analysis.paceMinKm) },
                              { label: "FC media / max", value: s.avgHeartRate ? `${s.avgHeartRate} / ${s.maxHeartRate ?? "—"} bpm` : "—" },
                              { label: "Calorie", value: s.calories ? `${s.calories} kcal` : "—" },
                              { label: "Dislivello +/−", value: `+${Math.round(s.totalElevationGainM)}m / −${Math.round(s.totalElevationLossM)}m` },
                              { label: "TSS", value: String(analysis.tss), color: "#6366f1" },
                              { label: "TRIMP", value: String(analysis.trimp), color: "#f97316" },
                              { label: "Zona prevalente", value: dominantZoneIdx >= 0 ? ZONE_LABELS[dominantZoneIdx] : "—", color: ZONE_COLORS[dominantZoneIdx] ?? undefined },
                            ].map(m => (
                              <div key={m.label} className="bg-background rounded-lg px-3 py-2 border border-border">
                                <span className="text-[10px] text-muted-foreground block">{m.label}</span>
                                <p className="font-bold text-sm mt-0.5" style={{ color: m.color }}>{m.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Zone FC bar */}
                          {zd && zd.totalSec > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Distribuzione Zone FC</p>
                              <div className="flex h-7 rounded-lg overflow-hidden gap-0.5">
                                {[zd.z1Sec, zd.z2Sec, zd.z3Sec, zd.z4Sec, zd.z5Sec].map((v, i) => {
                                  const pct = (v / zd.totalSec) * 100;
                                  return pct > 0.5 ? (
                                    <div key={i} title={`${ZONE_LABELS[i]}: ${fmtDuration(v)}`}
                                      className="flex items-center justify-center text-[10px] font-bold text-white rounded-sm"
                                      style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }}>
                                      {pct > 10 ? `Z${i + 1}` : ""}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                              <div className="flex gap-3 mt-1.5 flex-wrap">
                                {[zd.z1Sec, zd.z2Sec, zd.z3Sec, zd.z4Sec, zd.z5Sec].map((v, i) => v > 0 ? (
                                  <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: ZONE_COLORS[i] }} />
                                    {ZONE_LABELS[i]}: <strong>{fmtDuration(v)}</strong>
                                    <span className="text-[10px]">({Math.round(v / zd.totalSec * 100)}%)</span>
                                  </span>
                                ) : null)}
                              </div>
                            </div>
                          )}

                          {/* Pace profile chart */}
                          {paceProf.length > 3 && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Andatura km per km</p>
                              <ResponsiveContainer width="100%" height={130}>
                                <LineChart data={paceProf}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="km" tick={{ fontSize: 10 }} label={{ value: "km", position: "insideBottomRight", offset: -4, fontSize: 10 }} />
                                  <YAxis reversed tick={{ fontSize: 10 }} domain={["auto", "auto"]}
                                    tickFormatter={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`} />
                                  <Tooltip formatter={(v: number) => [fmtPace(v), "Andatura"]} labelFormatter={l => `Km ${l}`} />
                                  <Line type="monotone" dataKey="paceMinKm" stroke="#6366f1" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── GRAFICI DASHBOARD ────────────────────── */}
        {sessions.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* CTL/ATL/TSB (PMC) */}
            {fitnessHistory.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-1">Performance Management Chart</h3>
                <p className="text-xs text-muted-foreground mb-3">CTL = Fitness · ATL = Fatica · TSB = Forma</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={fitnessHistory.filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 60)) === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelFormatter={l => `Data: ${l}`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="ctl" stroke="#22c55e" strokeWidth={2} dot={false} name="CTL (Fitness)" />
                    <Line type="monotone" dataKey="atl" stroke="#f97316" strokeWidth={2} dot={false} name="ATL (Fatica)" />
                    <Line type="monotone" dataKey="tsb" stroke="#818cf8" strokeWidth={1.5} dot={false} name="TSB (Forma)" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Volume settimanale */}
            {weekly.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-1">Volume Settimanale</h3>
                <p className="text-xs text-muted-foreground mb-3">km percorsi per settimana</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weekly.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(1)} km`, "Volume"]} />
                    <Bar dataKey="totalKm" fill="#22c55e" radius={[4, 4, 0, 0]} name="km" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Zone HR ultima sessione */}
            {zoneData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-1">Zone FC — Ultima Sessione</h3>
                <p className="text-xs text-muted-foreground mb-3">{lastRich ? fmtDate(lastRich.startTime) : ""}</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={zoneData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                        {zoneData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} min`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {zoneData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{ZONE_LABELS[["Z1","Z2","Z3","Z4","Z5"].indexOf(d.name)]}</span>
                        <span className="font-semibold ml-auto">{d.value} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pace ultima sessione */}
            {paceProfile.length > 3 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-1">Andatura — Ultima Sessione</h3>
                <p className="text-xs text-muted-foreground mb-3">min/km per segmento</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={paceProfile}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="km" tick={{ fontSize: 10 }} label={{ value: "km", position: "insideBottomRight", offset: -4, fontSize: 10 }} />
                    <YAxis reversed tick={{ fontSize: 10 }} domain={["auto", "auto"]} tickFormatter={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`} />
                    <Tooltip formatter={(v: number) => [fmtPace(v), "Andatura"]} labelFormatter={l => `Km ${l}`} />
                    <Line type="monotone" dataKey="paceMinKm" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {/* ── RACCOMANDAZIONI COACH ────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            💬 Raccomandazioni Coach
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  rec.priority === "alta"
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                    : rec.priority === "media"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                    : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{rec.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">{rec.title}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${
                        rec.priority === "alta" ? "bg-red-500 text-white" :
                        rec.priority === "media" ? "bg-amber-500 text-white" : "bg-green-500 text-white"
                      }`}>{rec.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.detail}</p>
                    <span className="text-[10px] text-muted-foreground/60 capitalize mt-1 inline-block">#{rec.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATO VUOTO ──────────────────────────── */}
        {sessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Footprints className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-base font-semibold">Nessun allenamento caricato</p>
            <p className="text-sm mt-1">Carica un file .fit o .tcx per iniziare l'analisi</p>
          </div>
        )}

        </>}

      </main>
    </div>
  );
}
