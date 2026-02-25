/**
 * capacitorGeo.ts
 *
 * Wrapper unificato per il GPS nativo + web.
 *
 * - App nativa (Capacitor / iOS / Android):
 *   Usa @capacitor/geolocation che chiama le API native del sistema.
 *   Su Android con foreground service configurato, continua in background.
 *   Su iOS con "Always" location permission, continua in background.
 *
 * - Browser (PWA / web):
 *   Ricade sul classico navigator.geolocation.watchPosition.
 *   Richiede Wake Lock per tenere lo schermo acceso.
 */

import { Capacitor } from '@capacitor/core';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number;
  heading: number | null;
}

export type GeoCallback = (position: GeoPosition) => void;
export type GeoErrorCallback = (error: string) => void;

let nativeWatchId: string | null = null;
let webWatchId: number | null = null;
let webTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Rileva se l'app è in esecuzione come app nativa Capacitor.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Avvia il tracciamento GPS.
 * - Su app nativa: usa @capacitor/geolocation (GPS nativo, background-capable)
 * - Su browser:    usa navigator.geolocation.watchPosition
 */
export async function startGeoTracking(
  onPosition: GeoCallback,
  onError: GeoErrorCallback
): Promise<void> {
  if (isNativeApp()) {
    await startNativeTracking(onPosition, onError);
  } else {
    startWebTracking(onPosition, onError);
  }
}

/**
 * Ferma il tracciamento GPS.
 */
export async function stopGeoTracking(): Promise<void> {
  if (isNativeApp()) {
    await stopNativeTracking();
  } else {
    stopWebTracking();
  }
}

// ─── Native (Capacitor) ──────────────────────────────────────────────────────

async function startNativeTracking(
  onPosition: GeoCallback,
  onError: GeoErrorCallback
): Promise<void> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');

    // Richiedi i permessi prima di iniziare
    const perm = await Geolocation.requestPermissions();
    if (perm.location === 'denied') {
      onError('Permesso GPS negato. Abilitalo nelle impostazioni del dispositivo.');
      return;
    }

    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 15000 },
      (position, err) => {
        if (err) {
          onError(`Errore GPS: ${err.message}`);
          return;
        }
        if (position) {
          onPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed ?? null,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? null,
          });
        }
      }
    );

    nativeWatchId = id;
  } catch (err) {
    onError(`Impossibile avviare GPS nativo: ${err}`);
  }
}

async function stopNativeTracking(): Promise<void> {
  if (!nativeWatchId) return;
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.clearWatch({ id: nativeWatchId });
    nativeWatchId = null;
  } catch {
    // ignora errori in fase di stop
  }
}

// ─── Web (browser) ───────────────────────────────────────────────────────────

function startWebTracking(
  onPosition: GeoCallback,
  onError: GeoErrorCallback
): void {
  if (!navigator.geolocation) {
    onError('Geolocalizzazione non supportata da questo browser.');
    return;
  }

  // Verifica che la pagina sia servita via HTTPS (richiesto per geolocation)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    onError('Il GPS richiede una connessione HTTPS. Assicurati che il sito sia servito via HTTPS.');
    return;
  }

  let receivedFirstPosition = false;

  // Timeout di sicurezza: se il GPS non risponde entro 20s, segnala errore
  webTimeoutId = setTimeout(() => {
    if (!receivedFirstPosition) {
      onError('Nessun segnale GPS ricevuto. Assicurati di aver autorizzato la geolocalizzazione e di essere all\'aperto.');
    }
    webTimeoutId = null;
  }, 20_000);

  const id = navigator.geolocation.watchPosition(
    ({ coords }) => {
      receivedFirstPosition = true;
      if (webTimeoutId) {
        clearTimeout(webTimeoutId);
        webTimeoutId = null;
      }
      onPosition({
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed,
        accuracy: coords.accuracy,
        heading: coords.heading,
      });
    },
    (err) => {
      if (webTimeoutId) {
        clearTimeout(webTimeoutId);
        webTimeoutId = null;
      }
      switch (err.code) {
        case err.PERMISSION_DENIED:
          onError('Permesso GPS negato. Abilitalo nelle impostazioni del browser.');
          break;
        case err.POSITION_UNAVAILABLE:
          onError('Posizione non disponibile. Verifica che il GPS sia attivo.');
          break;
        case err.TIMEOUT:
          onError('Timeout GPS. Riprova in un\'area con migliore copertura.');
          break;
        default:
          onError(`Errore GPS: ${err.message}`);
      }
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
  );
  webWatchId = id;
}

function stopWebTracking(): void {
  if (webTimeoutId) {
    clearTimeout(webTimeoutId);
    webTimeoutId = null;
  }
  if (webWatchId !== null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
}
