/**
 * dominantColor.ts
 * ────────────────
 * Extracts the most vibrant / dominant colour from an image URL.
 * Returns an `rgba(r,g,b,0.18)` string suitable for card backgrounds.
 *
 * Strategy: score each quantised bucket by  count × saturation  so that
 * a small but vivid logo element wins over a large white/grey background.
 */

const cache = new Map<string, string>();

export function getDominantColor(src: string): Promise<string> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 50;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { r: number; g: number; b: number; count: number; satSum: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 80) continue; // skip transparent

          // Compute saturation (0-1)
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const lum = (max + min) / 2;
          if (lum > 248 || lum < 8) continue; // skip pure white/black
          const sat = max === 0 ? 0 : (max - min) / max;

          // Quantise to 16-level buckets
          const qr = (r >> 4) << 4;
          const qg = (g >> 4) << 4;
          const qb = (b >> 4) << 4;
          const key = `${qr},${qg},${qb}`;
          const prev = buckets.get(key);
          if (prev) {
            prev.r += r; prev.g += g; prev.b += b;
            prev.count++; prev.satSum += sat;
          } else {
            buckets.set(key, { r, g, b, count: 1, satSum: sat });
          }
        }

        // Score = count × (avgSaturation + 0.1)  — the +0.1 avoids zero for grey
        let best: { r: number; g: number; b: number; count: number; satSum: number } | null = null;
        let bestScore = 0;
        for (const b of buckets.values()) {
          const avgSat = b.satSum / b.count;
          const score = b.count * (avgSat + 0.1);
          if (score > bestScore) { bestScore = score; best = b; }
        }

        if (!best || best.count === 0) {
          cache.set(src, "");
          resolve("");
          return;
        }

        const n = best.count;
        const cr = Math.round(best.r / n);
        const cg = Math.round(best.g / n);
        const cb = Math.round(best.b / n);

        const color = `rgba(${cr},${cg},${cb},0.18)`;
        cache.set(src, color);
        resolve(color);
      } catch {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}
