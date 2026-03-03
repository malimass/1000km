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

import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Upload, Trash2, LogOut, Activity, TrendingUp, Heart,
  Mountain, Timer, Flame, Footprints, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { parseActivityFile, TrainingSession } from "@/lib/trainingParser";
import {
  analyzeSession, generateRecommendations, calculateFitnessMetrics,
  buildFitnessHistory, buildWeeklyStats, calculateReadiness, buildPaceProfile,
  calculateHRZones, saveSessions, loadSessions, deleteSession,
  defaultMaxHR, SessionAnalysis, WeeklyStats,
} from "@/lib/coachAnalysis";

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

export default function Coach() {
  const navigate = useNavigate();

  // Configurazione utente
  const [maxHR, setMaxHR] = useState<number>(() => {
    const stored = localStorage.getItem("gp_coach_maxhr");
    return stored ? parseInt(stored) : defaultMaxHR(35);
  });
  const [showSettings, setShowSettings] = useState(false);

  // Sessioni (solo metadati persistiti; trackPoints in memoria per sessione corrente)
  const [sessions, setSessions] = useState<TrainingSession[]>(() => {
    const stored = loadSessions();
    return stored.map(s => ({ ...s, trackPoints: [] })) as TrainingSession[];
  });

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

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-primary shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="font-heading text-primary-foreground font-bold text-lg">Area Coach</span>
            <span className="text-primary-foreground/50 text-xs font-body ml-1">Gratitude Path</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(s => !s)} className="p-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors" title="Impostazioni">
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

        {/* ── READINESS SCORE ──────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Readiness principale */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Idoneità Pellegrinaggio</p>
            <div
              className="text-5xl font-bold font-heading mb-1"
              style={{ color: readiness.color }}
            >
              {readiness.score}%
            </div>
            <p className="text-sm font-body" style={{ color: readiness.color }}>{readiness.label}</p>
            <div className="w-full mt-3 space-y-1.5">
              {(Object.entries(readiness.breakdown) as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-right text-muted-foreground capitalize">{k}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, backgroundColor: readiness.color }} />
                  </div>
                  <span className="w-8 text-muted-foreground">{v}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metriche KPI */}
          {[
            { label: "Forma (CTL)", value: fitness.ctl, icon: <TrendingUp className="w-4 h-4" />, color: "#22c55e", unit: "" },
            { label: "Fatica (ATL)", value: fitness.atl, icon: <Flame className="w-4 h-4" />, color: "#f97316", unit: "" },
            { label: "Stato di forma", value: fitness.tsb > 0 ? `+${fitness.tsb}` : String(fitness.tsb), icon: <Activity className="w-4 h-4" />, color: fitness.tsb >= 0 ? "#22c55e" : "#ef4444", unit: "" },
            { label: "Sessioni totali", value: sessions.length, icon: <Footprints className="w-4 h-4" />, color: "#818cf8", unit: "" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2" style={{ color: kpi.color }}>
                {kpi.icon}
                <span className="text-xs font-semibold">{kpi.label}</span>
              </div>
              <div className="text-3xl font-bold font-heading" style={{ color: kpi.color }}>{kpi.value}{kpi.unit}</div>
              {kpi.label === "Stato di forma" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {fitness.tsb > 5 ? "Riposato" : fitness.tsb < -10 ? "Stanco" : "Bilanciato"}
                </p>
              )}
            </div>
          ))}
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
                    {/* Row principale */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">{sportIcon(s.sport)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground capitalize">{s.sport}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(s.startTime)}</span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.fileName}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-sm font-bold text-foreground">{(s.distanceM / 1000).toFixed(1)} km</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />{fmtDuration(s.durationSec)}</span>
                          {s.avgHeartRate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{s.avgHeartRate} bpm</span>}
                          {s.totalElevationGainM > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mountain className="w-3 h-3" />+{Math.round(s.totalElevationGainM)}m</span>}
                          <span className="text-xs text-orange-500 font-semibold">TRIMP {analysis.trimp}</span>
                          <span className="text-xs text-blue-500 font-semibold">Sforzo {analysis.effortScore}/10</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          title="Dettagli"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Dettaglio espanso */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/20">
                        {/* Metriche complete */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-xs text-muted-foreground">Velocità media</span><p className="font-semibold">{s.avgSpeedKmh.toFixed(1)} km/h</p></div>
                          <div><span className="text-xs text-muted-foreground">Andatura media</span><p className="font-semibold">{fmtPace(analysis.paceMinKm)}</p></div>
                          <div><span className="text-xs text-muted-foreground">FC max</span><p className="font-semibold">{s.maxHeartRate ? `${s.maxHeartRate} bpm` : "—"}</p></div>
                          <div><span className="text-xs text-muted-foreground">Calorie</span><p className="font-semibold">{s.calories ? `${s.calories} kcal` : "—"}</p></div>
                          <div><span className="text-xs text-muted-foreground">Dislivello −</span><p className="font-semibold">−{Math.round(s.totalElevationLossM)}m</p></div>
                          <div><span className="text-xs text-muted-foreground">TSS</span><p className="font-semibold text-blue-500">{analysis.tss}</p></div>
                          <div><span className="text-xs text-muted-foreground">Zona prevalente</span><p className="font-semibold">
                            {analysis.zoneDist && analysis.zones ? (() => {
                              const zd = analysis.zoneDist;
                              const vals = [zd.z1Sec, zd.z2Sec, zd.z3Sec, zd.z4Sec, zd.z5Sec];
                              const max = Math.max(...vals);
                              return max > 0 ? ZONE_LABELS[vals.indexOf(max)] : "—";
                            })() : "—"}
                          </p></div>
                          <div><span className="text-xs text-muted-foreground">Punti GPS</span><p className="font-semibold">{rich.trackPoints.length || "—"}</p></div>
                        </div>

                        {/* Zone HR */}
                        {analysis.zoneDist && analysis.zoneDist.totalSec > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Distribuzione Zone FC</p>
                            <div className="flex gap-1 h-6 rounded overflow-hidden">
                              {[analysis.zoneDist.z1Sec, analysis.zoneDist.z2Sec, analysis.zoneDist.z3Sec, analysis.zoneDist.z4Sec, analysis.zoneDist.z5Sec].map((v, i) => {
                                const pct = (v / analysis.zoneDist!.totalSec) * 100;
                                return pct > 0.5 ? (
                                  <div key={i} title={`${ZONE_LABELS[i]}: ${fmtDuration(v)}`}
                                    className="flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }}>
                                    {pct > 8 ? `Z${i + 1}` : ""}
                                  </div>
                                ) : null;
                              })}
                            </div>
                            <div className="flex gap-3 mt-1 flex-wrap">
                              {[analysis.zoneDist.z1Sec, analysis.zoneDist.z2Sec, analysis.zoneDist.z3Sec, analysis.zoneDist.z4Sec, analysis.zoneDist.z5Sec].map((v, i) => v > 0 ? (
                                <span key={i} className="text-xs text-muted-foreground">
                                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ZONE_COLORS[i] }} />
                                  Z{i + 1}: {fmtDuration(v)}
                                </span>
                              ) : null)}
                            </div>
                          </div>
                        )}

                        {/* Pace profile */}
                        {paceProf.length > 3 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Andatura km per km</p>
                            <ResponsiveContainer width="100%" height={120}>
                              <LineChart data={paceProf}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="km" tick={{ fontSize: 10 }} label={{ value: "km", position: "insideRight", fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} reversed domain={["auto", "auto"]} tickFormatter={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}`} />
                                <Tooltip formatter={(v: number) => fmtPace(v)} labelFormatter={l => `Km ${l}`} />
                                <Line type="monotone" dataKey="paceMinKm" stroke="#6366f1" strokeWidth={2} dot={false} name="Andatura" />
                              </LineChart>
                            </ResponsiveContainer>
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

      </main>
    </div>
  );
}
