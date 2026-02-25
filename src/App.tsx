import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import NativeRedirect from "./components/NativeRedirect";

const Index = lazy(() => import("./pages/Index"));
const Percorso = lazy(() => import("./pages/Percorso"));
const SanLuca = lazy(() => import("./pages/SanLuca"));
const CrocifissoNero = lazy(() => import("./pages/CrocifissoNero"));
const Sponsor = lazy(() => import("./pages/Sponsor"));
const Sostenitori = lazy(() => import("./pages/Sostenitori"));
const Contatti = lazy(() => import("./pages/Contatti"));
const Dona = lazy(() => import("./pages/Dona"));
const AdminLive = lazy(() => import("./pages/AdminLive"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Iscriviti = lazy(() => import("./pages/Iscriviti"));
const IscrizioneSuccesso = lazy(() => import("./pages/IscrizioneSuccesso"));
const Partecipa = lazy(() => import("./pages/Partecipa"));
const IlMioPercorso = lazy(() => import("./pages/IlMioPercorso"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
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
          <Route path="/iscriviti" element={<Iscriviti />} />
          <Route path="/iscrizione-successo" element={<IscrizioneSuccesso />} />
          <Route path="/partecipa" element={<Partecipa />} />
          <Route path="/il-mio-percorso" element={<IlMioPercorso />} />
          <Route path="/admin-login" element={<AdminLogin />} />
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
