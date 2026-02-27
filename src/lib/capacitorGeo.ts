/**
 * capacitorGeo.ts
 *
 * Wrapper unificato per il GPS nativo (background) + web (foreground).
 *
 * - App nativa (Capacitor / iOS / Android):
 *   Usa @capacitor-community/background-geolocation.
 *   Su Android mostra una notifica persistente e continua con lo schermo spento.
 *   Su iOS usa il background mode "location" (Info.plist già configurato).
 *
 * - Browser (PWA / web):
 *   Usa navigator.geolocation.watchPosition.
 *   Non può andare in background: la Wake Lock mantiene lo schermo acceso.
 */

import { Capacitor } from '@capacitor/core';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number;
  heading: number | null;
}

export type GeoCallback      = (position: GeoPosition) => void;
export type GeoErrorCallback = (error: string) => void;

let bgWatcherId:   string | null = null;   // @capacitor-community/background-geolocation
let webWatchId:    number | null = null;   // navigator.geolocation
let webTimeoutId:  ReturnType<typeof setTimeout> | null = null;

/** Ritorna true se il codice gira in un'app Capacitor nativa (Android/iOS). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Avvia il tracciamento GPS.
 * - Nativo: background-geolocation (funziona con schermo spento).
 * - Browser: watchPosition standard (schermo deve restare acceso).
 */
export async function startGeoTracking(
  onPosition: GeoCallback,
  onError: GeoErrorCallback,
): Promise<void> {
  // Evita avvii doppi
  if (bgWatcherId !== null || webWatchId !== null) return;

  if (isNativeApp()) {
    await startBackgroundTracking(onPosition, onError);
  } else {
    startWebTracking(onPosition, onError);
  }
}

/** Ferma il tracciamento GPS e rilascia le risorse. */
export async function stopGeoTracking(): Promise<void> {
  if (isNativeApp()) {
    await stopBackgroundTracking();
  } else {
    stopWebTracking();
  }
}

// ─── Native — @capacitor-community/background-geolocation ────────────────────

async function startBackgroundTracking(
  onPosition: GeoCallback,
  onError: GeoErrorCallback,
): Promise<void> {
  try {
    const { BackgroundGeolocation } = await import(
      '@capacitor-community/background-geolocation'
    );

    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'Tracciamento GPS percorso in corso…',
        backgroundTitle:   '1000km di Gratitudine',
        requestPermissions: true,
        stale:  false,
        distanceFilter: 10,   // minimo 10 m di spostamento tra due update
      },
      (position, error) => {
        if (error) {
          if (error.code === 'NOT_AUTHORIZED') {
            onError('Permesso GPS negato. Abilitalo nelle impostazioni del dispositivo.');
          } else {
            onError(`Errore GPS: ${error.message}`);
          }
          return;
        }
        if (position) {
          onPosition({
            latitude:  position.latitude,
            longitude: position.longitude,
            speed:     position.speed   ?? null,
            accuracy:  position.accuracy,
            heading:   position.bearing ?? null,
          });
        }
      },
    );

    bgWatcherId = id;
  } catch (err) {
    onError(`Impossibile avviare GPS in background: ${err}`);
  }
}

async function stopBackgroundTracking(): Promise<void> {
  if (!bgWatcherId) return;
  try {
    const { BackgroundGeolocation } = await import(
      '@capacitor-community/background-geolocation'
    );
    await BackgroundGeolocation.removeWatcher({ id: bgWatcherId });
  } catch {
    // ignora errori in fase di stop
  } finally {
    bgWatcherId = null;
  }
}

// ─── Web — navigator.geolocation ─────────────────────────────────────────────

function startWebTracking(
  onPosition: GeoCallback,
  onError: GeoErrorCallback,
): void {
  if (!navigator.geolocation) {
    onError('Geolocalizzazione non supportata da questo browser.');
    return;
  }

  // Richiede HTTPS (eccetto localhost)
  if (
    location.protocol !== 'https:' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1'
  ) {
    onError('Il GPS richiede una connessione HTTPS.');
    return;
  }

  let gotFirst = false;

  webTimeoutId = setTimeout(() => {
    if (!gotFirst) {
      onError(
        "Nessun segnale GPS ricevuto. Assicurati di aver autorizzato la " +
        "geolocalizzazione e di essere all'aperto.",
      );
    }
    webTimeoutId = null;
  }, 20_000);

  webWatchId = navigator.geolocation.watchPosition(
    ({ coords }) => {
      gotFirst = true;
      if (webTimeoutId) { clearTimeout(webTimeoutId); webTimeoutId = null; }
      onPosition({
        latitude:  coords.latitude,
        longitude: coords.longitude,
        speed:     coords.speed,
        accuracy:  coords.accuracy,
        heading:   coords.heading,
      });
    },
    (err) => {
      if (webTimeoutId) { clearTimeout(webTimeoutId); webTimeoutId = null; }
      switch (err.code) {
        case err.PERMISSION_DENIED:
          onError('Permesso GPS negato. Abilitalo nelle impostazioni del browser.');
          break;
        case err.POSITION_UNAVAILABLE:
          onError('Posizione non disponibile. Verifica che il GPS sia attivo.');
          break;
        case err.TIMEOUT:
          onError("Timeout GPS. Riprova in un'area con migliore copertura.");
          break;
        default:
          onError(`Errore GPS: ${err.message}`);
      }
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
  );
}

function stopWebTracking(): void {
  if (webTimeoutId) { clearTimeout(webTimeoutId); webTimeoutId = null; }
  if (webWatchId !== null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
}
