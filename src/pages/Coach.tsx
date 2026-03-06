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
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Upload, Trash2, LogOut, Activity, TrendingUp, Heart, BookOpen,
  Mountain, Timer, Flame, Footprints, ChevronDown, ChevronUp, RefreshCw,
  Zap, User, ShieldAlert, Star, X, Users,
} from "lucide-react";
import { parseActivityFile, TrainingSession } from "@/lib/trainingParser";
import {
  analyzeSession, generateRecommendations, calculateFitnessMetrics,
  buildFitnessHistory, buildWeeklyStats, calculateReadiness, buildPaceProfile,
  calculateHRZones, saveSessions, loadSessionsLocal, loadSessionsAsync, deleteSession,
  defaultMaxHR, maxHRFromAge,
  loadProfile, saveProfile, calculateInjuryRisk, evaluateSession,
  SessionAnalysis, WeeklyStats, CoachProfile,
} from "@/lib/coachAnalysis";
import { getCurrentUser, loadCoachAthletes, CoachAthlete } from "@/lib/auth";
import { clearAuthToken, apiFetch } from "@/lib/api";

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

// ─── COACH PROFILE MODAL ────────────────────────────────────────────────────

interface CoachPresentation {
  displayName: string;
  bio: string;
  specializzazione: string;
  city: string;
}

function ProfileModal({ initial, onSave, onClose }: {
  initial: CoachPresentation | null;
  onSave: (p: CoachPresentation) => void;
  onClose?: () => void;
}) {
  const empty: CoachPresentation = { displayName: "", bio: "", specializzazione: "", city: "" };
  const [form, setForm] = useState<CoachPresentation>(initial ?? empty);
  const set = (k: keyof CoachPresentation) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const specializzazioni = [
    "Corsa", "Trail Running", "Camminata sportiva", "Ciclismo",
    "Triathlon", "Preparazione atletica", "Riabilitazione sportiva", "Altro",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-heading">Profilo Coach</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Nome visualizzato</span>
            <input
              type="text" value={form.displayName} onChange={set("displayName")}
              placeholder="Es. Marco Rossi"
              className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Specializzazione</span>
            <select value={form.specializzazione} onChange={set("specializzazione")}
              className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Seleziona...</option>
              {specializzazioni.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Città</span>
            <input
              type="text" value={form.city} onChange={set("city")}
              placeholder="Es. Bologna"
              className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Presentazione</span>
            <textarea
              value={form.bio} onChange={set("bio")}
              rows={4}
              placeholder="Descrivi la tua esperienza, il tuo approccio e cosa offri ai tuoi atleti..."
              className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </label>
        </div>

        <button
          onClick={() => onSave(form)}
          disabled={!form.displayName.trim()}
          className="mt-5 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Salva profilo
        </button>
      </div>
    </div>
  );
}

// ─── OBIETTIVI ──────────────────────────────────────────────────────────────

const OBIETTIVI: Record<string, string> = {
  pellegrinaggio: "Pellegrinaggio 1000km",
  maratona: "Maratona",
  mezza: "Mezza maratona",
  trail: "Trail/Ultra",
  forma: "Forma fisica",
  peso: "Perdita peso",
  benessere: "Benessere",
};

// ─── ATLETI TAB ─────────────────────────────────────────────────────────────

function AtletiTab({ athletes, onSelectAthlete }: { athletes: CoachAthlete[]; onSelectAthlete?: (a: CoachAthlete) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [athleteSessions, setAthleteSessions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const loadSessions = async (athleteId: string) => {
    if (athleteSessions[athleteId]) {
      setSelectedId(selectedId === athleteId ? null : athleteId);
      return;
    }
    setLoading(athleteId);
    try {
      const res = await apiFetch(`/api/coach-sessions?user_id=${athleteId}`);
      const data = res.ok ? await res.json() : [];
      const mapped = (data as any[]).map((r: any) => ({
        id: r.id,
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
      setAthleteSessions(prev => ({ ...prev, [athleteId]: mapped }));
      setSelectedId(athleteId);
    } catch {
      setAthleteSessions(prev => ({ ...prev, [athleteId]: [] }));
      setSelectedId(athleteId);
    }
    setLoading(null);
  };

  if (athletes.length === 0) {
    return (
      <section className="text-center py-16 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-semibold">Nessun atleta assegnato</p>
        <p className="text-sm mt-1">Gli atleti ti vedranno nella lista quando si registrano e scelgono il loro coach</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        I tuoi atleti ({athletes.length})
      </h2>
      {athletes.map(a => {
        const bmi = a.profile.weightKg && a.profile.heightCm
          ? (a.profile.weightKg / Math.pow(a.profile.heightCm / 100, 2)).toFixed(1)
          : null;
        const mhr = a.profile.maxHR ?? (a.profile.age ? maxHRFromAge(a.profile.age) : 185);
        const isSelected = selectedId === a.id;
        const sess = athleteSessions[a.id] ?? [];
        const totalKm = sess.reduce((s: number, x: any) => s + x.distanceM / 1000, 0);
        const totalElev = sess.reduce((s: number, x: any) => s + (x.totalElevationGainM || 0), 0);
        const fm = isSelected && sess.length > 0 ? calculateFitnessMetrics(sess as any, mhr) : { ctl: 0, atl: 0, tsb: 0 };
        const wk = isSelected && sess.length > 0 ? buildWeeklyStats(sess as any, mhr) : [];
        const rd = isSelected && sess.length > 0 ? calculateReadiness(sess as any, wk) : { score: 0, label: "", color: "#999" };

        return (
          <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header atleta */}
            <button
              onClick={() => loadSessions(a.id)}
              className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground">{a.displayName}</p>
                  {a.profile.obiettivo && (
                    <span className="text-[10px] font-semibold bg-dona/10 text-dona rounded-full px-2 py-0.5">
                      {OBIETTIVI[a.profile.obiettivo] ?? a.profile.obiettivo}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {isSelected && sess.length > 0 && (
                  <>
                    <span className="font-bold text-foreground">{sess.length} sessioni</span>
                    <span>{totalKm.toFixed(0)} km</span>
                  </>
                )}
                {loading === a.id
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                }
              </div>
            </button>

            {/* Dettagli atleta espanso */}
            {isSelected && (
              <div className="border-t border-border bg-muted/10 px-5 py-4 space-y-4">
                {/* Dati fisici compatti */}
                <div className="flex flex-wrap gap-2">
                  {[
                    a.profile.age && `${a.profile.age} anni`,
                    a.profile.weightKg && `${a.profile.weightKg} kg`,
                    a.profile.heightCm && `${a.profile.heightCm} cm`,
                    bmi && `BMI ${bmi}`,
                    a.profile.restHR && `FC rip ${a.profile.restHR}`,
                    `FC max ${mhr}`,
                    a.profile.gender && (a.profile.gender === "M" ? "Uomo" : "Donna"),
                    a.profile.experienceYears && `${a.profile.experienceYears}a esperienza`,
                  ].filter(Boolean).map((v, i) => (
                    <span key={i} className="text-[11px] bg-muted rounded-full px-2.5 py-1 text-muted-foreground">{v}</span>
                  ))}
                </div>

                {/* KPI se ci sono sessioni */}
                {sess.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { l: "Idoneità", v: `${rd.score}%`, c: rd.color },
                      { l: "Forma CTL", v: String(fm.ctl), c: "#22c55e" },
                      { l: "Fatica ATL", v: String(fm.atl), c: "#f97316" },
                      { l: "Km totali", v: `${totalKm.toFixed(0)}`, c: "#3b82f6" },
                      { l: "D+ totale", v: `${Math.round(totalElev)}m`, c: "#8b5cf6" },
                    ].map(k => (
                      <div key={k.l} className="bg-background rounded-lg px-3 py-2 border border-border">
                        <span className="text-[10px] text-muted-foreground block">{k.l}</span>
                        <span className="text-lg font-bold font-heading" style={{ color: k.c }}>{k.v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pulsante per aprire dashboard completa dell'atleta */}
                {onSelectAthlete && sess.length > 0 && (
                  <button
                    onClick={() => onSelectAthlete(a)}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    Visualizza Dashboard Completa
                  </button>
                )}

                {/* Sessioni dell'atleta */}
                {sess.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nessun allenamento caricato da questo atleta.</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Allenamenti</p>
                    {sess.map((s: any) => {
                      const analysis = analyzeSession(s, mhr);
                      const ev = evaluateSession(analysis, {
                        age: a.profile.age ?? 30,
                        weightKg: a.profile.weightKg ?? 70,
                        heightCm: a.profile.heightCm ?? 170,
                        gender: a.profile.gender ?? "M",
                        restHR: a.profile.restHR ?? 60,
                        experienceYears: a.profile.experienceYears ?? 1,
                      }, mhr);
                      const isExp = expandedSession === s.id;
                      return (
                        <div key={s.id} className="bg-background rounded-lg border border-border overflow-hidden">
                          <button
                            onClick={() => setExpandedSession(isExp ? null : s.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
                          >
                            <span className="text-base">{sportIcon(s.sport)}</span>
                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold">{(s.distanceM / 1000).toFixed(1)} km</span>
                              <span className="text-[11px] text-muted-foreground">{fmtDuration(s.durationSec)}</span>
                              <span className="text-[11px] text-muted-foreground">{fmtDate(s.startTime)}</span>
                              {s.avgHeartRate && <span className="text-[11px] text-muted-foreground">&#9829; {s.avgHeartRate}</span>}
                              <span className="text-xs text-yellow-400">{"★".repeat(ev.stars)}{"☆".repeat(5 - ev.stars)}</span>
                            </div>
                            {isExp ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                          </button>
                          {isExp && (
                            <div className="border-t border-border px-3 py-2.5 space-y-2 bg-muted/10">
                              {/* Insights */}
                              <div className="flex flex-wrap gap-1">
                                {ev.insights.map((ins: string, i: number) => (
                                  <span key={i} className="text-[11px] text-muted-foreground bg-background border border-border rounded px-2 py-0.5">💬 {ins}</span>
                                ))}
                              </div>
                              {/* Metriche */}
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
                                {[
                                  { l: "Velocità", v: `${s.avgSpeedKmh.toFixed(1)} km/h`, t: "Velocità media mantenuta durante la sessione" },
                                  { l: "FC media", v: s.avgHeartRate ? `${s.avgHeartRate} bpm` : "—", t: "Frequenza cardiaca media registrata" },
                                  { l: "FC max", v: s.maxHeartRate ? `${s.maxHeartRate} bpm` : "—", t: "Frequenza cardiaca massima raggiunta" },
                                  { l: "D+", v: `${Math.round(s.totalElevationGainM)}m`, t: "Dislivello positivo: metri totali di salita" },
                                  { l: "Calorie", v: s.calories ? `${s.calories} kcal` : "—", t: "Stima delle calorie bruciate" },
                                  { l: "TRIMP", v: s.trimp ? String(Math.round(s.trimp)) : "—", t: "Training Impulse: carico allenamento basato su durata e intensità cardiaca" },
                                ].map(m => (
                                  <div key={m.l} className="bg-background rounded px-2 py-1 border border-border cursor-help" title={m.t}>
                                    <span className="text-[9px] text-muted-foreground block">{m.l}</span>
                                    <strong className="text-[11px]">{m.v}</strong>
                                  </div>
                                ))}
                              </div>
                              {/* Zone bar */}
                              {analysis.zoneDist && analysis.zoneDist.totalSec > 0 && (
                                <div className="flex h-4 rounded overflow-hidden gap-0.5">
                                  {[analysis.zoneDist.z1Sec, analysis.zoneDist.z2Sec, analysis.zoneDist.z3Sec, analysis.zoneDist.z4Sec, analysis.zoneDist.z5Sec].map((v, i) => {
                                    const pct = (v / analysis.zoneDist!.totalSec) * 100;
                                    return pct > 0.5 ? (
                                      <div key={i} className="flex items-center justify-center text-[9px] font-bold text-white"
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
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── COMPONENTE PRINCIPALE ───────────────────────────────────────────────────

export default function Coach() {
  const navigate = useNavigate();

  // Profilo coach (presentazione)
  const [coachPres, setCoachPres] = useState<CoachPresentation | null>(() => {
    try { const raw = localStorage.getItem("gp_coach_pres"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [showProfileModal, setShowProfileModal] = useState(() => {
    try { return !localStorage.getItem("gp_coach_pres"); } catch { return true; }
  });

  // Profilo analisi (per zone HR etc.)
  const [profile, setProfile] = useState<CoachProfile | null>(() => loadProfile());

  const handleSaveCoachPres = async (p: CoachPresentation) => {
    try { localStorage.setItem("gp_coach_pres", JSON.stringify(p)); } catch { /* noop */ }
    setCoachPres(p);
    setShowProfileModal(false);
    // Salva su Neon
    if (coachUserId) {
      try {
        await apiFetch("/api/profiles", {
          method: "POST",
          body: JSON.stringify({
            display_name: p.displayName,
            bio: p.bio,
            specializzazione: p.specializzazione,
            city: p.city,
          }),
        });
      } catch { /* noop */ }
    }
  };

  // FC max (auto-calcolata da età, o manuale)
  const [maxHR, setMaxHR] = useState<number>(() => {
    const stored = localStorage.getItem("gp_coach_maxhr");
    if (stored) return parseInt(stored);
    const p = loadProfile();
    return p ? maxHRFromAge(p.age) : defaultMaxHR(35);
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "atleti">("atleti");
  const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
  const [coachUserId, setCoachUserId] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<CoachAthlete | null>(null);
  const [athleteDashSessions, setAthleteDashSessions] = useState<TrainingSession[]>([]);

  // Carica atleti e profilo coach da Neon se autenticato
  useEffect(() => {
    getCurrentUser().then(async u => {
      if (u?.role === "coach") {
        setCoachUserId(u.id);
        loadCoachAthletes(u.id).then(setAthletes);
        // Carica presentazione coach da Neon
        try {
          const res = await apiFetch(`/api/profiles?id=${u.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const p: CoachPresentation = {
                displayName: data.display_name ?? "",
                bio: data.bio ?? "",
                specializzazione: data.specializzazione ?? "",
                city: data.city ?? "",
              };
              try { localStorage.setItem("gp_coach_pres", JSON.stringify(p)); } catch { /* noop */ }
              setCoachPres(p);
              setShowProfileModal(false);
            }
          }
        } catch { /* noop */ }
      }
    });
  }, []);

  // Sessioni (metadati persistiti su Neon + localStorage; trackPoints solo in memoria)
  const [sessions, setSessions] = useState<TrainingSession[]>(() =>
    loadSessionsLocal().map(s => ({ ...s, trackPoints: [] })) as TrainingSession[]
  );

  // Carica da Neon al mount
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

  // Profilo atleta selezionato (per injury risk e valutazioni)
  const activeProfile: CoachProfile | null = selectedAthlete ? {
    age: selectedAthlete.profile.age ?? 30,
    weightKg: selectedAthlete.profile.weightKg ?? 70,
    heightCm: selectedAthlete.profile.heightCm ?? 170,
    gender: (selectedAthlete.profile.gender as "M" | "F") ?? "M",
    restHR: selectedAthlete.profile.restHR ?? 60,
    experienceYears: selectedAthlete.profile.experienceYears ?? 1,
  } : profile;

  // Analisi derivate
  const allSessions = sessions.map(s => richSessions.get(s.id) ?? s);
  const weekly: WeeklyStats[] = buildWeeklyStats(allSessions, maxHR);
  const fitness = calculateFitnessMetrics(allSessions, maxHR);
  const fitnessHistory = buildFitnessHistory(allSessions, maxHR, 90);
  const readiness = calculateReadiness(allSessions, weekly);
  const recommendations = generateRecommendations(allSessions, fitness, weekly, maxHR);
  const injuryRisk = calculateInjuryRisk(allSessions, weekly, fitness, activeProfile);

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
    navigate("/accedi");
  };

  const saveMaxHR = (v: number) => {
    setMaxHR(v);
    localStorage.setItem("gp_coach_maxhr", String(v));
  };

  // Seleziona atleta e carica le sue sessioni per il dashboard
  const handleSelectAthlete = useCallback(async (a: CoachAthlete) => {
    setSelectedAthlete(a);
    setActiveTab("dashboard");
    // Calcola maxHR dall'atleta
    const athleteMaxHR = a.profile.maxHR ?? (a.profile.age ? maxHRFromAge(a.profile.age) : 185);
    setMaxHR(athleteMaxHR);
    try {
      const res = await apiFetch(`/api/coach-sessions?user_id=${a.id}`);
      const data = res.ok ? await res.json() : [];
      const mapped = (data as any[]).map((r: any) => ({
        id: r.id,
        sport: r.sport,
        fileName: r.file_name ?? "import",
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
      })) as TrainingSession[];
      setAthleteDashSessions(mapped);
      setSessions(mapped);
    } catch {
      setAthleteDashSessions([]);
      setSessions([]);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── PROFILE MODAL ───────────────────────────── */}
      {showProfileModal && (
        <ProfileModal
          initial={coachPres}
          onSave={handleSaveCoachPres}
          onClose={coachPres ? () => setShowProfileModal(false) : undefined}
        />
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
            {/* Tab atleti (solo coach Neon) */}
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
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-1.5 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-primary-foreground/10" title="Profilo coach">
              <User className="w-4 h-4" />
              {coachPres?.displayName || "Profilo"}
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
          <AtletiTab athletes={athletes} onSelectAthlete={handleSelectAthlete} />
        )}

        {/* Tutto il resto solo in tab dashboard */}
        {activeTab !== "atleti" && !selectedAthlete && (
          <section className="text-center py-20 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold text-foreground">Seleziona un atleta</p>
            <p className="text-sm mt-2">Vai alla tab <strong>Atleti</strong> e clicca su &quot;Visualizza Dashboard Completa&quot; per vedere i dati di un atleta.</p>
            <button
              onClick={() => setActiveTab("atleti")}
              className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Vai agli Atleti
            </button>
          </section>
        )}

        {activeTab !== "atleti" && selectedAthlete && <>

        {/* ── ATLETA SELEZIONATO HEADER ────────────── */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
          <button
            onClick={() => { setSelectedAthlete(null); setActiveTab("atleti"); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Atleti
          </button>
          <div className="w-px h-6 bg-border" />
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">{selectedAthlete.displayName}</p>
            <p className="text-xs text-muted-foreground">{selectedAthlete.email}</p>
          </div>
          {selectedAthlete.profile.obiettivo && (
            <span className="text-[10px] font-semibold bg-dona/10 text-dona rounded-full px-2 py-0.5">
              {OBIETTIVI[selectedAthlete.profile.obiettivo] ?? selectedAthlete.profile.obiettivo}
            </span>
          )}
        </div>

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
              {/* Rimosso: prompt profilo coach non serve qui */}
            </div>
          </div>
        </section>

        {/* Upload rimosso: solo l'atleta carica i propri allenamenti */}

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
                          <span className="text-xs text-yellow-400">{"★".repeat(evaluateSession(analysis, activeProfile, maxHR).stars)}{"☆".repeat(5 - evaluateSession(analysis, activeProfile, maxHR).stars)}</span>
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
                      const ev = evaluateSession(analysis, activeProfile, maxHR);
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
                              { label: "Velocità media", value: `${s.avgSpeedKmh.toFixed(1)} km/h`, tip: "Velocità media mantenuta durante la sessione" },
                              { label: "Andatura media", value: fmtPace(analysis.paceMinKm), tip: "Passo medio: minuti impiegati per percorrere 1 km" },
                              { label: "FC media / max", value: s.avgHeartRate ? `${s.avgHeartRate} / ${s.maxHeartRate ?? "—"} bpm` : "—", tip: "Frequenza cardiaca media e massima registrata durante la sessione" },
                              { label: "Calorie", value: s.calories ? `${s.calories} kcal` : "—", tip: "Stima delle calorie bruciate durante la sessione" },
                              { label: "Dislivello +/−", value: `+${Math.round(s.totalElevationGainM)}m / −${Math.round(s.totalElevationLossM)}m`, tip: "Metri totali di salita (+) e discesa (−)" },
                              { label: "TSS", value: String(analysis.tss), color: "#6366f1", tip: "Training Stress Score: carico di allenamento normalizzato sulla soglia funzionale. 100 = 1 ora a soglia" },
                              { label: "TRIMP", value: String(analysis.trimp), color: "#f97316", tip: "Training Impulse: carico di allenamento basato su durata e intensità cardiaca. Valori più alti = sessione più impegnativa" },
                              { label: "Zona prevalente", value: dominantZoneIdx >= 0 ? ZONE_LABELS[dominantZoneIdx] : "—", color: ZONE_COLORS[dominantZoneIdx] ?? undefined, tip: "La zona di frequenza cardiaca in cui hai trascorso più tempo" },
                            ].map(m => (
                              <div key={m.label} className="bg-background rounded-lg px-3 py-2 border border-border cursor-help" title={m.tip}>
                                <span className="text-[10px] text-muted-foreground block">{m.label}</span>
                                <p className="font-bold text-sm mt-0.5" style={{ color: m.color }}>{m.value}</p>
                              </div>
                            ))}
                          </div>
                          <Link to="/guida-metriche" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                            <BookOpen className="w-3.5 h-3.5" /> Cosa significano queste metriche?
                          </Link>

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
            <p className="text-base font-semibold">Nessun allenamento</p>
            <p className="text-sm mt-1">Questo atleta non ha ancora caricato allenamenti</p>
          </div>
        )}

        </>}

      </main>
    </div>
  );
}
