/**
 * dominantColor.ts
 * ────────────────
 * Extracts the dominant colour from an image URL using an offscreen canvas.
 * Returns an `rgba(r,g,b,0.18)` string suitable for card backgrounds.
 */

const cache = new Map<string, string>();

export function getDominantColor(src: string): Promise<string> {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 40;                     // down-sample for speed
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Bucket colours (skip near-white / near-black / transparent)
        const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < 128) continue;                       // skip transparent
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 240 || lum < 15) continue;         // skip near-white/black
          // Quantise to reduce buckets
          const qr = (r >> 4) << 4;
          const qg = (g >> 4) << 4;
          const qb = (b >> 4) << 4;
          const key = `${qr},${qg},${qb}`;
          const prev = buckets.get(key);
          if (prev) { prev.r += r; prev.g += g; prev.b += b; prev.count++; }
          else buckets.set(key, { r, g, b, count: 1 });
        }

        let best = { r: 180, g: 180, b: 180, count: 0 };
        for (const b of buckets.values()) {
          if (b.count > best.count) best = b;
        }
        const n = best.count || 1;
        const cr = Math.round(best.r / n);
        const cg = Math.round(best.g / n);
        const cb = Math.round(best.b / n);

        const color = `rgba(${cr},${cg},${cb},0.18)`;
        cache.set(src, color);
        resolve(color);
      } catch {
        resolve("rgba(180,180,180,0.08)");
      }
    };
    img.onerror = () => resolve("rgba(180,180,180,0.08)");
    img.src = src;
  });
}
