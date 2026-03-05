/**
 * coachAnalysis.ts
 * Motore di analisi avanzata degli allenamenti per il pellegrinaggio 1000km.
 *
 * Modelli implementati:
 *  - HR Zones (5 zone % FC-max)
 *  - TRIMP (Training Impulse, Bannister)
 *  - TSS proxy (Training Stress Score)
 *  - CTL / ATL / TSB  (Chronic Training Load / Acute Training Load / Training Stress Balance)
 *  - Raccomandazioni coach contestuali
 *  - Readiness Score per il pellegrinaggio
 */

import { TrainingSession, TrackPoint } from "./trainingParser";
import { apiFetch } from "./api";

// ─── COSTANTI ────────────────────────────────────────────────────────────────

// Parametri CTL/ATL standard (giorni di decay)
const CTL_DAYS = 42;
const ATL_DAYS = 7;

// Tappe medie del percorso (km e dislivello)
const AVG_STAGE_KM = 27;          // km/giorno media pellegrinaggio
const AVG_STAGE_D_PLUS = 600;     // m dislivello+ medio/giorno

// ─── TIPI PUBBLICI ───────────────────────────────────────────────────────────

export interface HRZones {
  maxHR: number;
  z1: [number, number]; // Recovery      50–60 %
  z2: [number, number]; // Aerobico base 60–70 %
  z3: [number, number]; // Aerobico      70–80 %
  z4: [number, number]; // Soglia        80–90 %
  z5: [number, number]; // VO2max        90–100 %
}

export interface ZoneDistribution {
  z1Sec: number;
  z2Sec: number;
  z3Sec: number;
  z4Sec: number;
  z5Sec: number;
  totalSec: number;
}

export interface FitnessMetrics {
  ctl: number;   // Chronic Training Load  – fitness
  atl: number;   // Acute Training Load    – fatica
  tsb: number;   // Training Stress Balance – forma (ctl - atl)
}

export interface CoachRecommendation {
  category: "recupero" | "volume" | "intensità" | "elevatezza" | "consistenza" | "pellegrinaggio";
  priority: "alta" | "media" | "bassa";
  title: string;
  detail: string;
  icon: string;
}

export interface ReadinessScore {
  score: number;        // 0–100
  label: string;
  color: string;
  breakdown: {
    distanza: number;   // 0–100
    volume: number;     // 0–100
    consistenza: number;
    elevatezza: number;
    resistenza: number;
  };
}

export interface SessionAnalysis {
  session: TrainingSession;
  zones: HRZones | null;
  zoneDist: ZoneDistribution | null;
  trimp: number;
  tss: number;
  paceMinKm: number;     // min/km medio
  effortScore: number;   // 0–10 stima sforzo
}

export interface WeeklyStats {
  weekLabel: string;     // es. "Sett 10"
  startDate: Date;
  totalKm: number;
  totalDurationH: number;
  totalGainM: number;
  sessionCount: number;
  avgTrimp: number;
}

// ─── PROFILO ATLETA ──────────────────────────────────────────────────────────

export interface CoachProfile {
  age: number;              // anni
  weightKg: number;         // kg
  heightCm: number;         // cm
  gender: "M" | "F";
  restHR: number;           // FC a riposo bpm
  experienceYears: number;  // anni di allenamento continuativo
}

export function saveProfile(p: CoachProfile): void {
  localStorage.setItem("gp_coach_profile", JSON.stringify(p));
}

export function loadProfile(): CoachProfile | null {
  try {
    const raw = localStorage.getItem("gp_coach_profile");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function calcBMI(p: CoachProfile): number {
  const h = p.heightCm / 100;
  return Math.round((p.weightKg / (h * h)) * 10) / 10;
}

/** Formula Tanaka: più accurata di 220-età sopra i 40 anni */
export function maxHRFromAge(age: number): number {
  return Math.round(208 - 0.7 * age);
}

// ─── RISCHIO INFORTUNI ────────────────────────────────────────────────────────

export interface InjuryFactor {
  label: string;
  detail: string;
  risk: "ok" | "warn" | "danger";
}

export interface InjuryRisk {
  score: number;    // 0–100, più alto = più a rischio
  level: "Basso" | "Moderato" | "Elevato" | "Alto";
  color: string;
  factors: InjuryFactor[];
}

export function calculateInjuryRisk(
  sessions: TrainingSession[],
  weekly: WeeklyStats[],
  fitness: FitnessMetrics,
  profile: CoachProfile | null
): InjuryRisk {
  const factors: InjuryFactor[] = [];
  let pts = 0;

  // 1. BMI
  if (profile) {
    const b = calcBMI(profile);
    if (b >= 30) {
      pts += 20;
      factors.push({ label: "BMI elevato", detail: `BMI ${b} — sovrappeso aumenta il carico articolare`, risk: "danger" });
    } else if (b >= 27) {
      pts += 10;
      factors.push({ label: "BMI borderline", detail: `BMI ${b} — leggero sovrappeso`, risk: "warn" });
    } else if (b < 18.5) {
      pts += 10;
      factors.push({ label: "BMI basso", detail: `BMI ${b} — possibili carenze nutrizionali`, risk: "warn" });
    } else {
      factors.push({ label: "BMI ottimale", detail: `BMI ${b}`, risk: "ok" });
    }

    // 2. Età
    if (profile.age >= 60) {
      pts += 20;
      factors.push({ label: "Età ≥ 60", detail: "Recupero più lento — progredire molto gradualmente", risk: "danger" });
    } else if (profile.age >= 50) {
      pts += 10;
      factors.push({ label: "Età ≥ 50", detail: "Attenzione al recupero tra sessioni intense", risk: "warn" });
    } else {
      factors.push({ label: "Fascia d'età OK", detail: `${profile.age} anni — buona capacità adattiva`, risk: "ok" });
    }

    // 3. Esperienza
    if (profile.experienceYears < 1) {
      pts += 25;
      factors.push({ label: "Principiante", detail: "< 1 anno di allenamento — aumenta il carico molto lentamente", risk: "danger" });
    } else if (profile.experienceYears < 3) {
      pts += 10;
      factors.push({ label: "Esperienza limitata", detail: `${profile.experienceYears} anni — costruisci la base con pazienza`, risk: "warn" });
    } else {
      factors.push({ label: "Esperienza adeguata", detail: `${profile.experienceYears} anni di allenamento`, risk: "ok" });
    }
  }

  // 4. Monotonia (ATL/CTL ratio)
  if (sessions.length > 3 && fitness.ctl > 0) {
    const ratio = fitness.atl / fitness.ctl;
    if (ratio > 1.5) {
      pts += 20;
      factors.push({ label: "Carico acuto molto alto", detail: `ATL/CTL = ${ratio.toFixed(2)} — rischio overreaching`, risk: "danger" });
    } else if (ratio > 1.2) {
      pts += 10;
      factors.push({ label: "Carico in aumento", detail: `ATL/CTL = ${ratio.toFixed(2)} — monitorare la fatica`, risk: "warn" });
    } else {
      factors.push({ label: "Carico bilanciato", detail: `ATL/CTL = ${ratio.toFixed(2)}`, risk: "ok" });
    }
  }

  // 5. Aumento volume settimanale
  if (weekly.length >= 2) {
    const last = weekly[weekly.length - 1];
    const prev = weekly[weekly.length - 2];
    if (prev.totalKm > 0) {
      const inc = (last.totalKm - prev.totalKm) / prev.totalKm;
      if (inc > 0.2) {
        pts += 15;
        factors.push({ label: "Volume +20% in 1 sett.", detail: `${prev.totalKm.toFixed(0)} → ${last.totalKm.toFixed(0)} km — troppo rapido`, risk: "danger" });
      } else if (inc > 0.1) {
        pts += 5;
        factors.push({ label: "Volume +10%", detail: "Nella norma, ma monitorare la risposta", risk: "warn" });
      } else if (inc >= 0) {
        factors.push({ label: "Volume stabile", detail: "Aumento graduale", risk: "ok" });
      }
    }
  }

  // 6. Fatica cronica (TSB)
  if (sessions.length > 0) {
    if (fitness.tsb < -20) {
      pts += 15;
      factors.push({ label: "Debito recupero", detail: `TSB ${fitness.tsb} — riposo necessario`, risk: "danger" });
    } else if (fitness.tsb < -10) {
      pts += 8;
      factors.push({ label: "Fatica in accumulo", detail: `TSB ${fitness.tsb}`, risk: "warn" });
    } else {
      factors.push({ label: "Recupero adeguato", detail: `TSB ${fitness.tsb}`, risk: "ok" });
    }
  }

  const score = Math.min(100, pts);
  let level: InjuryRisk["level"] = "Basso";
  let color = "#22c55e";
  if (score >= 60)      { level = "Alto";     color = "#ef4444"; }
  else if (score >= 40) { level = "Elevato";  color = "#f97316"; }
  else if (score >= 20) { level = "Moderato"; color = "#f59e0b"; }

  return { score, level, color, factors };
}

/** Valutazione qualitativa di una singola sessione */
export function evaluateSession(
  analysis: SessionAnalysis,
  profile: CoachProfile | null,
  maxHR: number
): { stars: number; label: string; insights: string[] } {
  const insights: string[] = [];
  let stars = 3;

  const { paceMinKm, trimp, effortScore, zoneDist } = analysis;
  const s = analysis.session;

  // Distanza
  if (s.distanceM / 1000 >= 25)      { stars++; insights.push("Ottima distanza — sopra la tappa media del pellegrinaggio."); }
  else if (s.distanceM / 1000 < 5)   { stars--; insights.push("Sessione breve. Buona per recupero attivo."); }

  // Sforzo
  if (effortScore >= 8)               { insights.push(`Sessione molto intensa (sforzo ${effortScore}/10). Pianifica recupero.`); }
  else if (effortScore <= 3)          { insights.push(`Sessione leggera (sforzo ${effortScore}/10). Ideale per recupero.`); }
  else                                { insights.push(`Sforzo moderato (${effortScore}/10). Ben bilanciata.`); }

  // Zone FC
  if (zoneDist && zoneDist.totalSec > 0) {
    const z2pct = (zoneDist.z2Sec / zoneDist.totalSec) * 100;
    const z45pct = ((zoneDist.z4Sec + zoneDist.z5Sec) / zoneDist.totalSec) * 100;
    if (z2pct >= 50)  { stars++; insights.push(`${Math.round(z2pct)}% in Z2 — ottima costruzione aerobica.`); }
    if (z45pct > 30)  { insights.push(`${Math.round(z45pct)}% in Z4–Z5 — alta intensità, assicura recupero.`); }
  }

  // Dislivello
  const gainPerKm = s.distanceM > 0 ? (s.totalElevationGainM / (s.distanceM / 1000)) : 0;
  if (gainPerKm > 30) { stars++; insights.push(`Dislivello elevato (${Math.round(gainPerKm)} m D+/km) — ottimo per preparare il terreno.`); }

  // FC
  if (s.avgHeartRate && s.maxHeartRate) {
    const drift = s.maxHeartRate - s.avgHeartRate;
    if (drift < 15 && trimp > 50) insights.push("FC stabile durante la sessione — buona efficienza aerobica.");
  }

  // Peso (calorie stimate)
  if (profile && s.calories) {
    const calPerKm = s.calories / (s.distanceM / 1000);
    insights.push(`~${Math.round(calPerKm)} kcal/km. Per il tuo peso (${profile.weightKg} kg) nella norma.`);
  }

  stars = Math.max(1, Math.min(5, stars));
  const labels = ["", "Da migliorare", "Sufficiente", "Buona", "Ottima", "Eccellente"];
  return { stars, label: labels[stars], insights };
}

// ─── ZONE FC ─────────────────────────────────────────────────────────────────

export function calculateHRZones(maxHR: number): HRZones {
  const pct = (lo: number, hi: number): [number, number] => [
    Math.round(maxHR * lo),
    Math.round(maxHR * hi),
  ];
  return {
    maxHR,
    z1: pct(0.50, 0.60),
    z2: pct(0.60, 0.70),
    z3: pct(0.70, 0.80),
    z4: pct(0.80, 0.90),
    z5: pct(0.90, 1.00),
  };
}

export function defaultMaxHR(ageYears = 35): number {
  return 220 - ageYears;
}

/** Distribuzione secondi nelle 5 zone HR dai trackpoint */
export function calculateZoneDistribution(
  trackPoints: TrackPoint[],
  zones: HRZones
): ZoneDistribution {
  const dist: ZoneDistribution = { z1Sec: 0, z2Sec: 0, z3Sec: 0, z4Sec: 0, z5Sec: 0, totalSec: 0 };
  if (trackPoints.length < 2) return dist;

  for (let i = 1; i < trackPoints.length; i++) {
    const hr = trackPoints[i].heartRate;
    if (hr === undefined || hr === 0) continue;
    const dt = (trackPoints[i].time.getTime() - trackPoints[i - 1].time.getTime()) / 1000;
    if (dt <= 0 || dt > 300) continue; // gap > 5 min → skip

    dist.totalSec += dt;
    if      (hr < zones.z1[0])                        { /* sotto z1 */ }
    else if (hr >= zones.z1[0] && hr < zones.z1[1])   dist.z1Sec += dt;
    else if (hr >= zones.z2[0] && hr < zones.z2[1])   dist.z2Sec += dt;
    else if (hr >= zones.z3[0] && hr < zones.z3[1])   dist.z3Sec += dt;
    else if (hr >= zones.z4[0] && hr < zones.z4[1])   dist.z4Sec += dt;
    else if (hr >= zones.z5[0])                        dist.z5Sec += dt;
  }
  return dist;
}

// ─── TRIMP (Bannister) ───────────────────────────────────────────────────────

/**
 * TRIMP = Σ(Δt × HR_ratio × 0.64 × e^(1.92 × HR_ratio))
 * HR_ratio = (HR - HR_rest) / (HR_max - HR_rest)
 * Se mancano trackpoint HR, usa TRIMP semplificato = duration_min × zona
 */
export function calculateTRIMP(session: TrainingSession, maxHR: number, restHR = 55): number {
  const { trackPoints, avgHeartRate, durationSec } = session;
  const durationMin = durationSec / 60;

  if (trackPoints.length >= 2) {
    let trimp = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const hr = trackPoints[i].heartRate;
      if (!hr || hr <= restHR) continue;
      const dt = (trackPoints[i].time.getTime() - trackPoints[i - 1].time.getTime()) / 1000;
      if (dt <= 0 || dt > 300) continue;
      const ratio = (hr - restHR) / (maxHR - restHR);
      const dtMin = dt / 60;
      trimp += dtMin * ratio * 0.64 * Math.exp(1.92 * ratio);
    }
    if (trimp > 0) return Math.round(trimp);
  }

  // Fallback: TRIMP semplificato da FC media
  if (avgHeartRate) {
    const ratio = (avgHeartRate - restHR) / (maxHR - restHR);
    return Math.round(durationMin * ratio * 0.64 * Math.exp(1.92 * ratio));
  }

  // Ultimo fallback: stima da velocità / distanza
  const kmH = session.avgSpeedKmh || 5;
  const effort = Math.min(10, Math.max(3, kmH / 2)); // proxy grossolano
  return Math.round(durationMin * effort * 0.05);
}

/**
 * TSS proxy = (durationSec × NP × IF) / (FTP × 3600) × 100
 * Per il pellegrinaggio (cammino/corsa), usiamo TRIMP-based TSS:
 * TSS ≈ TRIMP × 1.05  (approssimazione ragionevole per trail/hiking)
 */
export function calculateTSS(session: TrainingSession, maxHR: number, restHR = 55): number {
  const trimp = calculateTRIMP(session, maxHR, restHR);
  return Math.round(trimp * 1.05);
}

// ─── CTL / ATL / TSB ─────────────────────────────────────────────────────────

/**
 * Calcola CTL e ATL con decadimento esponenziale (Performance Management Chart).
 * CTL_today = CTL_yesterday + (TSS_today − CTL_yesterday) / CTL_DAYS
 * ATL_today = ATL_yesterday + (TSS_today − ATL_yesterday) / ATL_DAYS
 */
export function calculateFitnessMetrics(
  sessions: TrainingSession[],
  maxHR: number
): FitnessMetrics {
  if (sessions.length === 0) return { ctl: 0, atl: 0, tsb: 0 };

  // Ordina per data
  const sorted = [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Costruisci mappa data → TSS
  const tssByDate = new Map<string, number>();
  sorted.forEach(s => {
    const key = s.startTime.toISOString().slice(0, 10);
    const tss = s.tss ?? calculateTSS(s, maxHR);
    tssByDate.set(key, (tssByDate.get(key) || 0) + tss);
  });

  // Simula dal primo giorno ad oggi
  const firstDate = sorted[0].startTime;
  const today = new Date();
  let ctl = 0, atl = 0;

  const cursor = new Date(firstDate);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    const tss = tssByDate.get(key) || 0;
    ctl = ctl + (tss - ctl) / CTL_DAYS;
    atl = atl + (tss - atl) / ATL_DAYS;
    cursor.setDate(cursor.getDate() + 1);
  }

  return { ctl: Math.round(ctl), atl: Math.round(atl), tsb: Math.round(ctl - atl) };
}

/** Serie storica CTL/ATL/TSB giorno per giorno (per il grafico) */
export function buildFitnessHistory(
  sessions: TrainingSession[],
  maxHR: number,
  days = 90
): Array<{ date: string; ctl: number; atl: number; tsb: number }> {
  if (sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const tssByDate = new Map<string, number>();
  sorted.forEach(s => {
    const key = s.startTime.toISOString().slice(0, 10);
    const tss = s.tss ?? calculateTSS(s, maxHR);
    tssByDate.set(key, (tssByDate.get(key) || 0) + tss);
  });

  const result: Array<{ date: string; ctl: number; atl: number; tsb: number }> = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - days);
  // Inizializza CTL/ATL a ritroso fino all'inizio dei dati
  let ctl = 0, atl = 0;
  const initStart = new Date(sorted[0].startTime);
  initStart.setHours(0, 0, 0, 0);
  const warmup = new Date(initStart);
  while (warmup < start) {
    const key = warmup.toISOString().slice(0, 10);
    const tss = tssByDate.get(key) || 0;
    ctl = ctl + (tss - ctl) / CTL_DAYS;
    atl = atl + (tss - atl) / ATL_DAYS;
    warmup.setDate(warmup.getDate() + 1);
  }

  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    const tss = tssByDate.get(key) || 0;
    ctl = ctl + (tss - ctl) / CTL_DAYS;
    atl = atl + (tss - atl) / ATL_DAYS;
    result.push({ date: key, ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

// ─── STATISTICHE SETTIMANALI ─────────────────────────────────────────────────

export function buildWeeklyStats(sessions: TrainingSession[], maxHR: number): WeeklyStats[] {
  if (sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const weeks = new Map<string, WeeklyStats>();

  sorted.forEach(s => {
    const d = new Date(s.startTime);
    // Lunedì della settimana
    const day = d.getDay(); // 0=dom
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    const key = mon.toISOString().slice(0, 10);
    const wn = getWeekNumber(mon);

    if (!weeks.has(key)) {
      weeks.set(key, {
        weekLabel: `Sett ${wn}`,
        startDate: mon,
        totalKm: 0,
        totalDurationH: 0,
        totalGainM: 0,
        sessionCount: 0,
        avgTrimp: 0,
      });
    }
    const w = weeks.get(key)!;
    w.totalKm += s.distanceM / 1000;
    w.totalDurationH += s.durationSec / 3600;
    w.totalGainM += s.totalElevationGainM;
    w.sessionCount++;
    w.avgTrimp += s.trimp ?? calculateTRIMP(s, maxHR);
  });

  return Array.from(weeks.values())
    .map(w => ({ ...w, avgTrimp: Math.round(w.avgTrimp / w.sessionCount), totalKm: Math.round(w.totalKm * 10) / 10 }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

// ─── ANALISI SINGOLA SESSIONE ────────────────────────────────────────────────

export function analyzeSession(session: TrainingSession, maxHR: number): SessionAnalysis {
  const zones = calculateHRZones(maxHR);
  const zoneDist = session.trackPoints.length > 0
    ? calculateZoneDistribution(session.trackPoints, zones)
    : null;
  const trimp = calculateTRIMP(session, maxHR);
  const tss = Math.round(trimp * 1.05);
  const paceMinKm = session.distanceM > 100
    ? (session.durationSec / 60) / (session.distanceM / 1000)
    : 0;
  // Effort score 0–10 basato su trimp, dislivello e distanza
  const dNorm = Math.min(1, session.distanceM / 30000);
  const gNorm = Math.min(1, session.totalElevationGainM / 1500);
  const tNorm = Math.min(1, trimp / 200);
  const effortScore = Math.round(((dNorm + gNorm + tNorm) / 3) * 10 * 10) / 10;

  return { session, zones, zoneDist, trimp, tss, paceMinKm, effortScore };
}

// ─── RACCOMANDAZIONI COACH ───────────────────────────────────────────────────

export function generateRecommendations(
  sessions: TrainingSession[],
  fitness: FitnessMetrics,
  weekly: WeeklyStats[],
  maxHR: number
): CoachRecommendation[] {
  const recs: CoachRecommendation[] = [];
  if (sessions.length === 0) {
    recs.push({ category: "volume", priority: "alta", icon: "🚶", title: "Inizia ad allenarsi", detail: "Carica il primo allenamento per ricevere analisi e consigli personalizzati." });
    return recs;
  }

  const lastWeek = weekly[weekly.length - 1];
  const prevWeek = weekly[weekly.length - 2];
  const totalKm = sessions.reduce((s, ss) => s + ss.distanceM / 1000, 0);
  const maxSession = Math.max(...sessions.map(s => s.distanceM / 1000));
  const lastSession = [...sessions].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
  const daysSinceLast = (Date.now() - lastSession.startTime.getTime()) / 86400000;

  // ── RECUPERO ─────────────────────────────────────
  if (fitness.tsb < -20) {
    recs.push({
      category: "recupero", priority: "alta", icon: "😴",
      title: "Sei in debito di recupero",
      detail: `TSB: ${fitness.tsb}. Il tuo corpo ha accumulato fatica (ATL ${fitness.atl} > CTL ${fitness.ctl}). Inserisci 1–2 giorni di riposo o attività rigenerativa (<z2) prima di aumentare il carico.`,
    });
  } else if (fitness.tsb > 15 && sessions.length > 3) {
    recs.push({
      category: "recupero", priority: "bassa", icon: "⚡",
      title: "Forma fisica ottimale",
      detail: `TSB: +${fitness.tsb}. Sei riposato e in buona forma. Ottimo momento per una sessione impegnativa o una lunga uscita.`,
    });
  }

  // ── VOLUME SETTIMANALE ────────────────────────────
  if (lastWeek) {
    if (prevWeek && lastWeek.totalKm > prevWeek.totalKm * 1.15) {
      recs.push({
        category: "volume", priority: "alta", icon: "📈",
        title: "Aumento volume troppo rapido",
        detail: `Questa settimana +${Math.round((lastWeek.totalKm / prevWeek.totalKm - 1) * 100)}% km rispetto alla precedente. La regola del 10% aiuta a prevenire infortuni. Mantieni ${Math.round(prevWeek.totalKm * 1.1)} km la prossima settimana.`,
      });
    }
    if (lastWeek.totalKm < 20 && sessions.length >= 3) {
      recs.push({
        category: "volume", priority: "media", icon: "📊",
        title: "Volume settimanale basso",
        detail: `Questa settimana solo ${lastWeek.totalKm.toFixed(1)} km. Per prepararsi alle tappe da ~${AVG_STAGE_KM}km/giorno, punta a 40–60 km/settimana con progressione graduale.`,
      });
    }
  }

  // ── CONSISTENZA ───────────────────────────────────
  if (daysSinceLast > 5) {
    recs.push({
      category: "consistenza", priority: "media", icon: "📅",
      title: "Lunga pausa dagli allenamenti",
      detail: `Sono passati ${Math.round(daysSinceLast)} giorni dall'ultima sessione. La continuità è fondamentale. Riprendi con un'uscita leggera in zona 2.`,
    });
  }
  if (weekly.length >= 2) {
    const avgSessions = sessions.length / weekly.length;
    if (avgSessions < 2.5) {
      recs.push({
        category: "consistenza", priority: "media", icon: "🔄",
        title: "Aumenta la frequenza di allenamento",
        detail: `Media ${avgSessions.toFixed(1)} sessioni/settimana. Per prepararsi al pellegrinaggio punta a 4–5 sessioni settimanali, alternando intensità e recupero.`,
      });
    }
  }

  // ── INTENSITÀ ─────────────────────────────────────
  const hrSessions = sessions.filter(s => s.avgHeartRate);
  if (hrSessions.length > 0) {
    const zones = calculateHRZones(maxHR);
    const avgHR = hrSessions.reduce((s, ss) => s + (ss.avgHeartRate || 0), 0) / hrSessions.length;
    const z2Top = zones.z2[1];
    if (avgHR > z2Top * 1.05 && sessions.length > 3) {
      recs.push({
        category: "intensità", priority: "media", icon: "❤️",
        title: "Troppo tempo in zone alte",
        detail: `FC media globale ${Math.round(avgHR)} bpm (>${z2Top} bpm). Per costruire base aerobica, l'80% del volume dovrebbe stare in Z1–Z2 (< ${z2Top} bpm). Rallenta nelle uscite lunghe.`,
      });
    }
  }

  // ── ELEVATEZZA ────────────────────────────────────
  const totalGain = sessions.reduce((s, ss) => s + ss.totalElevationGainM, 0);
  const avgGainPerSession = sessions.length > 0 ? totalGain / sessions.length : 0;
  if (avgGainPerSession < 200 && sessions.length >= 4) {
    recs.push({
      category: "elevatezza", priority: "media", icon: "⛰️",
      title: "Allena il dislivello",
      detail: `Dislivello medio ${Math.round(avgGainPerSession)}m/sessione. Il percorso prevede ~${AVG_STAGE_D_PLUS}m D+/giorno. Inserisci salite o usa il tapis roulant in pendenza.`,
    });
  }

  // ── PELLEGRINAGGIO ────────────────────────────────
  if (maxSession < AVG_STAGE_KM * 0.6) {
    recs.push({
      category: "pellegrinaggio", priority: "alta", icon: "🚶‍♂️",
      title: "Allenati su distanze più lunghe",
      detail: `La sessione più lunga è ${maxSession.toFixed(1)} km. Le tappe medie sono ${AVG_STAGE_KM} km. Inserisci una "long walk" settimanale progressiva: 15 → 20 → 25 → 30 km.`,
    });
  } else if (maxSession >= AVG_STAGE_KM * 0.9) {
    recs.push({
      category: "pellegrinaggio", priority: "bassa", icon: "✅",
      title: "Distanza giornaliera coperta",
      detail: `Ottimo! Hai già completato ${maxSession.toFixed(1)} km in una sessione, vicino alle tappe medie. Concentrati ora su giornate consecutive (back-to-back long walks).`,
    });
  }

  if (totalKm >= 200 && sessions.length >= 8) {
    recs.push({
      category: "pellegrinaggio", priority: "bassa", icon: "🎯",
      title: "Back-to-back training",
      detail: `Con ${Math.round(totalKm)} km totali di base, simula 2–3 giorni consecutivi di cammino per adattare tendini e muscoli all'impegno prolungato del pellegrinaggio.`,
    });
  }

  return recs;
}

// ─── READINESS SCORE ─────────────────────────────────────────────────────────

export function calculateReadiness(
  sessions: TrainingSession[],
  weekly: WeeklyStats[]
): ReadinessScore {
  if (sessions.length === 0) {
    return { score: 0, label: "Nessun dato", color: "#6b7280", breakdown: { distanza: 0, volume: 0, consistenza: 0, elevatezza: 0, resistenza: 0 } };
  }

  const maxSession = Math.max(...sessions.map(s => s.distanceM / 1000));
  const totalKm = sessions.reduce((s, ss) => s + ss.distanceM / 1000, 0);
  const totalGain = sessions.reduce((s, ss) => s + ss.totalElevationGainM, 0);
  const weeksWithData = weekly.filter(w => w.sessionCount > 0).length;

  // Distanza: max uscita vs tappa media (AVG_STAGE_KM)
  const distanza = Math.min(100, Math.round((maxSession / AVG_STAGE_KM) * 100));

  // Volume: km totali vs benchmark 500km di prep
  const volume = Math.min(100, Math.round((totalKm / 500) * 100));

  // Consistenza: settimane attive su totale
  const consistenza = weekly.length > 0 ? Math.min(100, Math.round((weeksWithData / Math.max(weekly.length, 8)) * 100)) : 0;

  // Elevatezza: gain totale vs benchmark 20 000m
  const elevatezza = Math.min(100, Math.round((totalGain / 20000) * 100));

  // Resistenza: sessioni con > 20 km su totale
  const longOuts = sessions.filter(s => s.distanceM / 1000 >= 20).length;
  const resistenza = Math.min(100, Math.round((longOuts / 10) * 100));

  const score = Math.round((distanza * 0.3 + volume * 0.25 + consistenza * 0.2 + elevatezza * 0.15 + resistenza * 0.1));

  let label = "Inizio percorso";
  let color = "#ef4444";
  if (score >= 80) { label = "Pronto al pellegrinaggio!"; color = "#22c55e"; }
  else if (score >= 60) { label = "Buona preparazione"; color = "#84cc16"; }
  else if (score >= 40) { label = "In sviluppo"; color = "#f59e0b"; }
  else if (score >= 20) { label = "Base da costruire"; color = "#f97316"; }

  return { score, label, color, breakdown: { distanza, volume, consistenza, elevatezza, resistenza } };
}

// ─── PACE CHART DATA ─────────────────────────────────────────────────────────

export interface PaceChartPoint {
  km: number;
  paceMinKm: number;
  altM: number;
}

/** Ricava il profilo di andatura km per km dai trackpoint */
export function buildPaceProfile(session: TrainingSession): PaceChartPoint[] {
  const pts = session.trackPoints.filter(tp => tp.distanceM !== undefined);
  if (pts.length < 5) return [];

  const result: PaceChartPoint[] = [];
  let prevKmMark = 0;
  let prevIdx = 0;

  for (let km = 1; km * 1000 <= (pts[pts.length - 1].distanceM ?? 0); km++) {
    const mark = km * 1000;
    const idx = pts.findIndex(tp => (tp.distanceM ?? 0) >= mark);
    if (idx < 0) break;

    const dt = (pts[idx].time.getTime() - pts[prevIdx].time.getTime()) / 1000;
    const dd = (pts[idx].distanceM ?? 0) - prevKmMark;
    const pace = dd > 0 ? (dt / 60) / (dd / 1000) : 0;
    const alt = pts[idx].altitudeM ?? 0;

    if (pace > 2 && pace < 30) result.push({ km, paceMinKm: Math.round(pace * 100) / 100, altM: alt });

    prevKmMark = pts[idx].distanceM ?? 0;
    prevIdx = idx;
  }
  return result;
}

// ─── STORAGE (localStorage + Neon) ───────────────────────────────────────

const STORAGE_KEY = "gp_coach_sessions";

type SessionRow = Omit<TrainingSession, "trackPoints" | "startTime" | "hrZonesSec"> & {
  start_time: string;
  file_name: string;
  duration_sec: number;
  distance_m: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  total_elevation_gain_m: number;
  total_elevation_loss_m: number;
  hr_zones_sec?: number[] | null;
};

function toRow(s: TrainingSession): SessionRow {
  return {
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
  };
}

function fromRow(r: SessionRow): Omit<TrainingSession, "trackPoints"> {
  return {
    id: r.id,
    fileName: r.file_name,
    sport: r.sport,
    startTime: new Date(r.start_time),
    durationSec: r.duration_sec,
    distanceM: r.distance_m,
    avgSpeedKmh: r.avg_speed_kmh,
    maxSpeedKmh: r.max_speed_kmh,
    avgHeartRate: r.avg_heart_rate,
    maxHeartRate: r.max_heart_rate,
    totalElevationGainM: r.total_elevation_gain_m,
    totalElevationLossM: r.total_elevation_loss_m,
    calories: r.calories,
    trimp: r.trimp,
    tss: r.tss,
    hrZonesSec: r.hr_zones_sec
      ? (r.hr_zones_sec as [number, number, number, number, number])
      : undefined,
  };
}

/** Salva in localStorage (sincrono) e API Neon (fire-and-forget). */
export function saveSessions(sessions: TrainingSession[]): void {
  const light = sessions.map(({ trackPoints: _, ...rest }) => rest);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
  } catch { /* quota exceeded */ }

  // Deduplicate by id
  const seen = new Set<string>();
  const rows = sessions.map(toRow).filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  for (const row of rows) {
    apiFetch("/api/coach-sessions", {
      method: "POST",
      body: JSON.stringify(row),
    }).catch(() => {});
  }
}

/** Carica da API Neon; se non disponibile, usa localStorage. */
export async function loadSessionsAsync(): Promise<Omit<TrainingSession, "trackPoints">[]> {
  try {
    const res = await apiFetch("/api/coach-sessions");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(
            (data as SessionRow[]).map(r => ({ ...fromRow(r), trackPoints: [] }))
          ));
        } catch { /* ignore */ }
        return (data as SessionRow[]).map(fromRow);
      }
    }
  } catch { /* ignore */ }
  // Fallback localStorage
  return loadSessionsLocal();
}

/** Lettura sincrona da localStorage (usata solo come fallback/inizializzatore). */
export function loadSessionsLocal(): Omit<TrainingSession, "trackPoints">[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((s: Omit<TrainingSession, "trackPoints"> & { startTime: string }) => ({
      ...s,
      startTime: new Date(s.startTime),
      trackPoints: [],
    }));
  } catch {
    return [];
  }
}

/** Elimina da localStorage e API Neon. */
export function deleteSession(id: string, sessions: TrainingSession[]): TrainingSession[] {
  const updated = sessions.filter(s => s.id !== id);
  saveSessions(updated);
  apiFetch(`/api/coach-sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  return updated;
}
