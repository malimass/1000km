import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import sanLucaImg from "@/assets/san-luca.jpg";
import { motion } from "framer-motion";
import { loadSiteYtSanLucaVideos, type YtVideoData } from "@/lib/adminSettings";

// ── Metadati video (titoli e descrizioni) ─────────────────────────────────────
const VIDEO_META = [
  {
    titolo: "Il Santuario della Madonna di San Luca",
    descrizione:
      "La storia secolare del Santuario sul Colle della Guardia e il portico più lungo del mondo che lo collega a Bologna.",
  },
  {
    titolo: "La Devozione e le Tradizioni",
    descrizione:
      "Le processioni, i pellegrinaggi e i riti che da secoli accompagnano la devozione alla Madonna di San Luca.",
  },
  {
    titolo: "I Miracoli e le Grazie",
    descrizione:
      "Le testimonianze dei fedeli e i prodigi legati all'icona della Vergine con il Bambino.",
  },
];

function VideoEmbed({ videoId, titolo }: { videoId: string; titolo: string }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-primary/10">
      {videoId.startsWith("YOUTUBE_ID") ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-primary/5 border-2 border-dashed border-border">
          <Play className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground/50 text-sm font-body text-center px-4">
            Video da inserire · sostituisci <code className="bg-muted px-1 rounded text-xs">{videoId}</code> nel codice
          </p>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={titolo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      )}
    </div>
  );
}

export default function SanLuca() {
  const [videos, setVideos] = useState<YtVideoData[]>(() =>
    VIDEO_META.map((meta, i) => ({ id: `YOUTUBE_ID_${i + 1}`, ...meta })),
  );
  useEffect(() => {
    document.title = "Santuario della Madonna di San Luca Bologna | Storia, Miracoli e Cammino dei 1000 km";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Scopri la storia del Santuario della Madonna di San Luca a Bologna, i miracoli e il suo ruolo come punto di partenza del cammino solidale dei 1000 km di Gratitudine.");
    }
    return () => {
      document.title = "1000kmdigratitudine – Cammino solidale Bologna-Calabria 2026";
      if (meta) {
        meta.setAttribute("content", "1000 km di gratitudine: un cammino di fede da Bologna a Terranova Sappo Minulio. Un pellegrinaggio solidale per la ricerca contro i tumori al seno.");
      }
    };
  }, []);

  useEffect(() => {
    loadSiteYtSanLucaVideos().then(source => {
      if (!source) return;
      setVideos(
        VIDEO_META.map((meta, i) => ({
          id:          source[i].id          || `YOUTUBE_ID_${i + 1}`,
          titolo:      source[i].titolo      || meta.titolo,
          descrizione: source[i].descrizione || meta.descrizione,
        })),
      );
    });
  }, []);

  return (
    <Layout>
      {/* HERO */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <img src={sanLucaImg} alt="Santuario della Madonna di San Luca, Bologna" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Santuario della Madonna di San Luca</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="font-body text-primary-foreground/80 text-base md:text-lg">Bologna – Il luogo da cui nasce il cammino di 1000 km di gratitudine</motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          {/* LA STORIA */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">La Storia</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Il Santuario della Madonna di San Luca sorge sul Colle della Guardia, a circa 300 metri sopra la città di Bologna. Da secoli è uno dei luoghi di devozione mariana più importanti d'Italia.</p>
              <p>Il santuario è collegato al centro della città attraverso il portico più lungo del mondo: quasi 4 chilometri di arcate costruite nel 1674, che accompagnano i pellegrini lungo la salita verso il colle.</p>
              <p>Questo percorso, formato da 666 archi, rappresenta un simbolo unico di fede e tradizione nel patrimonio culturale italiano.</p>
            </div>
          </AnimatedSection>

          {/* ── Sezione Video ─────────────────────────────────────────────── */}
          <AnimatedSection>
            <div className="mt-12 mb-6">
              <p className="font-body text-muted-foreground leading-relaxed italic">
                Il Santuario della Madonna di San Luca raccontato attraverso immagini e testimonianze.
              </p>
            </div>
          </AnimatedSection>
          {videos.map((video, i) => (
            <AnimatedSection key={video.id} delay={i * 0.1}>
              <div className="mt-8">
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {video.titolo}
                </h2>
                <p className="font-body text-muted-foreground leading-relaxed mb-5">
                  {video.descrizione}
                </p>
                <VideoEmbed videoId={video.id} titolo={video.titolo} />
              </div>
            </AnimatedSection>
          ))}

          {/* L'ICONA */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">L'Icona</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>L'icona della Vergine con il Bambino, conosciuta come Madonna di San Luca, è venerata da secoli come protettrice della città di Bologna.</p>
              <p>Secondo la tradizione, l'immagine sacra fu portata dall'Oriente da un eremita e attribuita all'evangelista San Luca, motivo per cui il santuario porta il suo nome.</p>
              <p>Per i bolognesi rappresenta un simbolo di protezione, speranza e devozione.</p>
            </div>
          </AnimatedSection>

          {/* I MIRACOLI */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">I Miracoli</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Nel corso dei secoli la Madonna di San Luca è stata associata a numerosi miracoli e grazie ricevute.</p>
              <p>Ogni anno, nel mese di maggio, l'icona viene portata in processione dal santuario fino alla Cattedrale di San Pietro, un rito che coinvolge l'intera città di Bologna.</p>
              <p>La tradizione racconta di piogge provvidenziali durante periodi di siccità, guarigioni e protezioni durante le guerre, rafforzando la devozione popolare verso la Madonna di San Luca.</p>
            </div>
          </AnimatedSection>

          {/* IL COLLEGAMENTO CON IL CAMMINO */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">Il collegamento con il cammino</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Dal Santuario della Madonna di San Luca prende vita il cammino di 1000 km di Gratitudine.</p>
              <p>Da questo luogo di fede inizierà il viaggio che porterà i pellegrini da Bologna fino al Santuario del SS Crocifisso Nero di Terranova Sappo Minulio, in Calabria.</p>
              <p>Un percorso che unisce fede, gratitudine e solidarietà, trasformando ogni chilometro in un gesto concreto a sostegno della prevenzione e della ricerca contro il tumore al seno.</p>
              <p className="text-foreground font-semibold">Tutte le donazioni raccolte durante il cammino sono destinate a Komen Italia – Comitato Emilia-Romagna.</p>
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection delay={0.2}>
            <div className="mt-12 text-center">
              <p className="font-heading text-lg md:text-xl font-bold text-foreground mb-2">
                Sostieni questo cammino di solidarietà
              </p>
              <p className="font-body text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
                Ogni contributo aiuta a trasformare i 1000 km di gratitudine in un aiuto concreto per la prevenzione e la ricerca.
              </p>
              <Button asChild variant="dona" size="lg" className="px-10 py-6">
                <Link to="/dona">
                  <Heart className="w-5 h-5 mr-2" />
                  DONA ORA
                </Link>
              </Button>
            </div>
          </AnimatedSection>

          {/* CITAZIONE */}
          <AnimatedSection delay={0.3}>
            <blockquote className="mt-16 text-center max-w-2xl mx-auto">
              <span className="text-accent text-5xl md:text-6xl font-heading leading-none block mb-4">"</span>
              <p className="font-heading text-lg md:text-xl text-foreground leading-relaxed italic -mt-6">
                Ogni cammino inizia con un passo. Da San Luca nasce un viaggio di gratitudine lungo 1000 km.
              </p>
            </blockquote>
          </AnimatedSection>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
