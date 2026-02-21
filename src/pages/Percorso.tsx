import { lazy, Suspense, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Radio, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import percorsoHero from "@/assets/percorso-hero.jpg";
import { motion } from "framer-motion";

// Caricamento lazy per evitare problemi SSR con Leaflet
const RouteMap = lazy(() => import("@/components/RouteMap"));

// ─── AGGIORNA QUESTO LINK con il tuo URL di LocaToWeb ────────────────────────
// Esempio: "https://locatoweb.com/map/tuonomeutente"
const LOCATOWEB_URL = "https://locatoweb.com/map/INSERISCI_IL_TUO_LINK";
// ─────────────────────────────────────────────────────────────────────────────

const CAMMINO_START = new Date("2026-04-18T06:00:00");
const CAMMINO_END   = new Date("2026-05-01T23:59:00");

const tappe = [
  { giorno: 1,  da: "Bologna",              a: "Faenza",                   km: 55,  data: "18 aprile" },
  { giorno: 2,  da: "Faenza",               a: "Rimini",                   km: 70,  data: "19 aprile" },
  { giorno: 3,  da: "Rimini",               a: "Ancona",                   km: 90,  data: "20 aprile" },
  { giorno: 4,  da: "Ancona",               a: "Porto San Giorgio",        km: 65,  data: "21 aprile" },
  { giorno: 5,  da: "Porto San Giorgio",    a: "Pescara",                  km: 85,  data: "22 aprile" },
  { giorno: 6,  da: "Pescara",              a: "Vasto",                    km: 75,  data: "23 aprile" },
  { giorno: 7,  da: "Vasto",               a: "Campobasso",                km: 90,  data: "24 aprile" },
  { giorno: 8,  da: "Campobasso",           a: "Avellino",                 km: 90,  data: "25 aprile" },
  { giorno: 9,  da: "Avellino",             a: "Sala Consilina",           km: 70,  data: "26 aprile" },
  { giorno: 10, da: "Sala Consilina",       a: "Scalea",                   km: 85,  data: "27 aprile" },
  { giorno: 11, da: "Scalea",               a: "Paola",                    km: 55,  data: "28 aprile" },
  { giorno: 12, da: "Paola",                a: "Pizzo Calabro",            km: 65,  data: "29 aprile" },
  { giorno: 13, da: "Pizzo Calabro",        a: "Rosarno",                  km: 65,  data: "30 aprile" },
  { giorno: 14, da: "Rosarno",              a: "Terranova Sappo Minulio",  km: 40,  data: "1 maggio"  },
];

function LiveTrackingSection() {
  const now = new Date();
  const isLive = now >= CAMMINO_START && now <= CAMMINO_END;
  const isFuture = now < CAMMINO_START;

  return (
    <section className="section-padding bg-primary text-primary-foreground">
      <div className="container-narrow">
        <AnimatedSection>
          <div className="flex items-center justify-center gap-3 mb-4">
            {isLive ? (
              <span className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="font-body text-xs uppercase tracking-widest text-red-400 font-bold">In diretta</span>
              </span>
            ) : (
              <Navigation className="w-8 h-8 text-dona" />
            )}
          </div>

          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-4">
            {isLive ? "Posizione in tempo reale" : "Segui in diretta"}
          </h2>

          {isLive ? (
            // ── Cammino in corso: mostra la mappa live di LocaToWeb ──
            <div className="mt-6">
              <p className="text-center text-primary-foreground/70 font-body mb-6">
                Segui ogni passo in tempo reale grazie a LocaToWeb.
              </p>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-primary-foreground/10" style={{ height: 480 }}>
                <iframe
                  src={LOCATOWEB_URL}
                  title="Posizione live"
                  className="w-full h-full border-0"
                  allow="geolocation"
                  loading="lazy"
                />
              </div>
              <p className="text-center mt-4 text-primary-foreground/40 text-xs font-body">
                Powered by LocaToWeb · aggiornamento automatico
              </p>
            </div>
          ) : isFuture ? (
            // ── Prima del cammino ──
            <div className="text-center mt-6">
              <p className="font-body text-primary-foreground/70 mb-8 max-w-xl mx-auto">
                Dal <strong className="text-accent">18 aprile</strong> al <strong className="text-accent">1 maggio 2026</strong>{" "}
                potrai seguire ogni tappa in tempo reale direttamente qui, con aggiornamento live della posizione.
              </p>
              <Button asChild variant="dona" size="lg">
                <Link to="/dona">
                  <Heart className="w-4 h-4 mr-2" />
                  DONA ORA
                </Link>
              </Button>
            </div>
          ) : (
            // ── Dopo il cammino ──
            <div className="text-center mt-6">
              <p className="font-body text-primary-foreground/70 mb-8 max-w-xl mx-auto">
                Il cammino si è concluso il 1 maggio 2026. Grazie a tutti coloro che hanno seguito e donato!
              </p>
              <Button asChild variant="dona" size="lg">
                <Link to="/dona">
                  <Heart className="w-4 h-4 mr-2" />
                  Vedi i risultati della raccolta
                </Link>
              </Button>
            </div>
          )}
        </AnimatedSection>
      </div>
    </section>
  );
}

export default function Percorso() {
  // Indice del waypoint selezionato (tappa i → waypoint i+1, cioè la destinazione)
  const [selectedWaypoint, setSelectedWaypoint] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  function handleTappaClick(waypointIndex: number) {
    setSelectedWaypoint(waypointIndex);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <img
          src={percorsoHero}
          alt="Percorso aereo campagna italiana"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-heading text-4xl md:text-5xl font-bold text-primary-foreground mb-4"
          >
            Il Percorso
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-body text-primary-foreground/80 text-lg"
          >
            1000 km · Via Emilia → Costa Adriatica → SS18 Tirrenica → Calabria
          </motion.p>
        </div>
      </section>

      {/* Mappa interattiva */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
              Mappa del percorso
            </h2>
            <p className="text-center text-muted-foreground font-body text-sm mb-8">
              Clicca su una tappa per centrarla nella mappa
            </p>
            <div ref={mapRef}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center rounded-xl bg-card border border-border" style={{ height: 480 }}>
                    <div className="text-center">
                      <MapPin className="w-10 h-10 text-dona mx-auto mb-3 animate-bounce" />
                      <p className="text-muted-foreground font-body text-sm">Caricamento mappa…</p>
                    </div>
                  </div>
                }
              >
                <RouteMap selectedIndex={selectedWaypoint} />
              </Suspense>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm font-body text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
                Partenza — Bologna
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400 border-2 border-white shadow" />
                Tappe intermedie
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow" />
                Arrivo — Terranova Sappo Minulio
              </span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Timeline tappe — cliccabili */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
              Le 14 tappe
            </h2>
            <p className="text-center text-muted-foreground font-body text-sm mb-8">
              Clicca per vedere la tappa sulla mappa
            </p>
          </AnimatedSection>
          <div className="space-y-4 max-w-3xl mx-auto">
            {tappe.map((t, i) => {
              // waypoint i+1 è la destinazione della tappa i
              const wpIndex = i + 1;
              const isSelected = selectedWaypoint === wpIndex;
              return (
                <AnimatedSection key={t.giorno} delay={i * 0.05}>
                  <button
                    onClick={() => handleTappaClick(wpIndex)}
                    className={`w-full flex items-start gap-4 bg-card rounded-lg p-4 shadow-sm border transition-all text-left cursor-pointer
                      ${isSelected
                        ? "border-dona ring-2 ring-dona/30 shadow-md"
                        : "border-border hover:shadow-md hover:border-dona/50"
                      }`}
                  >
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-heading font-bold text-lg transition-colors
                      ${isSelected ? "bg-dona text-white" : "bg-dona/10 text-dona"}`}>
                      {t.giorno}
                    </div>
                    <div className="flex-1">
                      <div className="font-body font-semibold text-foreground">
                        {t.da} → {t.a}
                      </div>
                      <div className="text-muted-foreground text-sm font-body">
                        {t.data} · {t.km} km
                      </div>
                    </div>
                    <MapPin className={`w-4 h-4 mt-1 flex-shrink-0 transition-colors ${isSelected ? "text-dona" : "text-muted-foreground/40"}`} />
                  </button>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sezione live tracking */}
      <LiveTrackingSection />

      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
