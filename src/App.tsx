import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Percorso from "./pages/Percorso";
import SanLuca from "./pages/SanLuca";
import CrocifissoNero from "./pages/CrocifissoNero";
import Sponsor from "./pages/Sponsor";
import Contatti from "./pages/Contatti";
import Dona from "./pages/Dona";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
