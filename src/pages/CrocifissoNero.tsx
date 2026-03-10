import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import crocifissoImg from "@/assets/crocifisso-nero.jpg";
import { motion } from "framer-motion";
import { loadYtCrocifissoVideos, loadSiteYtVideos, type YtVideoData } from "@/lib/adminSettings";

// ── Metadati video (titoli e descrizioni) ─────────────────────────────────────
const VIDEO_META = [
  {
    titolo: "La Storia del Crocifisso Nero",
    descrizione:
      "Le origini e la leggenda del sacro simulacro ligneo venerato a Terranova Sappo Minulio, tra fede popolare e tradizione secolare.",
  },
  {
    titolo: "La Devozione e le Celebrazioni",
    descrizione:
      "Le feste patronali e i pellegrinaggi che ogni anno richiamano migliaia di fedeli da tutta la Calabria e dal sud Italia.",
  },
  {
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
  const [videos, setVideos] = useState<YtVideoData[]>(() =>
    VIDEO_META.map((meta, i) => ({ id: `YOUTUBE_ID_${i + 1}`, ...meta })),
  );

  useEffect(() => {
    document.title = "Santuario del SS Crocifisso Nero Terranova Sappo Minulio | Storia, Miracoli e Cammino dei 1000 km";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Scopri la storia del Santuario del SS Crocifisso Nero di Terranova Sappo Minulio, la devozione, i miracoli e il suo ruolo come meta del cammino solidale dei 1000 km di Gratitudine.");
    }
    return () => {
      document.title = "1000kmdigratitudine – Cammino solidale Bologna-Calabria 2026";
      if (meta) {
        meta.setAttribute("content", "1000 km di gratitudine: un cammino di fede da Bologna a Terranova Sappo Minulio. Un pellegrinaggio solidale per la ricerca contro i tumori al seno.");
      }
    };
  }, []);

  useEffect(() => {
    loadSiteYtVideos().then(siteData => {
      const source = siteData ?? loadYtCrocifissoVideos();
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
        <img src={crocifissoImg} alt="Santuario del SS Crocifisso Nero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Santuario del SS Crocifisso Nero</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="font-body text-primary-foreground/80 text-base md:text-lg">Terranova Sappo Minulio – La meta del cammino di 1000 km di Gratitudine</motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          {/* LA STORIA */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">La Storia</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Il Santuario del Santissimo Crocifisso Nero si trova a Terranova Sappo Minulio, un piccolo borgo della Piana di Gioia Tauro, in Calabria.</p>
              <p>La sua origine è legata alla presenza di un antico crocifisso ligneo dal colore scuro, venerato da secoli dalla popolazione locale e considerato miracoloso.</p>
              <p>Nel tempo il santuario è diventato un importante punto di riferimento spirituale per le comunità locali e per i territori della Piana di Gioia Tauro, attirando fedeli e pellegrini che giungono per pregare, chiedere grazie o esprimere la propria gratitudine.</p>
              <p>La devozione al Crocifisso Nero rappresenta una tradizione profondamente radicata nella storia religiosa e culturale del paese.</p>
            </div>
          </AnimatedSection>

          {/* LA DEVOZIONE */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">La Devozione</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>La devozione al SS Crocifisso Nero è parte integrante della spiritualità delle comunità locali della Piana di Gioia Tauro.</p>
              <p>Da generazioni i fedeli si rivolgono al Crocifisso con preghiere, voti e ringraziamenti, affidando a questo simbolo sacro le proprie speranze, le difficoltà della vita quotidiana e i momenti di sofferenza.</p>
              <p>Il santuario rappresenta quindi un luogo di raccoglimento, fede e speranza, dove molti pellegrini tornano nel tempo per testimoniare la propria gratitudine.</p>
            </div>
          </AnimatedSection>

          {/* I MIRACOLI */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">I Miracoli</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Nel corso dei secoli la tradizione popolare ha tramandato numerose testimonianze di grazie e di eventi straordinari attribuiti al SS Crocifisso Nero.</p>
              <p>I fedeli raccontano di guarigioni, protezioni durante momenti difficili e interventi provvidenziali avvenuti dopo la preghiera davanti al simulacro.</p>
              <p>Queste testimonianze hanno contribuito a rafforzare la devozione verso il Crocifisso Nero e a rendere il santuario un punto di riferimento spirituale per l'intero territorio della Piana di Gioia Tauro.</p>
            </div>
          </AnimatedSection>

          {/* LE CELEBRAZIONI */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">Le Celebrazioni</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>La devozione al SS Crocifisso Nero trova la sua espressione più intensa nelle celebrazioni religiose che si svolgono ogni anno nei primi giorni di maggio a Terranova Sappo Minulio.</p>
              <h3 className="font-heading text-lg font-bold text-foreground pt-4">1 maggio – La Messa in Contrada Solì</h3>
              <p>Secondo la tradizione locale, la sera del primo maggio viene celebrata una messa in Contrada Solì, a Terranova Sappo Minulio, nel luogo in cui, secondo la leggenda, fu ritrovato il Santissimo Crocifisso Nero.</p>
              <h3 className="font-heading text-lg font-bold text-foreground pt-4">2 maggio – L'esposizione del Crocifisso</h3>
              <p>Nel giorno che precede la festa liturgica, intorno a mezzogiorno, il simulacro del Crocifisso Nero viene rimosso dalla pala che lo custodisce all'interno del santuario e viene esposto alla venerazione dei fedeli davanti all'altare.</p>
              <p>Durante il pomeriggio e la sera numerosi fedeli si recano in pellegrinaggio per pregare e rendere omaggio al Crocifisso.</p>
              <p>In serata il simulacro viene portato in processione fino alla chiesa matrice del paese, accompagnato dalla partecipazione dei fedeli e delle comunità locali.</p>
              <h3 className="font-heading text-lg font-bold text-foreground pt-4">3 maggio – La festa solenne</h3>
              <p>Il 3 maggio si celebra la solenne festa liturgica del SS Crocifisso Nero.</p>
              <p>Alle ore 11:00 viene celebrata la Santa Messa solenne nella chiesa matrice alla presenza dei fedeli e dei pellegrini provenienti dalle comunità locali e dai territori della Piana di Gioia Tauro.</p>
              <p>Al termine della celebrazione si svolge la tradizionale processione per le vie del paese, uno dei momenti più suggestivi della festa.</p>
              <p>Durante la processione partecipano anche i devoti chiamati "spinati", penitenti che indossano una corona di spine come segno di fede e devozione.</p>
              <p>Al termine del percorso il Crocifisso viene riportato nel santuario, dove rimane esposto alla venerazione dei fedeli.</p>
            </div>
          </AnimatedSection>

          {/* ── Sezioni Video ─────────────────────────────────────────────── */}
          <AnimatedSection>
            <div className="mt-12 mb-6">
              <p className="font-body text-muted-foreground leading-relaxed italic">
                La devozione al SS Crocifisso Nero raccontata attraverso immagini e testimonianze della tradizione locale.
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

          {/* FRASE SPIRITUALE */}
          <AnimatedSection>
            <blockquote className="mt-16 text-center max-w-2xl mx-auto">
              <span className="text-accent text-5xl md:text-6xl font-heading leading-none block mb-4">"</span>
              <p className="font-heading text-lg md:text-xl text-foreground leading-relaxed italic -mt-6">
                Davanti al Crocifisso Nero si concluderà il cammino dei 1000 km di Gratitudine, come gesto di fede e di ringraziamento.
              </p>
            </blockquote>
          </AnimatedSection>

          {/* IL COLLEGAMENTO CON IL CAMMINO */}
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">Il collegamento con il cammino</h2>
            <div className="font-body text-muted-foreground leading-relaxed space-y-4">
              <p>Il Santuario del SS Crocifisso Nero rappresenta la meta del cammino dei 1000 km di Gratitudine.</p>
              <p>Il viaggio parte dal Santuario della Madonna di San Luca a Bologna e attraversa l'Italia fino a raggiungere Terranova Sappo Minulio.</p>
              <p>Un percorso di 1000 chilometri che unisce fede, gratitudine e solidarietà.</p>
              <p>Questo cammino nasce come gesto di riconoscenza e si trasforma in un aiuto concreto a sostegno della prevenzione e della ricerca contro il tumore al seno.</p>
              <p className="text-foreground font-semibold">Tutte le donazioni raccolte durante il cammino sono destinate a Komen Italia – Comitato Emilia-Romagna.</p>
            </div>
          </AnimatedSection>

          {/* Frase forte storytelling */}
          <AnimatedSection>
            <p className="font-body text-muted-foreground leading-relaxed italic text-center mt-8 max-w-2xl mx-auto">
              Il cammino di 1000 km si concluderà davanti al Crocifisso Nero, simbolo di fede e di speranza per tante persone.
            </p>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection delay={0.2}>
            <div className="mt-12 text-center">
              <p className="font-heading text-lg md:text-xl font-bold text-foreground mb-2">
                Trasforma questo cammino in speranza
              </p>
              <p className="font-body text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
                Ogni contributo può aiutare a sostenere la prevenzione e la ricerca contro il tumore al seno.
              </p>
              <Button asChild variant="dona" size="lg" className="px-10 py-6">
                <Link to="/dona">
                  <Heart className="w-5 h-5 mr-2" />
                  DONA ORA
                </Link>
              </Button>
            </div>
          </AnimatedSection>

          {/* CTA FINALE BOX */}
          <AnimatedSection delay={0.3}>
            <div className="mt-12 text-center bg-primary rounded-lg p-10 md:p-14">
              <p className="font-heading text-xl md:text-2xl font-bold text-primary-foreground mb-4">
                1000 km di fede e gratitudine. Un unico obiettivo: sostenere la prevenzione e la ricerca contro il tumore al seno.
              </p>
              <Button asChild variant="dona" size="lg" className="text-base px-12 py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]">
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
