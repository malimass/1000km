import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Gestione globale chunk JS mancanti (dopo deploy) ────────────────────────
// Cattura errori di import dinamici non gestiti da lazyWithRetry (es. icone,
// sotto-dipendenze caricate internamente dai componenti).
window.addEventListener("error", (event) => {
  // Errori di caricamento script (MIME type mismatch, 404, ecc.)
  if (
    event.target instanceof HTMLScriptElement &&
    event.target.src?.includes("/assets/")
  ) {
    const key = "chunk_full_reload";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      console.warn("[main] Chunk mancante, ricarico la pagina:", event.target.src);
      window.location.reload();
    }
  }
}, true); // capture phase per intercettare gli errori di caricamento script

// Errori di import() dinamico non catturati
window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason?.message ?? event.reason ?? "");
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed")
  ) {
    const key = "chunk_full_reload";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      console.warn("[main] Import dinamico fallito, ricarico:", msg);
      event.preventDefault();
      window.location.reload();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
