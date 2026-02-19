import { Link } from "react-router-dom";
import { Heart, Cross, FlaskConical, MapPin, Users, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import heroBg from "@/assets/hero-cammino.jpg";
import sanLucaImg from "@/assets/san-luca.jpg";
import crocifissoImg from "@/assets/crocifisso-nero.jpg";

const Index = () => {
  return (
    <Layout>
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt="Pellegrino cammina all'alba su un sentiero italiano"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight tracking-wide">
            1000 KM DI <span className="text-accent">GRATITUDINE</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Un cammino di fede. Un gesto concreto per la ricerca.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button asChild variant="dona" size="lg" className="text-base px-10 py-6">
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
          </div>
          <p className="text-primary-foreground/60 text-sm font-body">
            Raccolta fondi a favore di <strong className="text-accent">Komen Italia</strong> con rendicontazione pubblica.
          </p>
        </div>
      </section>

      {/* PERCHÉ */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Perché questo cammino
          </h2>
          <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
            Tre valori che guidano ogni passo di questa impresa
          </p>
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
                text: "I fondi raccolti sostengono Komen Italia nella lotta contro i tumori al seno. Un gesto concreto per chi combatte.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-card rounded-lg p-8 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-dona/10 text-dona mb-6">
                  {item.icon}
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUMERI */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container-narrow">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">
            I numeri dell'impresa
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "1000", label: "Chilometri" },
              { value: "14", label: "Giorni" },
              { value: "2", label: "Santuari" },
              { value: "1", label: "Grande causa" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="text-center p-6 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10"
              >
                <div className="font-heading text-4xl md:text-5xl font-bold text-accent mb-2">
                  {kpi.value}
                </div>
                <div className="font-body text-sm text-primary-foreground/70 uppercase tracking-wider">
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-12 max-w-xl mx-auto">
            <div className="flex justify-between text-sm font-body mb-2">
              <span className="text-primary-foreground/70">Raccolta fondi</span>
              <span className="text-accent font-bold">€ 2.500 / € 50.000</span>
            </div>
            <div className="w-full h-3 bg-primary-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-dona rounded-full transition-all duration-1000"
                style={{ width: "5%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SANTUARI */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            I due Santuari
          </h2>
          <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
            Due luoghi sacri uniti da un cammino di fede e solidarietà
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                img: sanLucaImg,
                alt: "Santuario della Madonna di San Luca, Bologna",
                title: "Madonna di San Luca",
                desc: "Il santuario che domina Bologna dal colle della Guardia, meta di pellegrinaggi da secoli. Punto di partenza del nostro cammino.",
                to: "/madonna-di-san-luca",
              },
              {
                img: crocifissoImg,
                alt: "Santuario del SS Crocifisso Nero, Terranova Sappo Minulio",
                title: "SS Crocifisso Nero",
                desc: "Custode di una devozione millenaria nel cuore della Calabria. Il traguardo spirituale del cammino di gratitudine.",
                to: "/ss-crocifisso-nero",
              },
            ].map((s) => (
              <div
                key={s.title}
                className="group rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-card"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COME AIUTARE */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            Come puoi aiutare
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Dona",
                text: "Ogni contributo, grande o piccolo, diventa speranza concreta per la ricerca.",
                cta: "Dona ora",
                to: "/dona",
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Diventa Sponsor",
                text: "Associa il tuo brand a un progetto di valore. Visibilità garantita e impatto sociale reale.",
                cta: "Scopri i pacchetti",
                to: "/sponsor",
              },
              {
                icon: <Share2 className="w-8 h-8" />,
                title: "Condividi",
                text: "Diffondi il messaggio. Ogni condivisione avvicina qualcuno alla causa.",
                cta: "Condividi il progetto",
                to: "#",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card rounded-lg p-8 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dona/10 text-dona mb-6">
                  {card.icon}
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-3">{card.title}</h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed mb-6">{card.text}</p>
                <Button asChild variant="dona-outline" size="sm">
                  <Link to={card.to}>{card.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          {/* CTA finale */}
          <div className="text-center">
            <Button asChild variant="dona" size="lg" className="text-base px-12 py-6">
              <Link to="/dona">
                <Heart className="w-5 h-5 mr-2" />
                Trasforma un passo in speranza
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom spacer for mobile sticky button */}
      <div className="h-16 lg:hidden" />
    </Layout>
  );
};

export default Index;
