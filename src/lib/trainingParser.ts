/**
 * trainingParser.ts
 * Parsa file FIT (binario Garmin) e TCX (XML) in un tipo unificato TrainingSession.
 */

export interface TrackPoint {
  time: Date;
  lat?: number;
  lon?: number;
  altitudeM?: number;
  distanceM?: number;
  speedMs?: number;   // m/s
  heartRate?: number;
}

export interface TrainingSession {
  id: string;           // timestamp ISO usato come ID univoco
  fileName: string;
  sport: string;        // "running" | "cycling" | "walking" | "hiking" | ...
  startTime: Date;
  durationSec: number;
  distanceM: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  totalElevationGainM: number;
  totalElevationLossM: number;
  calories?: number;
  trackPoints: TrackPoint[];
  // calcolati da coachAnalysis
  trimp?: number;
  tss?: number;
  hrZonesSec?: [number, number, number, number, number]; // secondi in z1..z5
}

// ─── TCX PARSER ──────────────────────────────────────────────────────────────

function parseFloatEl(el: Element | null, tag: string): number | undefined {
  const found = el?.querySelector(tag);
  const v = found ? parseFloat(found.textContent || "") : NaN;
  return isNaN(v) ? undefined : v;
}

function parseIntEl(el: Element | null, tag: string): number | undefined {
  const found = el?.querySelector(tag);
  const v = found ? parseInt(found.textContent || "", 10) : NaN;
  return isNaN(v) ? undefined : v;
}

export function parseTCX(xmlText: string, fileName: string): TrainingSession {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const activityEl = doc.querySelector("Activity");
  const sport = activityEl?.getAttribute("Sport")?.toLowerCase() || "unknown";

  const trackPoints: TrackPoint[] = [];
  const tpEls = doc.querySelectorAll("Trackpoint");

  tpEls.forEach((tp) => {
    const timeStr = tp.querySelector("Time")?.textContent;
    if (!timeStr) return;
    const time = new Date(timeStr);
    const lat = parseFloatEl(tp, "LatitudeDegrees");
    const lon = parseFloatEl(tp, "LongitudeDegrees");
    const altitudeM = parseFloatEl(tp, "AltitudeMeters");
    const distanceM = parseFloatEl(tp, "DistanceMeters");
    const hrEl = tp.querySelector("HeartRateBpm Value") || tp.querySelector("HeartRateBpm > Value");
    const heartRate = hrEl ? parseInt(hrEl.textContent || "", 10) || undefined : undefined;
    // Speed can be in Extensions/TPX or as Speed tag
    const speedEl = tp.querySelector("Speed") || tp.querySelector("ns3\\:Speed");
    const speedMs = speedEl ? parseFloat(speedEl.textContent || "") || undefined : undefined;

    trackPoints.push({ time, lat, lon, altitudeM, distanceM, speedMs, heartRate });
  });

  // Aggregated from Lap elements
  let totalDist = 0;
  let totalTime = 0;
  let totalCal = 0;
  let maxSpeedMs = 0;
  let sumHR = 0;
  let countHR = 0;
  let maxHR = 0;

  const lapEls = doc.querySelectorAll("Lap");
  lapEls.forEach((lap) => {
    totalDist += parseFloatEl(lap, "DistanceMeters") ?? 0;
    totalTime += parseFloatEl(lap, "TotalTimeSeconds") ?? 0;
    totalCal  += parseFloatEl(lap, "Calories") ?? 0;
    const lapMaxSpd = parseFloatEl(lap, "MaximumSpeed") ?? 0;
    if (lapMaxSpd > maxSpeedMs) maxSpeedMs = lapMaxSpd;
    const lapAvgHR = parseIntEl(lap, "AverageHeartRateBpm Value") || parseIntEl(lap, "AverageHeartRateBpm > Value");
    const lapMaxHR = parseIntEl(lap, "MaximumHeartRateBpm Value") || parseIntEl(lap, "MaximumHeartRateBpm > Value");
    if (lapAvgHR) { sumHR += lapAvgHR; countHR++; }
    if (lapMaxHR && lapMaxHR > maxHR) maxHR = lapMaxHR;
  });

  // Fallback: compute from trackpoints
  if (totalDist === 0 && trackPoints.length > 0) {
    const lastWithDist = [...trackPoints].reverse().find(tp => tp.distanceM !== undefined);
    totalDist = lastWithDist?.distanceM ?? 0;
  }
  if (totalTime === 0 && trackPoints.length >= 2) {
    totalTime = (trackPoints[trackPoints.length - 1].time.getTime() - trackPoints[0].time.getTime()) / 1000;
  }

  const startTime = trackPoints[0]?.time ?? new Date();

  // Elevation gain/loss from trackpoints
  let gainM = 0, lossM = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1].altitudeM;
    const curr = trackPoints[i].altitudeM;
    if (prev !== undefined && curr !== undefined) {
      const diff = curr - prev;
      if (diff > 0.5) gainM += diff;
      else if (diff < -0.5) lossM += Math.abs(diff);
    }
  }

  // HR from trackpoints if laps didn't provide it
  if (countHR === 0) {
    const hrPoints = trackPoints.filter(tp => tp.heartRate);
    if (hrPoints.length > 0) {
      sumHR = hrPoints.reduce((s, tp) => s + (tp.heartRate ?? 0), 0);
      countHR = hrPoints.length;
      maxHR = Math.max(...hrPoints.map(tp => tp.heartRate ?? 0));
    }
  }

  const avgSpeedKmh = totalTime > 0 ? (totalDist / 1000) / (totalTime / 3600) : 0;

  return {
    id: startTime.toISOString(),
    fileName,
    sport,
    startTime,
    durationSec: totalTime,
    distanceM: totalDist,
    avgSpeedKmh,
    maxSpeedKmh: maxSpeedMs * 3.6,
    avgHeartRate: countHR > 0 ? Math.round(sumHR / countHR) : undefined,
    maxHeartRate: maxHR > 0 ? maxHR : undefined,
    totalElevationGainM: gainM,
    totalElevationLossM: lossM,
    calories: totalCal > 0 ? Math.round(totalCal) : undefined,
    trackPoints,
  };
}

// ─── FIT PARSER ──────────────────────────────────────────────────────────────

// fit-file-parser è CommonJS, usiamo import dinamico
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FitData = any;

export async function parseFIT(buffer: ArrayBuffer, fileName: string): Promise<TrainingSession> {
  // Carica la libreria dinamicamente (compatibilità CJS/ESM)
  const FitParserLib = await import("fit-file-parser");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FitParser = (FitParserLib as any).default ?? FitParserLib;

  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "km/h",
      lengthUnit: "m",
      temperatureUnit: "celsius",
      elapsedRecordField: true,
      mode: "list",
    });

    parser.parse(buffer, (error: Error | null, data: FitData) => {
      if (error) { reject(error); return; }

      const records: FitData[] = data.records || [];
      const sessions: FitData[] = data.sessions || [];
      const fitSession = sessions[0] || {};

      const sport = (fitSession.sport as string || "unknown").toLowerCase();
      const startTime = fitSession.start_time
        ? new Date(fitSession.start_time)
        : records[0]?.timestamp
          ? new Date(records[0].timestamp)
          : new Date();

      const trackPoints: TrackPoint[] = records
        .filter((r: FitData) => r.timestamp)
        .map((r: FitData): TrackPoint => ({
          time: new Date(r.timestamp),
          lat: r.position_lat !== undefined && r.position_lat !== null ? r.position_lat / 11930464.711 : undefined,
          lon: r.position_long !== undefined && r.position_long !== null ? r.position_long / 11930464.711 : undefined,
          altitudeM: r.altitude !== undefined ? parseFloat(r.altitude) : undefined,
          distanceM: r.distance !== undefined ? parseFloat(r.distance) : undefined,
          speedMs: r.speed !== undefined ? parseFloat(r.speed) / 3.6 : undefined,
          heartRate: r.heart_rate !== undefined ? parseInt(r.heart_rate) : undefined,
        }));

      // Prefer values from the session summary
      const totalDist = parseFloat(fitSession.total_distance) || (() => {
        const last = [...trackPoints].reverse().find(tp => tp.distanceM !== undefined);
        return last?.distanceM ?? 0;
      })();

      const totalTime = parseFloat(fitSession.total_elapsed_time) ||
        (trackPoints.length >= 2
          ? (trackPoints[trackPoints.length - 1].time.getTime() - trackPoints[0].time.getTime()) / 1000
          : 0);

      const avgSpeedKmh = parseFloat(fitSession.avg_speed) ||
        (totalTime > 0 ? (totalDist / 1000) / (totalTime / 3600) : 0);

      const maxSpeedKmh = parseFloat(fitSession.max_speed) || 0;
      const avgHR = parseInt(fitSession.avg_heart_rate) || undefined;
      const maxHR = parseInt(fitSession.max_heart_rate) || undefined;
      const calories = parseInt(fitSession.total_calories) || undefined;

      // Elevation gain/loss
      let gainM = 0, lossM = 0;
      for (let i = 1; i < trackPoints.length; i++) {
        const prev = trackPoints[i - 1].altitudeM;
        const curr = trackPoints[i].altitudeM;
        if (prev !== undefined && curr !== undefined) {
          const diff = curr - prev;
          if (diff > 0.5) gainM += diff;
          else if (diff < -0.5) lossM += Math.abs(diff);
        }
      }

      resolve({
        id: startTime.toISOString(),
        fileName,
        sport,
        startTime,
        durationSec: totalTime,
        distanceM: totalDist,
        avgSpeedKmh,
        maxSpeedKmh,
        avgHeartRate: avgHR,
        maxHeartRate: maxHR,
        totalElevationGainM: gainM,
        totalElevationLossM: lossM,
        calories,
        trackPoints,
      });
    });
  });
}

// ─── FILE DISPATCHER ─────────────────────────────────────────────────────────

export async function parseActivityFile(file: File): Promise<TrainingSession> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".tcx")) {
    const text = await file.text();
    return parseTCX(text, file.name);
  }
  if (name.endsWith(".fit")) {
    const buffer = await file.arrayBuffer();
    return parseFIT(buffer, file.name);
  }
  throw new Error(`Formato non supportato: ${file.name}. Usa .fit o .tcx`);
}
