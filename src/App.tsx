import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ScrollToTop from "./components/ScrollToTop";
import GoogleHead from "./components/GoogleHead";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedCoachRoute from "./components/ProtectedCoachRoute";
import NativeRedirect from "./components/NativeRedirect";
import PageTracker from "./components/PageTracker";

/**
 * Wrapper per lazy() che ricarica la pagina se il chunk JS non viene trovato
 * (tipico dopo un nuovo deploy quando il browser ha in cache vecchi riferimenti).
 */
function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    factory().catch((err) => {
      // Se è un errore di import (chunk non trovato), ricarica una sola volta
      const key = "chunk_reload_" + window.location.pathname;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        // Restituisci una promise che non si risolve mai (la pagina si ricarica)
        return new Promise(() => {});
      }
      // Se abbiamo già provato a ricaricare, rilancia l'errore
      sessionStorage.removeItem(key);
      throw err;
    }),
  );
}

const Index = lazyWithRetry(() => import("./pages/Index"));
const Percorso = lazyWithRetry(() => import("./pages/Percorso"));
const SanLuca = lazyWithRetry(() => import("./pages/SanLuca"));
const CrocifissoNero = lazyWithRetry(() => import("./pages/CrocifissoNero"));
const Sponsor = lazyWithRetry(() => import("./pages/Sponsor"));
const Sostenitori = lazyWithRetry(() => import("./pages/Sostenitori"));
const Contatti = lazyWithRetry(() => import("./pages/Contatti"));
const Dona = lazyWithRetry(() => import("./pages/Dona"));
const Notizie = lazyWithRetry(() => import("./pages/Notizie"));
const Servizi = lazyWithRetry(() => import("./pages/Servizi"));
const AdminLive = lazyWithRetry(() => import("./pages/AdminLive"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const Iscriviti = lazyWithRetry(() => import("./pages/Iscriviti"));
const IscrizioneSuccesso = lazyWithRetry(() => import("./pages/IscrizioneSuccesso"));
const Partecipa = lazyWithRetry(() => import("./pages/Partecipa"));
const Accedi = lazyWithRetry(() => import("./pages/Accedi"));
const IlMioPercorso = lazyWithRetry(() => import("./pages/IlMioPercorso"));
const CoachLogin = lazyWithRetry(() => import("./pages/CoachLogin"));
const CoachRegister = lazyWithRetry(() => import("./pages/CoachRegister"));
const Coach = lazyWithRetry(() => import("./pages/Coach"));
const AtletaAuth = lazyWithRetry(() => import("./pages/AtletaAuth"));
const AtletaDashboard = lazyWithRetry(() => import("./pages/AtletaDashboard"));
const GuidaMetriche = lazyWithRetry(() => import("./pages/GuidaMetriche"));
const GuidaTraccar = lazyWithRetry(() => import("./pages/GuidaTraccar"));
const Patrocini = lazyWithRetry(() => import("./pages/Patrocini"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <GoogleHead />
        <PageTracker />
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          <Route path="/" element={<NativeRedirect><Index /></NativeRedirect>} />
          <Route path="/il-percorso" element={<Percorso />} />
          <Route path="/madonna-di-san-luca" element={<SanLuca />} />
          <Route path="/ss-crocifisso-nero" element={<CrocifissoNero />} />
          <Route path="/sponsor" element={<Sponsor />} />
          <Route path="/sostenitori" element={<Sostenitori />} />
          <Route path="/contatti" element={<Contatti />} />
          <Route path="/dona" element={<Dona />} />
          <Route path="/notizie" element={<Notizie />} />
          <Route path="/servizi" element={<Servizi />} />
          <Route path="/iscriviti" element={<Iscriviti />} />
          <Route path="/iscrizione-successo" element={<IscrizioneSuccesso />} />
          <Route path="/partecipa" element={<Partecipa />} />
          <Route path="/patrocini" element={<Patrocini />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/accedi" element={<Accedi />} />
          <Route path="/il-mio-percorso" element={<IlMioPercorso />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/coach-login" element={<Navigate to="/accedi" replace />} />
          <Route path="/coach/registrati" element={<Navigate to="/accedi" replace />} />
          <Route path="/atleta/accedi" element={<Navigate to="/accedi" replace />} />
          <Route path="/atleta" element={<AtletaDashboard />} />
          <Route path="/guida-metriche" element={<GuidaMetriche />} />
          <Route path="/guida-traccar" element={<GuidaTraccar />} />
          <Route path="/coach" element={
            <ProtectedCoachRoute>
              <Coach />
            </ProtectedCoachRoute>
          } />
          <Route path="/admin-live" element={
            <ProtectedAdminRoute>
              <AdminLive />
            </ProtectedAdminRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
