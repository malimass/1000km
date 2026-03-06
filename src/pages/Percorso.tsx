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
import {
  loadAllLivePositions, subscribeLivePosition, type LivePosition,
  loadRoutePositions, subscribeRoutePositions, todaySessionId,
} from "@/lib/liveTracking";
import {
  loadActiveCommunityPositions,
  subscribeCommunityLivePosition,
  loadCommunityRoutePositions,
  subscribeCommunityRoutePositions,
  COMMUNITY_STALE_MS,
  type CommunityLivePosition,
  type ActivityType,
} from "@/lib/communityTracking";

// Caricamento lazy per evitare problemi SSR con Leaflet
const RouteMap = lazy(() => import("@/components/RouteMap"));
const ElevationProfile = lazy(() => import("@/components/ElevationProfile"));
const RouteMap3D = lazy(() => import("@/components/RouteMap3D"));

// Fallback usato solo se non è stato salvato nulla tramite /admin-live
const LOCATOWEB_FALLBACK = "";

const CAMMINO_START = new Date("2026-04-15T06:00:00");
const CAMMINO_END   = new Date("2026-05-01T18:00:00");

function LiveTrackingSection({
  ltwUrl,
  livePos1,
  livePos2,
}: {
  ltwUrl: string;
  livePos1: LivePosition | null;
  livePos2: LivePosition | null;
}) {
  const now = new Date();
  const isLive   = now >= CAMMINO_START && now <= CAMMINO_END;
  const isFuture = now < CAMMINO_START;

  // GPS attivo ha priorità su LocaToWeb
  const gpsActive = livePos1?.is_active === true || livePos2?.is_active === true;

  // Se GPS è attivo mostra sempre la live, anche fuori dalle date dell'evento
  const showLiveContent = isLive || gpsActive;

  // Mostra indicatore live se GPS attivo oppure siamo nel periodo + LTW attivo
  const showLiveBadge = gpsActive || (isLive && !!ltwUrl);

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
            {showLiveContent ? "Posizione in tempo reale" : "Segui in diretta"}
          </h2>

          {showLiveContent ? (
            <div className="mt-6">
              {gpsActive ? (
                // ── GPS diretto attivo ──────────────────────────────────────
                <>
                  <p className="text-center text-primary-foreground/70 font-body mb-2">
                    Segui la posizione live aggiornata direttamente dal telefono.
                  </p>
                  <div className="flex items-center justify-center gap-6 text-xs text-primary-foreground/50 font-body mb-6">
                    {livePos1?.is_active && (
                      <span>🏃‍♂️ {livePos1.speed != null ? `${(livePos1.speed * 3.6).toFixed(1)} km/h` : "—"}</span>
                    )}
                    {livePos2?.is_active && (
                      <span>🏃‍♀️ {livePos2.speed != null ? `${(livePos2.speed * 3.6).toFixed(1)} km/h` : "—"}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-primary-foreground/60 font-body">
                    <span className="text-base">🏃‍♂️🏃‍♀️</span>
                    I corridori nella mappa indicano le posizioni in tempo reale
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
                Dal <strong className="text-accent">15 aprile</strong> al <strong className="text-accent">1 maggio 2026</strong>{" "}
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
                Il cammino si è concluso il 1 maggio 2026 nel pomeriggio. Grazie a tutti coloro che hanno seguito e donato!
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
  const [mapView, setMapView] = useState<"2d" | "3d">("2d");
  const mapRef = useRef<HTMLDivElement>(null);

  // Tappe salvate dall'admin via PercorsoBuilder (sovrascrivono quelle hardcoded)
  const [savedTappe, setSavedTappe] = useState<{ tappaNum: number; lat: number; lng: number; kmProgr: number; label: string }[] | null>(null);
  const [savedCoords, setSavedCoords] = useState<[number, number][] | null>(null);
  const [savedElevation, setSavedElevation] = useState<{
    points: { lat: number; lng: number; elevation: number; resolution: number }[];
    stats: { minElevation: number; maxElevation: number; totalGainM: number; totalLossM: number };
  } | null>(null);
  const [savedDistanceM, setSavedDistanceM] = useState<number | null>(null);

  // Contatori iscritti per tappa (chiave = tappa_numero 1-14)
  const [iscritti, setIscritti] = useState<Record<number, number>>({});

  // Posizioni GPS live (corridore 1 e 2)
  const [livePos1, setLivePos1] = useState<LivePosition | null>(null);
  const [livePos2, setLivePos2] = useState<LivePosition | null>(null);

  // Tracce percorse (corridore 1 e 2)
  const [traveledRoute1, setTraveledRoute1] = useState<[number, number][]>([]);
  const [traveledRoute2, setTraveledRoute2] = useState<[number, number][]>([]);

  // Posizioni live community
  const [communityPositions, setCommunityPositions] = useState<CommunityLivePosition[]>([]);

  // Tracce percorse community: user_id → { points, activityType }
  const [communityRoutes, setCommunityRoutes] = useState<
    Record<string, { points: [number, number][]; activityType: ActivityType }>
  >({});

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

  // Carica percorso salvato dall'admin
  useEffect(() => {
    fetch("/api/percorso-config")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.tappe?.length) setSavedTappe(data.tappe);
        if (data?.coords?.length) setSavedCoords(data.coords);
        if (data?.elevation) setSavedElevation(data.elevation);
        if (data?.distanceM) setSavedDistanceM(data.distanceM);
      })
      .catch(() => {});
  }, []);

  // Carica posizioni live iniziali (entrambi i corridori) + polling
  useEffect(() => {
    loadAllLivePositions().then(({ 1: p1, 2: p2 }) => {
      if (p1) setLivePos1(p1);
      if (p2) setLivePos2(p2);
    });
    return subscribeLivePosition((id, pos) => {
      if (id === 1) setLivePos1(pos);
      else          setLivePos2(pos);
    });
  }, []);

  // Carica tracce percorse (corridore 1) + polling
  useEffect(() => {
    loadRoutePositions([todaySessionId()], 1).then(pts =>
      setTraveledRoute1(pts.map(p => [p.lat, p.lng] as [number, number]))
    );
    return subscribeRoutePositions(
      pt => setTraveledRoute1(prev => [...prev, [pt.lat, pt.lng]]),
      1,
    );
  }, []);

  // Carica tracce percorse (corridore 2) + polling
  useEffect(() => {
    loadRoutePositions([todaySessionId()], 2).then(pts =>
      setTraveledRoute2(pts.map(p => [p.lat, p.lng] as [number, number]))
    );
    return subscribeRoutePositions(
      pt => setTraveledRoute2(prev => [...prev, [pt.lat, pt.lng]]),
      2,
    );
  }, []);

  // Carica posizioni live community + polling
  useEffect(() => {
    loadActiveCommunityPositions().then(setCommunityPositions);
    return subscribeCommunityLivePosition((updated) => {
      setCommunityPositions(prev => {
        const others = prev.filter(p => p.user_id !== updated.user_id);
        if (!updated.is_active) return others;
        return [...others, updated];
      });
    });
  }, []);

  // Rimuove ogni minuto le posizioni community diventate stale (is_active rimasto true per crash/chiusura browser)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = new Date(Date.now() - COMMUNITY_STALE_MS).toISOString();
      setCommunityPositions(prev => prev.filter(p => p.updated_at >= cutoff));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Carica tracce community di oggi + polling
  useEffect(() => {
    loadCommunityRoutePositions([todaySessionId()]).then(pts => {
      const routes: Record<string, { points: [number, number][]; activityType: ActivityType }> = {};
      pts.forEach(pt => {
        if (!routes[pt.user_id]) {
          routes[pt.user_id] = { points: [], activityType: pt.activity_type };
        }
        routes[pt.user_id].points.push([pt.lat, pt.lng]);
      });
      setCommunityRoutes(routes);
    });
    return subscribeCommunityRoutePositions(pt => {
      setCommunityRoutes(prev => ({
        ...prev,
        [pt.user_id]: {
          points: [...(prev[pt.user_id]?.points ?? []), [pt.lat, pt.lng]],
          activityType: pt.activity_type,
        },
      }));
    });
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
            <p className="text-center text-muted-foreground font-body text-sm mb-4">
              Clicca su una tappa per centrarla nella mappa
            </p>

            {/* Toggle 2D / 3D */}
            {savedCoords && savedCoords.length > 0 && (
              <div className="flex gap-2 mb-4 max-w-xs mx-auto">
                <button
                  onClick={() => setMapView("2d")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${mapView === "2d" ? "bg-dona text-white border-dona" : "bg-card text-muted-foreground border-border hover:border-dona/50"}`}
                >
                  <MapPin className="w-3.5 h-3.5 inline mr-1" /> Mappa 2D
                </button>
                <button
                  onClick={() => setMapView("3d")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${mapView === "3d" ? "bg-dona text-white border-dona" : "bg-card text-muted-foreground border-border hover:border-dona/50"}`}
                >
                  🏔️ Vista 3D
                </button>
              </div>
            )}

            <div ref={mapRef}>
              {mapView === "3d" && savedCoords ? (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center rounded-xl bg-card border border-border" style={{ height: 480 }}>
                      <MapPin className="w-10 h-10 text-dona mx-auto mb-3 animate-bounce" />
                    </div>
                  }
                >
                  <RouteMap3D
                    coords={savedCoords}
                    waypoints={savedTappe?.map(t => ({ lat: t.lat, lng: t.lng, label: t.label }))}
                    elevationPoints={savedElevation?.points}
                  />
                </Suspense>
              ) : (
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
                <RouteMap
                  selectedIndex={selectedWaypoint}
                  iscritti={iscritti}
                  livePos={livePos1}
                  livePos2={livePos2}
                  traveledRoute={traveledRoute1}
                  traveledRoute2={traveledRoute2}
                  communityPositions={communityPositions}
                  communityRoutes={communityRoutes}
                  publishedTappe={savedTappe}
                  publishedCoords={savedCoords}
                />
              </Suspense>
              )}
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs sm:text-sm font-body text-muted-foreground">
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
              {traveledRoute1.length > 1 && (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-6 h-1 rounded bg-green-600 opacity-90" />
                  🏃‍♂️ Massimo
                </span>
              )}
              {traveledRoute2.length > 1 && (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-6 h-1 rounded bg-orange-500 opacity-90" />
                  🏃‍♂️ Nunzio
                </span>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Profilo altimetrico */}
      {savedElevation && (
        <section className="section-padding bg-background">
          <div className="container-narrow">
            <AnimatedSection>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
                Profilo altimetrico
              </h2>
              <p className="text-center text-muted-foreground font-body text-sm mb-6">
                Altitudine, dislivello e tipo di terreno lungo il percorso
              </p>
              <Suspense fallback={null}>
                <ElevationProfile
                  points={savedElevation.points}
                  stats={savedElevation.stats}
                  totalDistanceKm={(savedDistanceM ?? 1000000) / 1000}
                />
              </Suspense>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* Timeline tappe */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
              Le {savedTappe ? savedTappe.filter(t => t.tappaNum > 0).length : 14} tappe
            </h2>
            <p className="text-center text-muted-foreground font-body text-sm mb-8">
              Clicca sulla tappa per vederla sulla mappa · premi <strong>Partecipa</strong> per iscriverti
            </p>
          </AnimatedSection>
          <div className="space-y-4 max-w-3xl mx-auto">
            {savedTappe ? (
              /* Tappe calcolate dall'admin via PercorsoBuilder */
              savedTappe.filter(t => t.tappaNum > 0).map((t, i) => {
                const isSelected = selectedWaypoint === t.tappaNum;
                const numIscritti = iscritti[t.tappaNum] ?? 0;
                return (
                  <AnimatedSection key={`${t.tappaNum}-${t.lat}`} delay={i * 0.05}>
                    <div
                      className={`w-full flex items-center gap-2 sm:gap-3 bg-card rounded-lg p-3 sm:p-4 shadow-sm border transition-all
                        ${isSelected
                          ? "border-dona ring-2 ring-dona/30 shadow-md"
                          : "border-border hover:shadow-md hover:border-dona/50"
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleTappaClick(t.tappaNum)}
                        className="flex items-start gap-3 flex-1 text-left min-w-0"
                      >
                        <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-heading font-bold text-base transition-colors
                          ${isSelected ? "bg-dona text-white" : "bg-dona/10 text-dona"}`}>
                          {t.tappaNum}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-body font-semibold text-foreground text-sm leading-snug">
                            {t.label}
                          </div>
                          <div className="text-muted-foreground text-xs font-body mt-0.5">
                            km {t.kmProgr.toFixed(1)}
                          </div>
                          {numIscritti > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3 text-dona" />
                              <span className="text-dona text-xs font-body font-medium">{numIscritti} iscritti</span>
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <MapPin className={`w-4 h-4 transition-colors hidden sm:block ${isSelected ? "text-dona" : "text-muted-foreground/30"}`} />
                        <Link to={`/iscriviti?tappa=${t.tappaNum}`}>
                          <Button size="sm" className="text-xs h-8 px-2 sm:px-3 bg-dona hover:bg-dona/90 text-white">
                            <UserPlus className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Partecipa</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })
            ) : (
              /* Tappe hardcoded di fallback */
              tappe.map((t, i) => {
                const wpIndex = i + 1;
                const isSelected = selectedWaypoint === wpIndex;
                const numIscritti = iscritti[t.giorno] ?? 0;
                return (
                  <AnimatedSection key={t.giorno} delay={i * 0.05}>
                    <div
                      className={`w-full flex items-center gap-2 sm:gap-3 bg-card rounded-lg p-3 sm:p-4 shadow-sm border transition-all
                        ${isSelected
                          ? "border-dona ring-2 ring-dona/30 shadow-md"
                          : "border-border hover:shadow-md hover:border-dona/50"
                        }`}
                    >
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
                              <span className="text-dona text-xs font-body font-medium">{numIscritti} iscritti</span>
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <MapPin className={`w-4 h-4 transition-colors hidden sm:block ${isSelected ? "text-dona" : "text-muted-foreground/30"}`} />
                        <Link to={`/iscriviti?tappa=${t.giorno}`}>
                          <Button size="sm" className="text-xs h-8 px-2 sm:px-3 bg-dona hover:bg-dona/90 text-white">
                            <UserPlus className="w-3.5 h-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">Partecipa</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </AnimatedSection>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Contatore community attivi */}
      {communityPositions.length > 0 && (
        <section className="py-4 bg-secondary">
          <div className="container-narrow text-center">
            <p className="font-body text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{communityPositions.length}</span>{" "}
              {communityPositions.length === 1 ? "persona sta" : "persone stanno"} camminando / correndo / partecipando
              in questo momento per <span className="text-dona font-semibold">#1000kmdiGratitudine</span>
            </p>
          </div>
        </section>
      )}

      {/* Sezione live tracking */}
      <LiveTrackingSection ltwUrl={ltwUrl} livePos1={livePos1} livePos2={livePos2} />

      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
