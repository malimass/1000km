import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://www.1000kmdigratitudine.it";
const SITE_NAME = "1000 km di Gratitudine";
const DEFAULT_TITLE = "1000kmdigratitudine – Cammino solidale Bologna-Calabria 2026";
const DEFAULT_DESC = "1000 km di gratitudine: un cammino di fede da Bologna a Terranova Sappo Minulio. Un pellegrinaggio solidale per la ricerca contro i tumori al seno.";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

interface SEOProps {
  title: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
}

function setMeta(attr: string, value: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr.split("=")[0] === "property" ? "property" : "name", value);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

export function useSEO({ title, description, ogImage, noindex }: SEOProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title === DEFAULT_TITLE ? title : `${title} | ${SITE_NAME}`;
    const desc = description ?? DEFAULT_DESC;
    const image = ogImage ?? DEFAULT_IMAGE;
    const url = `${BASE_URL}${pathname}`;

    // Title
    document.title = fullTitle;

    // Meta
    setMeta("name", "description", desc);

    // Canonical
    setCanonical(url);

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", image);

    // Noindex
    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) robotsMeta.remove();
    }

    // Cleanup: ripristina default quando la pagina viene smontata
    return () => {
      document.title = DEFAULT_TITLE;
      setMeta("name", "description", DEFAULT_DESC);
      setCanonical(BASE_URL + "/");
      setMeta("property", "og:title", DEFAULT_TITLE);
      setMeta("property", "og:description", DEFAULT_DESC);
      setMeta("property", "og:url", BASE_URL + "/");
      setMeta("property", "og:image", DEFAULT_IMAGE);
      setMeta("name", "twitter:title", DEFAULT_TITLE);
      setMeta("name", "twitter:description", DEFAULT_DESC);
      setMeta("name", "twitter:image", DEFAULT_IMAGE);
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) robotsMeta.remove();
    };
  }, [title, description, ogImage, noindex, pathname]);
}
