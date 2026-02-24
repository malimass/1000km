import { Link } from "react-router-dom";
import { Heart, Cross, FlaskConical, MapPin, Users, Share2, ArrowRight, Star, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";
import Countdown from "@/components/Countdown";
import heroBg from "@/assets/hero-cammino.jpg";
import sanLucaImg from "@/assets/san-luca.jpg";
import crocifissoImg from "@/assets/crocifisso-nero.jpg";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const Index = () => {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <Layout>
      {/* HERO — parallax + countdown */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.img
          src={heroBg}
          alt="Pellegrino cammina all'alba su un sentiero italiano"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ y: heroY }}
          loading="eager"
        />
        <div className="hero-overlay absolute inset-0" />
        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-body text-xs md:text-sm uppercase tracking-[0.3em] text-accent mb-6"
          >
            18 Aprile – 1 Maggio 2026
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold text-primary-foreground mb-4 leading-[1.1] tracking-wide"
          >
            1000 KM DI{" "}
            <span className="text-gradient">GRATITUDINE</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="font-body text-lg md:text-2xl text-primary-foreground/85 mb-10 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Un cammino di fede da Bologna alla Calabria.
            <br className="hidden sm:block" />
            Un gesto concreto per la ricerca.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          >
            <Button asChild variant="dona" size="lg" className="text-base px-10 py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]">
              <Link to="/dona">
                <Heart className="w-5 h-5 mr-2" />
                DONA ORA
              </Link>
            </Button>
            <Button asChild variant="hero" size="lg" className="text-base px-10 py-6">
              <Link to="/il-percorso">
                Scopri il percorso
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>

          {/* Countdown */}
          <Countdown targetDate="2026-04-18T06:00:00" className="mb-6" />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="text-primary-foreground/50 text-xs font-body flex items-center justify-center gap-2"
          >
            <Shield className="w-3 h-3" />
            Raccolta fondi solidale · Rendicontazione pubblica e trasparente
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 border-2 border-primary-foreground/30 rounded-full flex items-start justify-center pt-1"
          >
            <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* PERCHÉ */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              Perché questo cammino
            </h2>
            <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
              Tre valori che guidano ogni passo di questa impresa
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Cross className="w-10 h-10" />,
                title: "Fede",
                text: "Un percorso spirituale che unisce due santuari millenari, da nord a sud, in un abbraccio di devozione.",
              },
              {
                icon: <Heart className="w-10 h-10" />,
                title: "Gratitudine",
                text: "Ogni chilometro è un ringraziamento alla vita, alla salute, alle persone che rendono possibile il cambiamento.",
              },
              {
                icon: <FlaskConical className="w-10 h-10" />,
                title: "Ricerca",
                text: "I fondi raccolti sostengono la lotta contro i tumori al seno. Un gesto concreto per chi combatte.",
              },
            ].map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.15}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: "0 20px 40px -12px hsl(207 62% 11% / 0.12)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="bg-card rounded-lg p-8 text-center shadow-sm h-full border border-border/50"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-dona/10 text-dona mb-6">
                    {item.icon}
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{item.text}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CITAZIONE */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container-narrow px-4">
          <AnimatedSection>
            <blockquote className="text-center max-w-3xl mx-auto">
              <span className="text-accent text-6xl md:text-8xl font-heading leading-none block mb-4">"</span>
              <p className="font-heading text-xl md:text-2xl lg:text-3xl text-foreground leading-relaxed italic -mt-8">
                Non si cammina solo con i piedi, si cammina con il cuore. Ogni passo è una preghiera,
                ogni chilometro una promessa.
              </p>
              <footer className="mt-6 font-body text-sm text-muted-foreground">
                — Lo spirito di 1000kmdigratitudine
              </footer>
            </blockquote>
          </AnimatedSection>
        </div>
      </section>

      {/* NUMERI */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
              I numeri dell'impresa
            </h2>
            <p className="text-center text-primary-foreground/60 font-body mb-12 max-w-xl mx-auto">
              Un'impresa straordinaria che unisce sport, fede e solidarietà
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 1000, suffix: "", label: "Chilometri" },
              { value: 14, suffix: "", label: "Giorni" },
              { value: 2, suffix: "", label: "Santuari" },
              { value: 1, suffix: "", label: "Grande causa" },
            ].map((kpi, i) => (
              <AnimatedSection key={kpi.label} delay={i * 0.1}>
                <div className="text-center p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm">
                  <div className="font-heading text-4xl md:text-5xl font-bold text-accent mb-2">
                    <CountUp end={kpi.value} suffix={kpi.suffix} />
                  </div>
                  <div className="font-body text-sm text-primary-foreground/70 uppercase tracking-wider">
                    {kpi.label}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Progress bar */}
          <AnimatedSection delay={0.3}>
            <div className="mt-16 max-w-xl mx-auto">
              <div className="flex justify-between text-sm font-body mb-3">
                <span className="text-primary-foreground/70">Raccolta fondi</span>
                <span className="text-accent font-bold">€ 2.500 / € 50.000</span>
              </div>
              <div className="w-full h-4 bg-primary-foreground/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, hsl(340 82% 52%), hsl(29 87% 67%))",
                  }}
                  initial={{ width: 0 }}
                  whileInView={{ width: "5%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-center mt-4">
                <Button asChild variant="dona" size="lg" className="shadow-[0_0_30px_hsl(340_82%_52%/0.25)]">
                  <Link to="/dona">
                    <Heart className="w-4 h-4 mr-2" />
                    Contribuisci ora
                  </Link>
                </Button>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* SANTUARI */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              I due Santuari
            </h2>
            <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
              Due luoghi sacri uniti da un cammino di fede e solidarietà
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                img: sanLucaImg,
                alt: "Santuario della Madonna di San Luca, Bologna",
                title: "Madonna di San Luca",
                location: "Bologna — Partenza",
                desc: "Il santuario che domina Bologna dal colle della Guardia, meta di pellegrinaggi da secoli. Punto di partenza del nostro cammino.",
                to: "/madonna-di-san-luca",
              },
              {
                img: crocifissoImg,
                alt: "Santuario del SS Crocifisso Nero, Terranova Sappo Minulio",
                title: "SS Crocifisso Nero",
                location: "Terranova Sappo Minulio — Arrivo",
                desc: "Custode di una devozione millenaria nel cuore della Calabria. Il traguardo spirituale del cammino di gratitudine.",
                to: "/ss-crocifisso-nero",
              },
            ].map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.2}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="group rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow bg-card h-full border border-border/50"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <img
                      src={s.img}
                      alt={s.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-4">
                      <span className="font-body text-xs uppercase tracking-wider text-primary-foreground/90 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {s.location}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-xl font-bold text-foreground mb-2">{s.title}</h3>
                    <p className="text-muted-foreground font-body text-sm leading-relaxed mb-4">{s.desc}</p>
                    <Button asChild variant="dona-outline" size="sm">
                      <Link to={s.to}>
                        Scopri la storia e i miracoli
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* COME AIUTARE */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              Come puoi aiutare
            </h2>
            <p className="text-center text-muted-foreground font-body mb-12 max-w-xl mx-auto">
              Ogni gesto, grande o piccolo, fa la differenza
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Dona",
                text: "Ogni contributo, grande o piccolo, diventa speranza concreta per la ricerca.",
                cta: "Dona ora",
                to: "/dona",
                highlight: true,
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Sostenitori del cammino",
                text: "Scopri le aziende e le persone che sostengono i 1000 km di gratitudine.",
                cta: "Scopri i sostenitori",
                to: "/sostenitori",
              },
              {
                icon: <Share2 className="w-8 h-8" />,
                title: "Condividi",
                text: "Diffondi il messaggio. Ogni condivisione avvicina qualcuno alla causa.",
                cta: "Condividi il progetto",
                to: "#",
              },
            ].map((card, i) => (
              <AnimatedSection key={card.title} delay={i * 0.15}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: "0 20px 40px -12px hsl(207 62% 11% / 0.12)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`rounded-lg p-8 text-center h-full flex flex-col border ${
                    card.highlight
                      ? "bg-dona/5 border-dona/20 shadow-md"
                      : "bg-card border-border/50 shadow-sm"
                  }`}
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 mx-auto ${
                    card.highlight ? "bg-dona/15 text-dona" : "bg-dona/10 text-dona"
                  }`}>
                    {card.icon}
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-3">{card.title}</h3>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed mb-6 flex-1">{card.text}</p>
                  <Button asChild variant={card.highlight ? "dona" : "dona-outline"} size="sm">
                    <Link to={card.to}>{card.cta}</Link>
                  </Button>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>

          {/* CTA finale */}
          <AnimatedSection delay={0.3}>
            <div className="text-center bg-primary rounded-lg p-10 md:p-14">
              <h3 className="font-heading text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                Trasforma un passo in speranza
              </h3>
              <p className="font-body text-primary-foreground/70 mb-8 max-w-lg mx-auto">
                Ogni donazione sostiene la ricerca contro i tumori al seno. Insieme possiamo fare la differenza.
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
};

export default Index;
