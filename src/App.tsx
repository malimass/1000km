import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ScrollToTop from "./components/ScrollToTop";

const Index = lazy(() => import("./pages/Index"));
const Percorso = lazy(() => import("./pages/Percorso"));
const SanLuca = lazy(() => import("./pages/SanLuca"));
const CrocifissoNero = lazy(() => import("./pages/CrocifissoNero"));
const Sponsor = lazy(() => import("./pages/Sponsor"));
const Contatti = lazy(() => import("./pages/Contatti"));
const Dona = lazy(() => import("./pages/Dona"));
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
          <Route path="/" element={<Index />} />
          <Route path="/il-percorso" element={<Percorso />} />
          <Route path="/madonna-di-san-luca" element={<SanLuca />} />
          <Route path="/ss-crocifisso-nero" element={<CrocifissoNero />} />
          <Route path="/sponsor" element={<Sponsor />} />
          <Route path="/contatti" element={<Contatti />} />
          <Route path="/dona" element={<Dona />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
