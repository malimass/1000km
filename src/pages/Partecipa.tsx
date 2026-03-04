/**
 * Partecipa.tsx
 * ─────────────
 * Pagina pubblica di presentazione del progetto:
 * perché partecipare a una tappa, obiettivo raccolta fondi Komen Italia
 * e lista delle 14 tappe con CTA iscrizione.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, MapPin, Users, Ribbon, ArrowRight, Footprints } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { tappe } from "@/lib/tappe";

// ─── Motivi per partecipare ───────────────────────────────────────────────────

const motivi = [
  {
    icon: <Heart className="w-7 h-7 text-dona" />,
    titolo: "Una causa che salva vite",
    testo:
      "Ogni passo che fai contribuisce alla raccolta fondi per Komen Italia, l'organizzazione leader nella lotta al cancro al seno. I fondi raccolti finanziano la ricerca scientifica e il supporto alle pazienti.",
  },
  {
    icon: <Footprints className="w-7 h-7 text-dona" />,
    titolo: "Cammina o corri — a modo tuo",
    testo:
      "Puoi scegliere una sola tappa o più tappe consecutive. Non serve essere atleti: il cammino è aperto a tutti, a qualsiasi ritmo. L'importante è esserci e portare il tuo contributo.",
  },
  {
    icon: <Users className="w-7 h-7 text-dona" />,
    titolo: "Fai parte di qualcosa di grande",
    testo:
      "Sarai parte di una comunità di persone che attraversano l'Italia con un obiettivo comune: ricordare, ringraziare e dare speranza. Ogni partecipante porta la propria storia e la propria gratitudine.",
  },
  {
    icon: <MapPin className="w-7 h-7 text-dona" />,
    titolo: "Un percorso unico, 1000 km",
    testo:
      "Da Bologna a Terranova Sappo Minulio (Calabria), 14 tappe attraverso l'Adriatico, gli Appennini e la Tirrenica. Un viaggio spirituale che unisce il Nord e il Sud dell'Italia.",
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

export default function Partecipa() {
  return (
    <Layout>
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground py-20 md:py-28 px-4">
        <div className="container-narrow text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 text-accent font-heading text-xs uppercase tracking-widest font-bold mb-4">
              <Ribbon className="w-4 h-4" />
              18 aprile — 1 maggio 2026
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-5">
              Partecipa al cammino.<br />
              <span className="text-accent">Cambia una vita.</span>
            </h1>
            <p className="font-body text-primary-foreground/80 text-lg leading-relaxed mb-8">
              1000 km da Bologna a Terranova Sappo Minulio in 14 tappe.
              Un pellegrinaggio di fede, gratitudine e solidarietà
              per raccogliere fondi a favore di <strong className="text-primary-foreground">Komen Italia</strong>,
              nella lotta al cancro al seno.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="dona" size="lg" className="text-base px-8">
                <Link to="/iscriviti">
                  <Heart className="w-4 h-4 mr-2" />
                  Iscriviti a una tappa
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/dona">
                  Dona ora
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Obiettivo raccolta fondi ─────────────────────────────────────────── */}
      <section className="bg-dona/5 border-y border-dona/20 py-14 px-4">
        <div className="container-narrow max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dona/15 mb-5">
              <Ribbon className="w-8 h-8 text-dona" />
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
              Obiettivo: €50.000 per Komen Italia
            </h2>
            <p className="font-body text-muted-foreground text-base leading-relaxed max-w-xl mx-auto mb-6">
              Komen Italia è l'organizzazione più importante in Italia nella lotta al cancro al seno.
              I fondi raccolti durante il cammino finanzieranno la ricerca scientifica,
              i programmi di screening e il supporto concreto alle donne colpite dalla malattia.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
              {[
                { valore: "€50.000", etichetta: "Obiettivo raccolta" },
                { valore: "1.000 km", etichetta: "Da percorrere insieme" },
                { valore: "14 tappe", etichetta: "Aperte a tutti" },
              ].map(({ valore, etichetta }) => (
                <div key={etichetta} className="bg-background rounded-xl p-5 shadow-sm border border-border">
                  <p className="font-heading text-3xl font-bold text-dona">{valore}</p>
                  <p className="font-body text-sm text-muted-foreground mt-1">{etichetta}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Endorsement Komen ───────────────────────────────────────────────── */}
      <section className="bg-background py-14 px-4">
        <div className="container-narrow max-w-2xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="bg-dona/5 border border-dona/25 rounded-2xl p-8 text-center"
          >
            <Ribbon className="w-8 h-8 text-dona mx-auto mb-4" />
            <blockquote className="font-body text-base md:text-lg text-foreground italic leading-relaxed mb-6">
              "Grazie per la vostra bellissima mail e per aver deciso di supportare i progetti di Komen Comitato Emilia Romagna,
              che da <strong>18 anni</strong> portiamo avanti con tanto amore e restituzione alle tantissime donne
              che ogni anno incontrano il tumore al seno.
              Siamo felici di condividere il nostro logo e di menzionare questa <strong>nobile iniziativa</strong>."
            </blockquote>
            <div>
              <p className="font-heading text-sm font-bold text-foreground">Rossella Magliulo</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                Manager &amp; Secretary Committee Coordinator — Komen Comitato Emilia Romagna
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Perché partecipare ───────────────────────────────────────────────── */}
      <section className="section-padding px-4 bg-background">
        <div className="container-narrow max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
              Perché partecipare?
            </h2>
            <p className="font-body text-muted-foreground text-base">
              Non è solo un cammino — è un atto di amore, fede e solidarietà.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            {motivi.map((m) => (
              <motion.div
                key={m.titolo}
                variants={fadeUp}
                className="bg-card border border-border rounded-xl p-6 flex gap-4"
              >
                <div className="shrink-0 mt-0.5">{m.icon}</div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground mb-1">{m.titolo}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{m.testo}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Le 14 tappe ─────────────────────────────────────────────────────── */}
      <section className="section-padding px-4 bg-muted/30">
        <div className="container-narrow max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
              Le 14 tappe
            </h2>
            <p className="font-body text-muted-foreground text-base">
              Scegli la tappa che fa per te e registrati gratuitamente.
            </p>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            {tappe.map((t) => (
              <motion.div key={t.giorno} variants={fadeUp}>
                <Link
                  to={`/iscriviti?tappa=${t.giorno}`}
                  className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 hover:border-dona/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-heading text-sm font-bold text-dona/70 w-7 shrink-0">
                      {String(t.giorno).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-body text-sm font-semibold text-foreground">
                        {t.da} → {t.a}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {t.data} · {t.km} km
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-dona transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA finale ──────────────────────────────────────────────────────── */}
      <section className="section-padding px-4 bg-primary text-primary-foreground text-center">
        <motion.div
          className="container-narrow max-w-xl mx-auto"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Pronto a fare la tua parte?
          </h2>
          <p className="font-body text-primary-foreground/80 mb-8 text-base leading-relaxed">
            Iscriviti a una tappa, dona quello che puoi, oppure traccia la tua attività
            sulla mappa live per supportare il cammino da casa tua.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="dona" size="lg" className="text-base px-8">
              <Link to="/iscriviti">
                <Heart className="w-4 h-4 mr-2" />
                Iscriviti a una tappa
              </Link>
            </Button>
            <Button asChild size="lg" className="text-base px-8 bg-primary-foreground/10 border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
              <Link to="/accedi">
                <Footprints className="w-4 h-4 mr-2" />
                Traccia la tua attività
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
