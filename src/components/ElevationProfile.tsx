import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Mountain, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
}

export interface ElevationStats {
  minElevation: number;
  maxElevation: number;
  totalGainM: number;
  totalLossM: number;
}

interface Props {
  points: ElevationPoint[];
  stats: ElevationStats;
  totalDistanceKm: number;
}

// Haversine (m)
function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const φ1 = (a[0] * Math.PI) / 180, φ2 = (b[0] * Math.PI) / 180;
  const Δφ = ((b[0] - a[0]) * Math.PI) / 180, Δλ = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function ElevationProfile({ points, stats, totalDistanceKm }: Props) {
  // Calcola distanza progressiva per ogni punto
  const data = points.map((p, i) => {
    let distKm = 0;
    if (i > 0) {
      let cumM = 0;
      for (let j = 1; j <= i; j++) {
        cumM += haversineM(
          [points[j - 1].lat, points[j - 1].lng],
          [points[j].lat, points[j].lng],
        );
      }
      distKm = cumM / 1000;
    }
    return {
      distKm: Math.round(distKm * 10) / 10,
      elevation: p.elevation,
    };
  });

  // Se la distanza calcolata è molto diversa da totalDistanceKm, riscala
  const lastKm = data[data.length - 1]?.distKm || 1;
  const scaleFactor = totalDistanceKm / lastKm;
  if (Math.abs(scaleFactor - 1) > 0.1) {
    for (const d of data) d.distKm = Math.round(d.distKm * scaleFactor * 10) / 10;
  }

  // Classifica terreno
  const terrainType = getTerrainType(stats, totalDistanceKm);

  return (
    <div className="space-y-4">
      {/* Statistiche */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          icon={<Mountain className="w-4 h-4" />}
          label="Quota max"
          value={`${stats.maxElevation} m`}
          color="text-amber-600"
        />
        <StatCard
          icon={<ArrowUpDown className="w-4 h-4" />}
          label="Quota min"
          value={`${stats.minElevation} m`}
          color="text-blue-600"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Dislivello +"
          value={`${stats.totalGainM} m`}
          color="text-green-600"
        />
        <StatCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Dislivello −"
          value={`${stats.totalLossM} m`}
          color="text-red-600"
        />
      </div>

      {/* Tipo terreno */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs sm:text-sm font-body flex-wrap">
        <span className="text-lg shrink-0">{terrainType.emoji}</span>
        <span className="font-medium">{terrainType.label}</span>
        <span className="text-muted-foreground">— {terrainType.description}</span>
      </div>

      {/* Grafico altimetrico */}
      <div className="bg-card rounded-xl border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 font-body">Profilo altimetrico</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distKm"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `${Math.round(v)} km`}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `${v} m`}
              width={50}
              domain={["dataMin - 50", "dataMax + 50"]}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(v: number) => [`${v} m`, "Quota"]}
              labelFormatter={(v: number) => `${v} km`}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#elevGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-card rounded-lg border border-border px-2 sm:px-3 py-2">
      <span className={`${color} shrink-0`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-body leading-tight">{label}</p>
        <p className="text-xs sm:text-sm font-semibold font-body truncate">{value}</p>
      </div>
    </div>
  );
}

function getTerrainType(stats: ElevationStats, distKm: number) {
  const gainPerKm = stats.totalGainM / (distKm || 1);
  const maxAlt = stats.maxElevation;

  if (maxAlt > 2000) {
    return { emoji: "🏔️", label: "Alta montagna", description: `${gainPerKm.toFixed(0)} m D+/km — Percorso alpino impegnativo` };
  }
  if (maxAlt > 1000 || gainPerKm > 20) {
    return { emoji: "⛰️", label: "Montagna", description: `${gainPerKm.toFixed(0)} m D+/km — Salite e discese frequenti` };
  }
  if (maxAlt > 500 || gainPerKm > 10) {
    return { emoji: "🏞️", label: "Collinare", description: `${gainPerKm.toFixed(0)} m D+/km — Terreno ondulato con variazioni` };
  }
  if (gainPerKm > 5) {
    return { emoji: "🌾", label: "Pianura mossa", description: `${gainPerKm.toFixed(0)} m D+/km — Prevalentemente pianeggiante` };
  }
  return { emoji: "🛤️", label: "Pianura", description: `${gainPerKm.toFixed(0)} m D+/km — Terreno piatto e scorrevole` };
}
