/**
 * mapSnapshot.ts
 * ──────────────
 * Cattura uno screenshot di un elemento DOM (es. il contenitore della mappa Leaflet)
 * utilizzando html2canvas, e restituisce un File PNG pronto per l'upload.
 */

import html2canvas from "html2canvas";

export async function captureMapScreenshot(
  element: HTMLElement,
): Promise<File | null> {
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      scale: 2,
      logging: false,
    });
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          resolve(
            new File([blob], `mappa-live-${Date.now()}.png`, { type: "image/png" }),
          );
        },
        "image/png",
      );
    });
  } catch {
    return null;
  }
}
