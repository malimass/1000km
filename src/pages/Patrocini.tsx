import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { motion } from "framer-motion";

// ── Patrocini: aggiungi qui i loghi e i link degli enti ──────────────────────
const patrocini: { nome: string; logo?: string; url?: string }[] = [
  { nome: "Comune di Bologna", url: "https://www.comune.bologna.it" },
  { nome: "Comune di Terranova Sappo Minulio" },
  // Aggiungi altri enti qui:
  // { nome: "Regione Emilia-Romagna", logo: "/loghi/regione-er.png", url: "https://..." },
  // { nome: "Città Metropolitana di Bologna", logo: "/loghi/citta-met.png", url: "https://..." },
];

export default function Patrocini() {
  useEffect(() => {
    document.title = "Patrocini istituzionali | 1000 km di Gratitudine";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Scopri gli enti e le istituzioni che hanno concesso il patrocinio morale al progetto solidale 1000 km di Gratitudine.");
    }
    return () => {
      document.title = "1000kmdigratitudine – Cammino solidale Bologna-Calabria 2026";
      if (meta) {
        meta.setAttribute("content", "1000 km di gratitudine: un cammino di fede da Bologna a Terranova Sappo Minulio. Un pellegrinaggio solidale per la ricerca contro i tumori al seno.");
      }
    };
  }, []);

  return (
    <Layout>
      {/* HERO */}
      <section className="bg-primary text-primary-foreground py-20 md:py-28 px-4">
        <div className="container-narrow text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-3xl md:text-5xl font-bold leading-tight mb-5">
              Patrocini istituzionali
            </h1>
            <p className="font-body text-primary-foreground/80 text-base md:text-lg leading-relaxed">
              Il cammino dei 1000 km di Gratitudine è sostenuto dal patrocinio morale di enti e istituzioni che condividono i valori di solidarietà, prevenzione e ricerca.
            </p>
          </motion.div>
        </div>
      </section>

      {/* INTRODUZIONE */}
      <section className="section-padding bg-background px-4">
        <div className="container-narrow max-w-3xl mx-auto">
          <AnimatedSection>
            <div className="font-body text-muted-foreground text-base leading-relaxed space-y-4 text-center">
              <p>Il progetto 1000 km di Gratitudine nasce con l'obiettivo di unire fede, sport e solidarietà in un cammino lungo l'Italia, da Bologna a Terranova Sappo Minulio.</p>
              <p>L'iniziativa è realizzata con il sostegno morale di istituzioni e enti che hanno riconosciuto il valore sociale del progetto e l'importanza della raccolta fondi destinata alla prevenzione e alla ricerca contro il tumore al seno.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* LOGHI PATROCINI */}
      <section className="section-padding bg-secondary px-4">
        <div className="container-narrow max-w-4xl mx-auto">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
              Enti che hanno concesso il patrocinio morale
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {patrocini.map((ente, i) => {
              const content = (
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px] hover:shadow-md hover:border-dona/30 transition-all">
                  {ente.logo ? (
                    <img
                      src={ente.logo}
                      alt={`Logo ${ente.nome}`}
                      className="max-h-16 w-auto object-contain mb-3"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-dona/10 flex items-center justify-center mb-3">
                      <span className="font-heading text-dona text-xl font-bold">
                        {ente.nome.charAt(0)}
                      </span>
                    </div>
                  )}
                  <p className="font-body text-sm font-medium text-foreground leading-snug">{ente.nome}</p>
                </div>
              );

              return (
                <AnimatedSection key={ente.nome} delay={i * 0.1}>
                  {ente.url ? (
                    <a href={ente.url} target="_blank" rel="noopener noreferrer" className="block h-full">
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </AnimatedSection>
              );
            })}
          </div>

          {/* Testo istituzionale */}
          <AnimatedSection>
            <div className="font-body text-muted-foreground text-sm md:text-base leading-relaxed space-y-3 text-center max-w-2xl mx-auto">
              <p>Il patrocinio morale rappresenta un importante riconoscimento istituzionale del valore sociale e solidale del cammino.</p>
              <p>La loro adesione rafforza il messaggio di sensibilizzazione sulla prevenzione e sulla ricerca contro il tumore al seno.</p>
            </div>
            <p className="text-center text-muted-foreground/60 text-xs font-body mt-6">
              I loghi sono utilizzati esclusivamente per indicare il patrocinio morale concesso al progetto.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* RINGRAZIAMENTO */}
      <section className="py-16 bg-background px-4">
        <div className="container-narrow text-center">
          <AnimatedSection>
            <blockquote className="max-w-2xl mx-auto">
              <span className="text-accent text-5xl md:text-6xl font-heading leading-none block mb-4">"</span>
              <p className="font-heading text-lg md:text-xl text-foreground leading-relaxed italic -mt-6">
                Un ringraziamento sincero a tutte le istituzioni che hanno scelto di sostenere e condividere questo cammino di gratitudine.
              </p>
            </blockquote>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary text-primary-foreground px-4">
        <div className="container-narrow max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
              Vuoi sostenere il progetto?
            </h2>
            <p className="font-body text-primary-foreground/70 text-base leading-relaxed mb-8 max-w-lg mx-auto">
              Enti, istituzioni e organizzazioni possono richiedere il patrocinio o sostenere il cammino dei 1000 km di Gratitudine.
            </p>
            <Button asChild variant="dona" size="lg" className="text-base px-10 py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]">
              <Link to="/contatti">
                Contattaci
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
