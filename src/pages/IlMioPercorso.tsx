/**
 * IlMioPercorso.tsx
 * ──────────────────
 * Dashboard personale della community:
 * - avvia/ferma il tracciamento GPS
 * - mostra velocità, distanza e tempo live
 * - condivide un post sui social
 * - gestisce logout
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Play, Square, LogOut, MapPin, Loader2, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import NativeLayout from "@/components/NativeLayout";
import ShareCard from "@/components/ShareCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured, clearAuthToken } from "@/lib/supabase";
import { startGeoTracking, stopGeoTracking } from "@/lib/capacitorGeo";
import { todaySessionId, distanceMeters } from "@/lib/liveTracking";
import {
  loadProfile,
  upsertCommunityLivePosition,
  setCommunityInactive,
  appendCommunityRoutePoint,
  ACTIVITY_EMOJI,
  ACTIVITY_LABEL,
  ACTIVITY_COLOR,
  type UserProfile,
  type ActivityType,
} from "@/lib/communityTracking";

// ─── Componente ──────────────────────────────────────────────────────────────

export default function IlMioPercorso() {
  const navigate = useNavigate();

  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tracking, setTracking] = useState(false);
  const [startingGps, setStartingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Statistiche live
  const [speed, setSpeed]       = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [kmTracked, setKmTracked] = useState(0);
  const [elapsed, setElapsed]   = useState(0);       // secondi
  const [pointsCount, setPointsCount] = useState(0);

  // Refs (non triggereranno re-render)
  const userRef       = useRef<{ id: string } | null>(null);
  const lastPointRef  = useRef<[number, number] | null>(null);
  const lastTimeRef   = useRef<number>(0);
  const sessionIdRef  = useRef<string>("");
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const shareableKm   = useRef(0);

  // ── Verifica autenticazione ──
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      if (!user) {
        navigate("/partecipa");
        return;
      }
      userRef.current = { id: user.id };
      const prof = await loadProfile(user.id);
      setProfile(prof);
      setAuthLoading(false);
    });
  }, [navigate]);

  // ── Cleanup al dismount ──
  useEffect(() => {
    return () => {
      if (tracking) stopTracking();
    };
  }, [tracking]);

  // ── Avvia tracciamento ──
  async function startTracking() {
    if (!userRef.current || !profile) return;
    setGpsError(null);
    setStartingGps(true);
    sessionIdRef.current = todaySessionId();
    lastPointRef.current = null;
    lastTimeRef.current  = 0;
    setKmTracked(0);
    setPointsCount(0);
    setElapsed(0);

    let gotFirstFix = false;

    await startGeoTracking(
      async ({ latitude, longitude, speed: spd, accuracy: acc, heading }) => {
        // Alla prima posizione GPS valida: avvia il timer e imposta lo stato "in diretta"
        if (!gotFirstFix) {
          gotFirstFix = true;
          setStartingGps(false);
          setTracking(true);
          timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        }

        setSpeed(spd);
        setAccuracy(acc);

        // Upsert posizione live
        const liveErr = await upsertCommunityLivePosition(
          userRef.current!.id,
          profile.display_name,
          profile.activity_type as ActivityType,
          { lat: latitude, lng: longitude, speed: spd, accuracy: acc, heading, is_active: true },
        );
        if (liveErr) {
          toast.error("Errore invio posizione", { description: liveErr });
        }

        // Filtra: registra punto ogni 30m oppure ogni 60s
        const now   = Date.now();
        const moved = lastPointRef.current
          ? distanceMeters(lastPointRef.current, [latitude, longitude])
          : Infinity;
        const timeOk = now - lastTimeRef.current >= 60_000;

        if (moved >= 30 || timeOk) {
          const routeErr = await appendCommunityRoutePoint(
            userRef.current!.id,
            profile.display_name,
            profile.activity_type as ActivityType,
            latitude, longitude, spd, acc, heading,
            sessionIdRef.current,
          );
          if (routeErr) {
            toast.error("Errore salvataggio traccia", { description: routeErr });
          }

          if (lastPointRef.current) {
            const addedKm = distanceMeters(lastPointRef.current, [latitude, longitude]) / 1000;
            setKmTracked(prev => {
              const next = prev + addedKm;
              shareableKm.current = next;
              return next;
            });
          }

          lastPointRef.current = [latitude, longitude];
          lastTimeRef.current  = now;
          setPointsCount(p => p + 1);
        }
      },
      (err) => {
        setGpsError(err);
        // Se il GPS fallisce prima della prima posizione, ferma tutto
        if (!gotFirstFix) {
          setStartingGps(false);
          setTracking(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      },
    );
  }

  // ── Ferma tracciamento ──
  async function stopTracking() {
    stopGeoTracking();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (userRef.current) {
      await setCommunityInactive(userRef.current.id);
    }
    setTracking(false);
    setSpeed(null);
    setAccuracy(null);
  }

  // ── Logout ──
  async function handleLogout() {
    if (tracking) await stopTracking();
    clearAuthToken();
    navigate("/partecipa");
  }

  // ── Formatta tempo ──
  function formatElapsed(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <NativeLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-dona" />
        </div>
      </NativeLayout>
    );
  }

  if (!profile) {
    return (
      <NativeLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-muted-foreground font-body text-sm mb-4">
              Profilo non trovato.
            </p>
            <Button variant="dona" onClick={() => navigate("/partecipa")}>
              Vai alla registrazione
            </Button>
          </div>
        </div>
      </NativeLayout>
    );
  }

  const actType = profile.activity_type as ActivityType;
  const color   = ACTIVITY_COLOR[actType];
  const emoji   = ACTIVITY_EMOJI[actType];
  const label   = ACTIVITY_LABEL[actType];

  return (
    <NativeLayout>
      <section className="min-h-[85vh] px-4 py-10 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Header profilo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-md"
                style={{ background: `${color}22`, border: `2px solid ${color}` }}
              >
                {emoji}
              </div>
              <div>
                <p className="font-heading font-bold text-foreground leading-tight">
                  {profile.display_name}
                </p>
                <p className="text-xs font-body text-muted-foreground">
                  {label}{profile.city ? ` · ${profile.city}` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>

          {/* Card statistiche live */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {kmTracked.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">km</p>
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {formatElapsed(elapsed)}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">tempo</p>
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {speed != null ? (speed * 3.6).toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">km/h</p>
              </div>
            </div>

            {/* Info GPS */}
            {tracking && (
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-body">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {accuracy != null ? `±${Math.round(accuracy)} m` : "in attesa GPS…"}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {pointsCount} punti registrati
                </span>
              </div>
            )}
          </div>

          {/* Stato badge */}
          {tracking && (
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-xs font-body font-semibold text-green-600 uppercase tracking-widest">
                In diretta sulla mappa
              </span>
            </div>
          )}

          {/* Errore GPS */}
          {gpsError && (
            <div className="bg-destructive/10 rounded-lg px-4 py-3 text-xs text-destructive font-body">
              {gpsError}
            </div>
          )}

          {/* Bottone principale avvia/ferma */}
          {startingGps ? (
            <Button
              variant="dona"
              size="lg"
              className="w-full text-base py-7"
              disabled
            >
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Ricerca segnale GPS…
            </Button>
          ) : !tracking ? (
            <Button
              variant="dona"
              size="lg"
              className="w-full text-base py-7"
              onClick={startTracking}
            >
              <Play className="w-5 h-5 mr-2" />
              Avvia {label.toLowerCase()}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full text-base py-7 bg-destructive hover:bg-destructive/90 text-white"
              onClick={stopTracking}
            >
              <Square className="w-5 h-5 mr-2" />
              Ferma e salva
            </Button>
          )}

          {/* Card condivisione social */}
          <ShareCard
            activityType={actType}
            displayName={profile.display_name}
            kmTracked={kmTracked}
            elapsed={elapsed}
          />

          {/* Info mappa */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-4 text-xs font-body text-muted-foreground leading-relaxed">
            <p className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-dona flex-shrink-0 mt-0.5" />
              Mentre sei attivo, apparirai sulla mappa di{" "}
              <strong className="text-foreground">1000kmdigratitudine.it</strong>{" "}
              con il tuo nome e la tua attività. Gli altri potranno seguirti in diretta!
            </p>
          </div>
        </motion.div>
      </section>
    </NativeLayout>
  );
}
