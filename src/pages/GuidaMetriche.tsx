/**
 * GuidaMetriche.tsx — Manuale delle metriche di allenamento
 * Route: /guida-metriche
 *
 * Spiega tutte le formule e i parametri utilizzati per la
 * valutazione degli allenamenti nella piattaforma.
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, TrendingUp, Zap, Mountain, Timer, Flame, ShieldAlert, Target, Activity } from "lucide-react";

/* ─── Singola sezione del manuale ──────────────────────────── */
interface Section {
  icon: React.ReactNode;
  title: string;
  anchor: string;
  what: string;
  formula?: string;
  details: string[];
  example?: string;
  ranges?: { label: string; color: string; desc: string }[];
}

const SECTIONS: Section[] = [
  /* ── FC Max ─────────────────────────────────────────────── */
  {
    icon: <Heart className="w-5 h-5 text-red-500" />,
    title: "Frequenza Cardiaca Massima (FC Max)",
    anchor: "fcmax",
    what: "La massima frequenza cardiaca raggiungibile sotto sforzo. È il riferimento base per calcolare le zone di allenamento.",
    formula: "FC Max = 208 − (0,7 × età)",
    details: [
      "Usiamo la formula di Tanaka, più accurata della classica 220−età soprattutto per chi ha più di 40 anni.",
      "Se hai effettuato un test da sforzo, la FC Max misurata è sempre preferibile a quella stimata.",
      "Come fallback usiamo la formula semplificata: 220 − età.",
    ],
    example: "Atleta di 45 anni → FC Max = 208 − (0,7 × 45) = 177 bpm",
  },

  /* ── Zone FC ────────────────────────────────────────────── */
  {
    icon: <Activity className="w-5 h-5 text-blue-500" />,
    title: "Zone di Frequenza Cardiaca",
    anchor: "zone-fc",
    what: "Cinque fasce di intensità basate sulla percentuale della FC Max. Servono a classificare il tipo di lavoro svolto.",
    details: [
      "Ogni zona rappresenta un livello di sforzo con effetti fisiologici diversi.",
      "Il tempo trascorso in ciascuna zona viene calcolato analizzando i dati GPS punto per punto.",
      "Gap superiori a 5 minuti tra i punti vengono ignorati (pausa o segnale perso).",
    ],
    ranges: [
      { label: "Z1 — Recupero (50–60%)", color: "#22c55e", desc: "Riscaldamento, defaticamento, recupero attivo. Brucia grassi, nessun affaticamento." },
      { label: "Z2 — Aerobico Base (60–70%)", color: "#3b82f6", desc: "Allenamento fondamentale. Migliora l'efficienza cardiaca e la resistenza di base." },
      { label: "Z3 — Aerobico Intenso (70–80%)", color: "#eab308", desc: "Lavoro moderato-sostenuto. Migliora la capacità aerobica e la tolleranza alla fatica." },
      { label: "Z4 — Soglia (80–90%)", color: "#f97316", desc: "Sforzo elevato, vicino alla soglia anaerobica. Migliora la velocità di soglia." },
      { label: "Z5 — VO₂max (90–100%)", color: "#ef4444", desc: "Sforzo massimale. Intervalli brevi per migliorare la potenza aerobica massima." },
    ],
    example: "Atleta con FC Max 180 bpm → Z2 = 108–126 bpm, Z4 = 144–162 bpm",
  },

  /* ── TRIMP ──────────────────────────────────────────────── */
  {
    icon: <Zap className="w-5 h-5 text-orange-500" />,
    title: "TRIMP (Training Impulse)",
    anchor: "trimp",
    what: "Misura il carico interno di un singolo allenamento combinando durata e intensità cardiaca. Più è alto, più la sessione è stata impegnativa.",
    formula: "TRIMP = Σ ( Δt × r × 0,64 × e^(1,92 × r) )",
    details: [
      "Δt = intervallo di tempo in minuti tra due punti GPS consecutivi.",
      "r = (FC − FC riposo) / (FC Max − FC riposo) — rapporto di riserva cardiaca.",
      "La FC a riposo di default è 55 bpm (personalizzabile).",
      "Il fattore esponenziale (e^1,92r) dà più peso alle intensità elevate: lavorare in Z5 \"pesa\" molto di più che in Z1.",
      "Se non ci sono dati GPS puntuali, il calcolo si basa sulla FC media della sessione.",
      "Se manca anche la FC, viene stimato dalla velocità media.",
    ],
    example: "1 ora a 150 bpm con FC Max 180 e FC riposo 55 → r ≈ 0,76 → TRIMP ≈ 120",
    ranges: [
      { label: "< 50", color: "#22c55e", desc: "Sessione leggera (recupero, camminata)" },
      { label: "50–100", color: "#3b82f6", desc: "Sessione moderata (allenamento aerobico)" },
      { label: "100–200", color: "#f97316", desc: "Sessione impegnativa (lungo o intenso)" },
      { label: "> 200", color: "#ef4444", desc: "Sessione molto dura (gara o allenamento estremo)" },
    ],
  },

  /* ── TSS ────────────────────────────────────────────────── */
  {
    icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
    title: "TSS (Training Stress Score)",
    anchor: "tss",
    what: "Indice di stress dell'allenamento normalizzato sulla soglia funzionale. 100 TSS equivale a 1 ora di sforzo a soglia.",
    formula: "TSS ≈ TRIMP × 1,05",
    details: [
      "Il TSS originale (di Coggan) è basato sulla potenza, non disponibile per cammino/trekking.",
      "Usiamo un'approssimazione basata sul TRIMP con un fattore di scala 1,05.",
      "Permette di confrontare sessioni di durata e intensità diverse su un'unica scala.",
      "È la base per il calcolo del carico cronico (CTL) e acuto (ATL).",
    ],
    example: "Sessione con TRIMP = 120 → TSS ≈ 126",
    ranges: [
      { label: "< 60", color: "#22c55e", desc: "Allenamento facile, recupero rapido" },
      { label: "60–120", color: "#3b82f6", desc: "Allenamento medio, recupero in 24h" },
      { label: "120–200", color: "#f97316", desc: "Allenamento duro, recupero in 24–48h" },
      { label: "> 200", color: "#ef4444", desc: "Allenamento molto duro, recupero in 48–72h" },
    ],
  },

  /* ── CTL / ATL / TSB ────────────────────────────────────── */
  {
    icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    title: "Fitness, Fatica e Forma (CTL / ATL / TSB)",
    anchor: "ctl-atl-tsb",
    what: "Tre indici che descrivono il tuo stato di allenamento complessivo nel tempo. Formano il Performance Management Chart (PMC).",
    formula: "CTL = CTL_ieri + (TSS − CTL_ieri) / 42\nATL = ATL_ieri + (TSS − ATL_ieri) / 7\nTSB = CTL − ATL",
    details: [
      "CTL (Chronic Training Load) — Fitness: media mobile esponenziale a 42 giorni del TSS. Rappresenta la tua forma fisica costruita nel tempo.",
      "ATL (Acute Training Load) — Fatica: media mobile esponenziale a 7 giorni del TSS. Rappresenta l'affaticamento recente.",
      "TSB (Training Stress Balance) — Forma: differenza tra fitness e fatica. Se positivo sei riposato, se negativo sei affaticato.",
      "Vengono calcolati giorno per giorno, sommando il TSS di tutte le sessioni della giornata.",
    ],
    ranges: [
      { label: "TSB > +15", color: "#22c55e", desc: "Ben riposato — pronto per uno sforzo importante o una gara" },
      { label: "TSB 0 a +15", color: "#3b82f6", desc: "Fresco — buon equilibrio tra fitness e recupero" },
      { label: "TSB −10 a 0", color: "#f97316", desc: "Leggermente affaticato — fase di carico produttiva" },
      { label: "TSB < −10", color: "#ef4444", desc: "Affaticato — rischio sovrallenamento, serve recupero" },
    ],
  },

  /* ── Effort Score ───────────────────────────────────────── */
  {
    icon: <Flame className="w-5 h-5 text-red-500" />,
    title: "Effort Score (Punteggio Sforzo)",
    anchor: "effort",
    what: "Un valore da 0 a 10 che riassume la difficoltà complessiva della sessione combinando distanza, dislivello e carico cardiaco.",
    formula: "Effort = media(d, g, t) × 10",
    details: [
      "d = min(1, distanza_m / 30.000) — normalizzato su 30 km",
      "g = min(1, dislivello+_m / 1.500) — normalizzato su 1500 m D+",
      "t = min(1, TRIMP / 200) — normalizzato su TRIMP 200",
      "La media dei tre fattori viene scalata 0–10.",
      "Ogni componente è capponato a 1 per evitare valori fuori scala.",
    ],
    example: "15 km, +750m D+, TRIMP 100 → d=0.50, g=0.50, t=0.50 → Effort = 5.0",
    ranges: [
      { label: "0–3", color: "#22c55e", desc: "Facile — passeggiata o recupero" },
      { label: "3–5", color: "#3b82f6", desc: "Moderato — allenamento standard" },
      { label: "5–7", color: "#f97316", desc: "Impegnativo — lungo o con dislivello" },
      { label: "7–10", color: "#ef4444", desc: "Molto duro — ultratrail o tappa completa" },
    ],
  },

  /* ── Passo ──────────────────────────────────────────────── */
  {
    icon: <Timer className="w-5 h-5 text-cyan-500" />,
    title: "Andatura (Passo)",
    anchor: "passo",
    what: "Il tempo impiegato per percorrere 1 km. È l'indicatore di velocità più intuitivo per chi cammina o corre.",
    formula: "Passo (min/km) = Durata (min) / Distanza (km)",
    details: [
      "Viene calcolato sia come media globale della sessione, sia km per km per il profilo di passo.",
      "Il profilo km-per-km permette di identificare cali di ritmo, effetto della fatica o del dislivello.",
      "Valori < 2 min/km o > 30 min/km vengono filtrati come anomalie GPS.",
    ],
    example: "10 km in 1h 40min → Passo = 100 min / 10 km = 10:00 min/km",
  },

  /* ── Dislivello ─────────────────────────────────────────── */
  {
    icon: <Mountain className="w-5 h-5 text-amber-600" />,
    title: "Dislivello (D+ / D−)",
    anchor: "dislivello",
    what: "I metri totali di salita (D+) e discesa (D−) durante la sessione. Indicatore chiave della difficoltà altimetrica.",
    details: [
      "Calcolato dalla traccia altimetrica dei dati GPS/barometrici.",
      "D+ alto con distanza ridotta = percorso molto ripido.",
      "Nel Readiness Score, il dislivello è normalizzato su un benchmark di 20.000 m cumulativi.",
    ],
  },

  /* ── Readiness Score ────────────────────────────────────── */
  {
    icon: <Target className="w-5 h-5 text-violet-500" />,
    title: "Readiness Score (Prontezza)",
    anchor: "readiness",
    what: "Un punteggio 0–100 che stima quanto sei pronto ad affrontare il Cammino dei Mille Km, basato sulla preparazione accumulata.",
    formula: "Score = 0,30×Dist + 0,25×Vol + 0,20×Cons + 0,15×Elev + 0,10×Res",
    details: [
      "Distanza (30%) — sessione più lunga vs 27 km (tappa media del cammino).",
      "Volume (25%) — km totali percorsi vs benchmark 500 km.",
      "Consistenza (20%) — settimane con almeno un allenamento vs settimane totali.",
      "Elevatezza (15%) — dislivello totale cumulato vs benchmark 20.000 m.",
      "Resistenza (10%) — numero di uscite ≥ 20 km vs benchmark 10.",
    ],
    example: "Max sessione 25 km, totale 300 km, 10/16 settimane attive, 12.000 m D+, 6 uscite lunghe → Score ≈ 63",
    ranges: [
      { label: "0–30", color: "#ef4444", desc: "Principiante — serve molta preparazione" },
      { label: "30–55", color: "#f97316", desc: "In crescita — buona base ma serve consolidare" },
      { label: "55–75", color: "#eab308", desc: "Quasi pronto — intensifica le uscite lunghe" },
      { label: "75–100", color: "#22c55e", desc: "Pronto — preparazione solida per il cammino" },
    ],
  },

  /* ── Rischio Infortuni ──────────────────────────────────── */
  {
    icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
    title: "Rischio Infortuni",
    anchor: "rischio",
    what: "Valutazione a punti del rischio di infortunio basata su 6 fattori: profilo fisico, esperienza e andamento del carico.",
    details: [
      "BMI: ≥ 30 (+20 pt), ≥ 27 (+10 pt), < 18,5 (+10 pt)",
      "Età: ≥ 60 (+20 pt), ≥ 50 (+10 pt)",
      "Esperienza: < 1 anno (+25 pt), < 3 anni (+10 pt)",
      "Rapporto ATL/CTL: > 1,5 (+20 pt), > 1,2 (+10 pt) — aumenti bruschi di carico",
      "Incremento volume settimanale: > 20% (+15 pt), > 10% (+5 pt)",
      "TSB (fatica): < −20 (+15 pt), < −10 (+8 pt)",
    ],
    ranges: [
      { label: "0–20 pt", color: "#22c55e", desc: "Rischio basso" },
      { label: "20–40 pt", color: "#eab308", desc: "Rischio moderato — attenzione ai segnali" },
      { label: "40–60 pt", color: "#f97316", desc: "Rischio alto — riduci il carico" },
      { label: "> 60 pt", color: "#ef4444", desc: "Rischio molto alto — riposo e consulto medico" },
    ],
  },

  /* ── BMI ────────────────────────────────────────────────── */
  {
    icon: <Heart className="w-5 h-5 text-pink-500" />,
    title: "BMI (Indice di Massa Corporea)",
    anchor: "bmi",
    what: "Rapporto tra peso e altezza al quadrato. Usato come fattore nel calcolo del rischio infortuni.",
    formula: "BMI = Peso (kg) / Altezza (m)²",
    details: [
      "Non è un indicatore perfetto (non distingue massa grassa e muscolare), ma è utile come screening generale.",
      "Nella piattaforma viene usato solo come fattore di rischio, non come giudizio.",
    ],
    example: "75 kg, 175 cm → BMI = 75 / 1,75² = 24,5",
    ranges: [
      { label: "< 18,5", color: "#3b82f6", desc: "Sottopeso" },
      { label: "18,5–25", color: "#22c55e", desc: "Normopeso" },
      { label: "25–30", color: "#eab308", desc: "Sovrappeso" },
      { label: "> 30", color: "#ef4444", desc: "Obesità" },
    ],
  },
];

/* ─── Component ────────────────────────────────────────────── */
export default function GuidaMetriche() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-lg hover:bg-muted transition" aria-label="Indietro">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-tight">Guida alle Metriche</h1>
            <p className="text-xs text-muted-foreground">Tutte le formule usate per valutare i tuoi allenamenti</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Indice */}
        <nav className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Indice</p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map(s => (
              <a
                key={s.anchor}
                href={`#${s.anchor}`}
                className="text-xs bg-muted hover:bg-primary/10 text-foreground rounded-full px-3 py-1 transition"
              >
                {s.title.split("(")[0].trim()}
              </a>
            ))}
          </div>
        </nav>

        {/* Sezioni */}
        {SECTIONS.map(s => (
          <section
            key={s.anchor}
            id={s.anchor}
            className="bg-card border border-border rounded-xl p-5 scroll-mt-20"
          >
            {/* Titolo */}
            <div className="flex items-center gap-2.5 mb-3">
              {s.icon}
              <h2 className="font-bold text-base">{s.title}</h2>
            </div>

            {/* Descrizione */}
            <p className="text-sm text-muted-foreground mb-3">{s.what}</p>

            {/* Formula */}
            {s.formula && (
              <div className="bg-muted rounded-lg px-4 py-2.5 mb-3 font-mono text-sm whitespace-pre-line">
                {s.formula}
              </div>
            )}

            {/* Dettagli */}
            <ul className="space-y-1.5 mb-3">
              {s.details.map((d, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground mt-1 shrink-0">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            {/* Esempio */}
            {s.example && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 text-sm mb-3">
                <span className="font-semibold">Esempio: </span>{s.example}
              </div>
            )}

            {/* Ranges */}
            {s.ranges && (
              <div className="grid gap-1.5">
                {s.ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="font-medium min-w-[130px]">{r.label}</span>
                    <span className="text-muted-foreground">{r.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* Footer nota */}
        <div className="text-center text-xs text-muted-foreground pb-8 pt-2">
          Le formule sono basate su letteratura scientifica consolidata (Bannister 1991, Tanaka 2001, Coggan/Allen).
          <br />I valori sono approssimazioni e non sostituiscono il parere di un medico sportivo.
        </div>
      </main>
    </div>
  );
}
