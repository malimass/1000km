import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const API = "/api/track";

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

export default function PageTracker() {
  const { pathname } = useLocation();
  const prev = useRef("");

  useEffect(() => {
    if (pathname === prev.current) return;
    // Skip admin pages
    if (pathname.startsWith("/admin")) return;
    prev.current = pathname;

    send({
      session_id: getSessionId(),
      path: pathname,
      referrer: document.referrer || null,
      screen_w: window.screen.width,
      screen_h: window.screen.height,
      language: navigator.language?.slice(0, 16),
      event_type: "pageview",
    });
  }, [pathname]);

  return null;
}

/** Track a click event (call from onClick handlers) */
export function trackClick(label: string) {
  send({
    session_id: getSessionId(),
    path: window.location.pathname,
    event_type: "click",
    event_data: label,
  });
}
