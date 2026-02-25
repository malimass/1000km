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

  webWatchId = navigator.geolocation.watchPosition(
    ({ coords }) => {
      onPosition({
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed,
        accuracy: coords.accuracy,
        heading: coords.heading,
      });
    },
    (err) => onError(`Errore GPS: ${err.message}`),
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
  );
}

function stopWebTracking(): void {
  if (webWatchId !== null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
}
