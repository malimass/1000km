/**
 * ProiezionePercorso.tsx — Confronto allenamenti vs tappe del percorso
 *
 * Mostra per ogni tappa: km, dislivello, tempo stimato, calorie stimate,
 * e la "copertura" basata sugli allenamenti dell'atleta.
 */
import { useMemo } from "react";
import { Map, Clock, Mountain, Flame, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { tappe, Tappa } from "@/lib/tappe";
import { TrainingSession } from "@/lib/trainingParser";

/* ─── Proiezione per singola tappa ─────────────────────────── */
export interface TappaProjection {
  tappa: Tappa;
  /* Confronti */
  maxSessionKm: number;          // sessione più lunga dell'atleta
  coverageKm: number;            // % copertura distanza (0–100)
  coverageElev: number;          // % copertura dislivello (0–100)
  /* Stime */
  estimatedTimeH: number;        // ore stimate per la tappa
  estimatedCalories: number;     // kcal stimate
  estimatedTrimp: number;        // TRIMP stimato
  /* Stato */
  status: "ready" | "partial" | "gap";
}

/* ─── Calcolo proiezioni ───────────────────────────────────── */
function buildProjections(
  sessions: TrainingSession[],
  weightKg: number,
): TappaProjection[] {
  if (sessions.length === 0) return [];

  // Statistiche dall'allenamento dell'atleta
  const maxKm = Math.max(...sessions.map(s => s.distanceM / 1000));
  const maxElev = Math.max(...sessions.map(s => s.totalElevationGainM));

  // Passo medio ponderato per distanza (min/km)
  const totalDist = sessions.reduce((a, s) => a + s.distanceM, 0);
  const weightedPace = sessions.reduce((a, s) => {
    const paceMinKm = s.distanceM > 100 ? (s.durationSec / 60) / (s.distanceM / 1000) : 0;
    return a + paceMinKm * s.distanceM;
  }, 0) / (totalDist || 1);

  // Calorie medie per km (dagli allenamenti con calorie disponibili)
  const sessWithCal = sessions.filter(s => s.calories && s.calories > 0 && s.distanceM > 500);
  const calPerKm = sessWithCal.length > 0
    ? sessWithCal.reduce((a, s) => a + s.calories! / (s.distanceM / 1000), 0) / sessWithCal.length
    : weightKg * 0.9; // fallback: ~0.9 kcal/kg/km per camminata

  // TRIMP medio per ora (dagli allenamenti con TRIMP)
  const sessWithTrimp = sessions.filter(s => s.trimp && s.trimp > 0 && s.durationSec > 300);
  const trimpPerHour = sessWithTrimp.length > 0
    ? sessWithTrimp.reduce((a, s) => a + s.trimp! / (s.durationSec / 3600), 0) / sessWithTrimp.length
    : 40; // fallback

  // Dislivello medio stimato per tappa (senza dati reali del percorso,
  // calcoliamo un budget di ~600m D+ per tappa media da 70 km)
  const avgElevPerKm = 600 / 70; // ~8.6 m/km

  return tappe.map(t => {
    const tappaElev = t.km * avgElevPerKm;

    // Fattore salita: +30 sec/km ogni 100m D+ extra rispetto alla media piatta
    const elevFactor = 1 + (tappaElev / t.km) * 0.035;
    const adjustedPace = weightedPace * elevFactor;
    const estimatedTimeH = (adjustedPace * t.km) / 60;

    const estimatedCalories = Math.round(calPerKm * t.km);
    const estimatedTrimp = Math.round(trimpPerHour * estimatedTimeH);

    // Copertura: quanto l'atleta ha già coperto questa distanza/dislivello
    const coverageKm = Math.min(100, Math.round((maxKm / t.km) * 100));
    const coverageElev = maxElev > 0
      ? Math.min(100, Math.round((maxElev / tappaElev) * 100))
      : 0;

    const avgCoverage = (coverageKm + coverageElev) / 2;
    const status: TappaProjection["status"] =
      avgCoverage >= 80 ? "ready" :
      avgCoverage >= 50 ? "partial" : "gap";

    return {
      tappa: t,
      maxSessionKm: maxKm,
      coverageKm,
      coverageElev,
      estimatedTimeH,
      estimatedCalories,
      estimatedTrimp,
      status,
    };
  });
}

/* ─── Helpers formattazione ────────────────────────────────── */
function fmtTime(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

const STATUS_CFG = {
  ready:   { icon: CheckCircle,   color: "text-green-500",  bg: "bg-green-500/10", label: "Pronto" },
  partial: { icon: AlertTriangle, color: "text-amber-500",  bg: "bg-amber-500/10", label: "Parziale" },
  gap:     { icon: XCircle,       color: "text-red-500",    bg: "bg-red-500/10",   label: "Da preparare" },
};

/* ─── Component ────────────────────────────────────────────── */
interface Props {
  sessions: TrainingSession[];
  weightKg?: number;
}

export default function ProiezionePercorso({ sessions, weightKg = 70 }: Props) {
  const projections = useMemo(
    () => buildProjections(sessions, weightKg),
    [sessions, weightKg],
  );

  if (projections.length === 0) return null;

  const totalKm = tappe.reduce((a, t) => a + t.km, 0);
  const totalTimeH = projections.reduce((a, p) => a + p.estimatedTimeH, 0);
  const totalCal = projections.reduce((a, p) => a + p.estimatedCalories, 0);
  const readyCount = projections.filter(p => p.status === "ready").length;
  const partialCount = projections.filter(p => p.status === "partial").length;
  const gapCount = projections.filter(p => p.status === "gap").length;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Map className="w-4 h-4" /> Proiezione Percorso
      </h2>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { l: "Distanza totale", v: `${totalKm} km`, t: "Chilometri totali del percorso" },
          { l: "Tempo stimato", v: fmtTime(totalTimeH), t: "Tempo totale stimato basato sul tuo passo medio" },
          { l: "Calorie stimate", v: `${Math.round(totalCal).toLocaleString("it-IT")} kcal`, t: "Stima calorie totali basata sui tuoi allenamenti" },
          { l: "Copertura tappe", v: `${readyCount}/${tappe.length}`, t: `${readyCount} pronte, ${partialCount} parziali, ${gapCount} da preparare` },
        ].map(m => (
          <div key={m.l} className="bg-card border border-border rounded-lg px-3 py-2 cursor-help" title={m.t}>
            <span className="text-[10px] text-muted-foreground block">{m.l}</span>
            <strong className="text-sm">{m.v}</strong>
          </div>
        ))}
      </div>

      {/* Barra copertura visuale */}
      <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
        {projections.map((p, i) => {
          const cfg = STATUS_CFG[p.status];
          const bgColor = p.status === "ready" ? "#22c55e" : p.status === "partial" ? "#f59e0b" : "#ef4444";
          const pct = (p.tappa.km / totalKm) * 100;
          return (
            <div
              key={i}
              title={`Tappa ${p.tappa.giorno}: ${p.tappa.da} → ${p.tappa.a} (${p.tappa.km} km) — ${cfg.label}`}
              className="flex items-center justify-center text-[9px] font-bold text-white cursor-help"
              style={{ width: `${pct}%`, backgroundColor: bgColor }}
            >
              {pct > 5 ? `T${p.tappa.giorno}` : ""}
            </div>
          );
        })}
      </div>

      {/* Tabella tappe */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">Tappa</th>
                <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Percorso</th>
                <th className="text-right px-3 py-2 font-medium">Km</th>
                <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">D+ stim.</th>
                <th className="text-right px-3 py-2 font-medium">Tempo</th>
                <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Calorie</th>
                <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">TRIMP</th>
                <th className="text-center px-3 py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p, i) => {
                const cfg = STATUS_CFG[p.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-semibold">
                      <span className="text-muted-foreground">G{p.tappa.giorno}</span>
                      <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">({p.tappa.data})</span>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <span className="text-muted-foreground">{p.tappa.da}</span>
                      <span className="mx-1">→</span>
                      {p.tappa.a}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{p.tappa.km}</td>
                    <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">
                      ~{Math.round(p.tappa.km * 600 / 70)}m
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmtTime(p.estimatedTimeH)}</td>
                    <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">{p.estimatedCalories.toLocaleString("it-IT")}</td>
                    <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">{p.estimatedTrimp}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{cfg.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totali */}
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-3 py-2">Totale</td>
                <td className="px-3 py-2 hidden sm:table-cell">14 giorni</td>
                <td className="px-3 py-2 text-right font-mono">{totalKm}</td>
                <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">~{Math.round(totalKm * 600 / 70)}m</td>
                <td className="px-3 py-2 text-right font-mono">{fmtTime(totalTimeH)}</td>
                <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">{Math.round(totalCal).toLocaleString("it-IT")}</td>
                <td className="px-3 py-2 text-right font-mono hidden sm:table-cell">{Math.round(projections.reduce((a, p) => a + p.estimatedTrimp, 0))}</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[10px]">
                    <span className="text-green-500">{readyCount}</span>
                    {" / "}
                    <span className="text-amber-500">{partialCount}</span>
                    {" / "}
                    <span className="text-red-500">{gapCount}</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Pronto: hai già coperto distanza e dislivello simili</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Parziale: copertura 50-80%</span>
        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Gap: servono uscite più lunghe</span>
      </div>
    </section>
  );
}
