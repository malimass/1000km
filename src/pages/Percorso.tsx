import { lazy, Suspense, useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getLtwUrl, setLtwUrl } from "@/lib/ltwStore";
import { Heart, MapPin, Radio, Navigation, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import percorsoHero from "@/assets/percorso-hero.jpg";
import { motion } from "framer-motion";
import { tappe } from "@/lib/tappe";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { loadLivePosition, subscribeLivePosition, type LivePosition } from "@/lib/liveTracking";

// Caricamento lazy per evitare problemi SSR con Leaflet
const RouteMap = lazy(() => import("@/components/RouteMap"));

// Fallback usato solo se non è stato salvato nulla tramite /admin-live
const LOCATOWEB_FALLBACK = "";

const CAMMINO_START = new Date("2026-04-18T06:00:00");
const CAMMINO_END   = new Date("2026-05-01T23:59:00");

function LiveTrackingSection({
  ltwUrl,
  livePos,
}: {
  ltwUrl: string;
  livePos: LivePosition | null;
}) {
  const now = new Date();
  const isLive   = now >= CAMMINO_START && now <= CAMMINO_END;
  const isFuture = now < CAMMINO_START;

  // GPS attivo ha priorità su LocaToWeb
  const gpsActive = livePos?.is_active === true;

  // Mostra indicatore live solo se GPS o LTW attivi
  const showLiveBadge = isLive && (gpsActive || !!ltwUrl);

  return (
    <section className="section-padding bg-primary text-primary-foreground">
      <div className="container-narrow">
        <AnimatedSection>
          <div className="flex items-center justify-center gap-3 mb-4">
            {showLiveBadge ? (
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
            <div className="mt-6">
              {gpsActive ? (
                // ── GPS diretto attivo ──────────────────────────────────────
                <>
                  <p className="text-center text-primary-foreground/70 font-body mb-2">
                    Segui la posizione live aggiornata direttamente dal telefono.
                  </p>
                  <p className="text-center text-primary-foreground/40 text-xs font-body mb-6">
                    {livePos?.speed != null
                      ? `${(livePos.speed * 3.6).toFixed(1)} km/h · `
                      : ""}
                    {livePos?.accuracy != null
                      ? `precisione ±${Math.round(livePos.accuracy)} m · `
                      : ""}
                    La mappa si aggiorna in tempo reale
                  </p>
                  {/* Il marker blu è già visibile nel RouteMap della sezione sopra */}
                  <div className="flex items-center justify-center gap-2 text-sm text-primary-foreground/60 font-body">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-300/40 animate-pulse" />
                    Il punto blu nella mappa indica la posizione attuale
                  </div>
                </>
              ) : ltwUrl ? (
                // ── LocaToWeb fallback ──────────────────────────────────────
                <>
                  <p className="text-center text-primary-foreground/70 font-body mb-6">
                    Segui ogni passo in tempo reale.
                  </p>
                  <div className="rounded-xl overflow-hidden shadow-2xl border border-primary-foreground/10" style={{ height: 480 }}>
                    <iframe
                      src={ltwUrl}
                      title="Posizione live"
                      className="w-full h-full border-0"
                      allow="geolocation"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-center mt-4 text-primary-foreground/40 text-xs font-body">
                    Powered by LocaToWeb · aggiornamento automatico
                  </p>
                </>
              ) : (
                <p className="text-center text-primary-foreground/50 font-body text-sm mt-4">
                  Il tracking non è ancora stato attivato.
                </p>
              )}
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

  // Contatori iscritti per tappa (chiave = tappa_numero 1-14)
  const [iscritti, setIscritti] = useState<Record<number, number>>({});

  // Posizione GPS live
  const [livePos, setLivePos] = useState<LivePosition | null>(null);

  // URL LocaToWeb: legge prima dal query param ?ltw=, poi da localStorage, poi fallback vuoto
  const [searchParams] = useSearchParams();
  const [ltwUrl, setLtwUrlState] = useState<string>(() => {
    const fromParam = searchParams.get("ltw");
    return fromParam || getLtwUrl() || LOCATOWEB_FALLBACK;
  });

  // Se arriva da ?ltw= salva in localStorage per usi futuri
  useEffect(() => {
    const fromParam = searchParams.get("ltw");
    if (fromParam) {
      setLtwUrl(fromParam);
      setLtwUrlState(fromParam);
    }
  }, [searchParams]);

  // Carica contatori iscritti da Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase!
      .rpc("get_iscritti_per_tappa")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, number> = {};
        (data as { tappa_numero: number; totale: number }[]).forEach(
          (row) => { map[row.tappa_numero] = Number(row.totale); }
        );
        setIscritti(map);
      });
  }, []);

  // Carica posizione live iniziale + sottoscrizione Realtime
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadLivePosition().then(pos => { if (pos) setLivePos(pos); });
    return subscribeLivePosition(setLivePos);
  }, []);

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
                <RouteMap selectedIndex={selectedWaypoint} iscritti={iscritti} livePos={livePos} />
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

      {/* Timeline tappe */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
              Le 14 tappe
            </h2>
            <p className="text-center text-muted-foreground font-body text-sm mb-8">
              Clicca sulla tappa per vederla sulla mappa · premi <strong>Iscriviti</strong> per partecipare
            </p>
          </AnimatedSection>
          <div className="space-y-4 max-w-3xl mx-auto">
            {tappe.map((t, i) => {
              // waypoint i+1 è la destinazione della tappa i
              const wpIndex = i + 1;
              const isSelected = selectedWaypoint === wpIndex;
              const numIscritti = iscritti[t.giorno] ?? 0;
              return (
                <AnimatedSection key={t.giorno} delay={i * 0.05}>
                  <div
                    className={`w-full flex items-center gap-3 bg-card rounded-lg p-4 shadow-sm border transition-all
                      ${isSelected
                        ? "border-dona ring-2 ring-dona/30 shadow-md"
                        : "border-border hover:shadow-md hover:border-dona/50"
                      }`}
                  >
                    {/* Area cliccabile per centrare la mappa */}
                    <button
                      type="button"
                      onClick={() => handleTappaClick(wpIndex)}
                      className="flex items-start gap-3 flex-1 text-left min-w-0"
                    >
                      <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-heading font-bold text-base transition-colors
                        ${isSelected ? "bg-dona text-white" : "bg-dona/10 text-dona"}`}>
                        {t.giorno}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-semibold text-foreground text-sm leading-snug truncate">
                          {t.da} → {t.a}
                        </div>
                        <div className="text-muted-foreground text-xs font-body mt-0.5">
                          {t.data} · {t.km} km
                        </div>
                        {numIscritti > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-dona" />
                            <span className="text-dona text-xs font-body font-medium">
                              {numIscritti} iscritti
                            </span>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Azioni destra */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <MapPin className={`w-4 h-4 transition-colors ${isSelected ? "text-dona" : "text-muted-foreground/30"}`} />
                      <Link to={`/iscriviti?tappa=${t.giorno}`}>
                        <Button
                          size="sm"
                          className="text-xs h-8 px-3 bg-dona hover:bg-dona/90 text-white"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Iscriviti
                        </Button>
                      </Link>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sezione live tracking */}
      <LiveTrackingSection ltwUrl={ltwUrl} livePos={livePos} />

      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
