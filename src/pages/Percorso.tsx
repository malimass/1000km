import { Link } from "react-router-dom";
import { Heart, MapPin, ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import percorsoHero from "@/assets/percorso-hero.jpg";
import { motion } from "framer-motion";

const tappe = [
  { giorno: 1, da: "Bologna", a: "Modena", km: 60, data: "18 aprile" },
  { giorno: 2, da: "Modena", a: "Reggio Emilia", km: 50, data: "19 aprile" },
  { giorno: 3, da: "Reggio Emilia", a: "Parma", km: 55, data: "20 aprile" },
  { giorno: 4, da: "Parma", a: "Pontremoli", km: 80, data: "21 aprile" },
  { giorno: 5, da: "Pontremoli", a: "La Spezia", km: 65, data: "22 aprile" },
  { giorno: 6, da: "La Spezia", a: "Lucca", km: 75, data: "23 aprile" },
  { giorno: 7, da: "Lucca", a: "Firenze", km: 80, data: "24 aprile" },
  { giorno: 8, da: "Firenze", a: "Arezzo", km: 85, data: "25 aprile" },
  { giorno: 9, da: "Arezzo", a: "Perugia", km: 75, data: "26 aprile" },
  { giorno: 10, da: "Perugia", a: "Terni", km: 80, data: "27 aprile" },
  { giorno: 11, da: "Terni", a: "Rieti", km: 60, data: "28 aprile" },
  { giorno: 12, da: "Rieti", a: "Caserta", km: 90, data: "29 aprile" },
  { giorno: 13, da: "Caserta", a: "Cosenza", km: 85, data: "30 aprile" },
  { giorno: 14, da: "Cosenza", a: "Terranova Sappo Minulio", km: 60, data: "1 maggio" },
];

export default function Percorso() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <img src={percorsoHero} alt="Percorso aereo campagna italiana" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="font-heading text-4xl md:text-5xl font-bold text-primary-foreground mb-4">Il Percorso</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="font-body text-primary-foreground/80 text-lg">1000 km dal cuore dell'Emilia al cuore della Calabria</motion.p>
        </div>
      </section>

      {/* Mappa placeholder */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Mappa del percorso</h2>
            <div className="bg-card rounded-lg shadow-sm p-8 flex items-center justify-center min-h-[300px] border border-border">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-dona mx-auto mb-4" />
                <p className="text-muted-foreground font-body">Mappa interattiva in arrivo</p>
                <p className="text-muted-foreground/60 font-body text-sm mt-2">Bologna → Terranova Sappo Minulio</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Le 14 tappe</h2>
          </AnimatedSection>
          <div className="space-y-4 max-w-3xl mx-auto">
            {tappe.map((t, i) => (
              <AnimatedSection key={t.giorno} delay={i * 0.05}>
                <div className="flex items-start gap-4 bg-card rounded-lg p-4 shadow-sm border border-border hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-dona/10 text-dona flex items-center justify-center font-heading font-bold text-lg">
                    {t.giorno}
                  </div>
                  <div className="flex-1">
                    <div className="font-body font-semibold text-foreground">
                      {t.da} → {t.a}
                    </div>
                    <div className="text-muted-foreground text-sm font-body">
                      {t.data} · {t.km} km
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Segui in diretta */}
      <section className="section-padding bg-primary text-primary-foreground">
        <div className="container-narrow text-center">
          <AnimatedSection>
            <Radio className="w-12 h-12 text-dona mx-auto mb-6" />
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">Segui in diretta</h2>
            <p className="font-body text-primary-foreground/70 mb-8 max-w-xl mx-auto">
              Dal 18 aprile al 1 maggio 2026, segui ogni tappa in tempo reale sui nostri canali social.
            </p>
            <Button asChild variant="dona" size="lg">
              <Link to="/dona">
                <Heart className="w-4 h-4 mr-2" />
                DONA ORA
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
