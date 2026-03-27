import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const API = "/api/track";

// ─── Visitor ID persistente (localStorage) — riconosce utenti che tornano ────
function getVisitorId(): string {
  let vid = localStorage.getItem("_gp_vid");
  if (!vid) {
    vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("_gp_vid", vid);
  }
  return vid;
}

// ─── Session ID (sessionStorage) — una per tab/finestra ─────────────────────
function getSessionId(): string {
  let sid = sessionStorage.getItem("_gp_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_gp_sid", sid);
  }
  return sid;
}

function send(data: Record<string, unknown>) {
  try {
    const body = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API, new Blob([body], { type: "application/json" }));
    } else {
      fetch(API, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch { /* silent */ }
}

/** Pagine escluse dal tracking (admin, coach, atleta) */
const EXCLUDED_PREFIXES = ["/admin", "/coach", "/atleta"];

function isExcluded(path: string): boolean {
  return EXCLUDED_PREFIXES.some(p => path.startsWith(p));
}

export default function PageTracker() {
  const { pathname } = useLocation();
  const prev = useRef("");
  const enterTime = useRef(Date.now());

  useEffect(() => {
    if (pathname === prev.current) return;
    if (isExcluded(pathname)) return;

    // Traccia durata della pagina precedente (se non esclusa)
    if (prev.current && !isExcluded(prev.current)) {
      const duration = Math.round((Date.now() - enterTime.current) / 1000);
      if (duration > 0 && duration < 1800) {
        send({
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
          path: prev.current,
          event_type: "page_leave",
          event_data: String(duration),
        });
      }
    }

    prev.current = pathname;
    enterTime.current = Date.now();

    send({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      path: pathname,
      referrer: document.referrer || null,
      screen_w: window.screen.width,
      screen_h: window.screen.height,
      language: navigator.language?.slice(0, 16),
      event_type: "pageview",
    });
  }, [pathname]);

  // Traccia durata anche quando l'utente lascia il sito
  useEffect(() => {
    const handleUnload = () => {
      if (prev.current && !isExcluded(prev.current)) {
        const duration = Math.round((Date.now() - enterTime.current) / 1000);
        if (duration > 0 && duration < 1800) {
          send({
            visitor_id: getVisitorId(),
            session_id: getSessionId(),
            path: prev.current,
            event_type: "page_leave",
            event_data: String(duration),
          });
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return null;
}

/** Track a custom event (call from anywhere) */
export function trackEvent(eventName: string, data?: string) {
  if (isExcluded(window.location.pathname)) return;
  send({
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    path: window.location.pathname,
    event_type: eventName,
    event_data: data?.slice(0, 512) ?? null,
  });
}
