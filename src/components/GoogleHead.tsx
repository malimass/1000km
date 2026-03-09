import { useEffect, useState } from "react";
import { loadGoogleSettings, type GoogleSettings } from "@/lib/adminSettings";

/**
 * Injects Google Analytics gtag.js and Search Console verification meta tag
 * into <head> based on settings stored in site_settings (id=3).
 * Renders nothing visible — only side effects on document.head.
 */
export default function GoogleHead() {
  const [settings, setSettings] = useState<GoogleSettings | null>(null);

  useEffect(() => {
    loadGoogleSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;

    // ── Google Search Console verification ──
    if (settings.gscVerification) {
      let meta = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "google-site-verification";
        document.head.appendChild(meta);
      }
      meta.content = settings.gscVerification;
    }

    // ── Google Analytics (gtag.js) ──
    if (settings.gaId && /^G-[A-Z0-9]+$/i.test(settings.gaId)) {
      const id = settings.gaId;

      // Avoid double-injection
      if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${id}"]`)) return;

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(script);

      const inline = document.createElement("script");
      inline.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}');
      `;
      document.head.appendChild(inline);
    }
  }, [settings]);

  return null;
}
