import { Link } from "react-router-dom";
import { Heart, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import crocifissoImg from "@/assets/crocifisso-nero.jpg";
import { motion } from "framer-motion";

// ── Video YouTube ─────────────────────────────────────────────────────────────
// Sostituisci YOUTUBE_ID_X con l'ID del video (parte dopo ?v= nell'URL di YouTube)
// Es: https://www.youtube.com/watch?v=dQw4w9WgXcQ → ID = dQw4w9WgXcQ
const videos = [
  {
    id: "YOUTUBE_ID_1",
    titolo: "La Storia del Crocifisso Nero",
    descrizione:
      "Le origini e la leggenda del sacro simulacro ligneo venerato a Terranova Sappo Minulio, tra fede popolare e tradizione secolare.",
  },
  {
    id: "YOUTUBE_ID_2",
    titolo: "La Devozione e le Celebrazioni",
    descrizione:
      "Le feste patronali e i pellegrinaggi che ogni anno richiamano migliaia di fedeli da tutta la Calabria e dal sud Italia.",
  },
  {
    id: "YOUTUBE_ID_3",
    titolo: "I Miracoli e le Grazie",
    descrizione:
      "Le testimonianze dei fedeli e i prodigi tramandati dalla tradizione locale legati al SS Crocifisso Nero.",
  },
];

function VideoEmbed({ videoId, titolo }: { videoId: string; titolo: string }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-primary/10">
      {videoId.startsWith("YOUTUBE_ID") ? (
        // Segnaposto finché non viene inserito il vero ID
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

export default function CrocifissoNero() {
  return (
    <Layout>
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <img src={crocifissoImg} alt="Santuario del SS Crocifisso Nero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Santuario del SS Crocifisso Nero</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="font-body text-primary-foreground/80">Terranova Sappo Minulio – Il traguardo</motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">La Storia</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Il Santuario del Santissimo Crocifisso Nero si trova a Terranova Sappo Minulio, un piccolo comune della provincia di Reggio Calabria. La sua storia affonda le radici in una devozione popolare profonda, legata a un crocifisso ligneo dal colore scuro che la tradizione vuole miracoloso.</p>
              <p>Il santuario rappresenta un punto di riferimento spirituale per le comunità dell'Aspromonte e della Piana di Gioia Tauro, attirando fedeli da tutta la Calabria e dal sud Italia.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">La Devozione</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>La devozione al SS Crocifisso Nero è radicata nella cultura e nella fede delle comunità calabresi. Le celebrazioni in suo onore richiamano migliaia di fedeli e rappresentano un momento di profonda spiritualità collettiva.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">I Miracoli</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>La tradizione locale attribuisce al Crocifisso Nero numerosi eventi prodigiosi. I fedeli raccontano di guarigioni, protezioni durante catastrofi naturali e grazie ricevute dopo la preghiera davanti al sacro simulacro.</p>
            </div>
          </AnimatedSection>

          {/* ── Sezioni Video ─────────────────────────────────────────────── */}
          {videos.map((video, i) => (
            <AnimatedSection key={video.id} delay={i * 0.1}>
              <div className="mt-12">
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

          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">Il collegamento con il cammino</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Terranova Sappo Minulio e il suo Santuario rappresentano la meta finale del cammino di 1000 km. L'arrivo al Crocifisso Nero chiude un cerchio di fede che parte da Bologna, attraversando l'intera penisola.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="mt-12 text-center">
              <Button asChild variant="dona" size="lg" className="px-10 py-6">
                <Link to="/dona">
                  <Heart className="w-5 h-5 mr-2" />
                  DONA ORA
                </Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
