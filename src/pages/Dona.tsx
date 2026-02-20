import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Shield, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { motion } from "framer-motion";

const donationTiers = [
  { amount: "€ 10", label: "Un passo", desc: "Sostieni un chilometro del cammino" },
  { amount: "€ 25", label: "Un tratto", desc: "Copri una tappa della giornata" },
  { amount: "€ 50", label: "Una giornata", desc: "Sostieni un'intera giornata di cammino" },
  { amount: "€ 100", label: "Un abbraccio", desc: "Un contributo significativo alla ricerca" },
];

const trustBadges = [
  { icon: <Shield className="w-5 h-5" />, text: "100% trasparente" },
  { icon: <Heart className="w-5 h-5" />, text: "Destinato a Komen Italia" },
  { icon: <Users className="w-5 h-5" />, text: "Rendicontazione pubblica" },
];

export default function Dona() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[45vh] flex items-center justify-center bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(340_82%_52%/0.15)_0%,_transparent_70%)]" />
        <div className="relative text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dona/20 text-dona mb-6"
          >
            <Heart className="w-8 h-8" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4"
          >
            Dona Ora
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="font-body text-primary-foreground/80 max-w-md mx-auto"
          >
            Ogni contributo conta. Sostieni la ricerca contro i tumori al seno.
          </motion.p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          {/* Trust badges */}
          <AnimatedSection>
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {trustBadges.map((b) => (
                <div key={b.text} className="flex items-center gap-2 text-muted-foreground font-body text-sm">
                  <span className="text-dona">{b.icon}</span>
                  {b.text}
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* Donation card */}
          <AnimatedSection>
            <div className="bg-card rounded-xl p-8 md:p-12 shadow-lg border border-border/50">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">Sostieni Komen Italia</h2>
              <p className="text-muted-foreground font-body leading-relaxed mb-10 text-center max-w-lg mx-auto">
                La raccolta fondi è interamente destinata a <strong className="text-dona">Komen Italia</strong> per la lotta contro i tumori al seno.
              </p>

              {/* Tiers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {donationTiers.map((tier, i) => (
                  <motion.button
                    key={tier.amount}
                    whileHover={{ scale: 1.04, borderColor: "hsl(340, 82%, 52%)" }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-xl border-2 border-border hover:border-dona bg-card hover:bg-dona/5 p-4 text-left transition-colors group"
                  >
                    <span className="font-heading text-2xl font-bold text-foreground block mb-1 group-hover:text-dona transition-colors">
                      {tier.amount}
                    </span>
                    <span className="font-body text-xs font-semibold uppercase tracking-wider text-dona block mb-1">
                      {tier.label}
                    </span>
                    <span className="font-body text-xs text-muted-foreground leading-snug block">
                      {tier.desc}
                    </span>
                  </motion.button>
                ))}
              </div>

              <p className="text-muted-foreground/60 font-body text-sm mb-8 text-center">
                <Clock className="w-4 h-4 inline mr-1 -mt-0.5" />
                La piattaforma di pagamento sarà attivata a breve. Per donazioni immediate, contattaci direttamente.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="dona" size="lg" className="shadow-[0_0_30px_hsl(340_82%_52%/0.25)]">
                  <Link to="/contatti">
                    <Heart className="w-4 h-4 mr-2" />
                    Contattaci per donare
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna alla home
                  </Link>
                </Button>
              </div>
            </div>
          </AnimatedSection>

          {/* Progress bar */}
          <AnimatedSection delay={0.2}>
            <div className="mt-12 bg-primary rounded-xl p-8">
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
                  transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                />
              </div>
              <p className="text-center text-primary-foreground/50 text-xs font-body mt-3">
                Ogni euro fa la differenza. Obiettivo: € 50.000 per la ricerca.
              </p>
            </div>
          </AnimatedSection>

          {/* Social proof */}
          <AnimatedSection delay={0.3}>
            <div className="mt-8 text-center">
              <p className="font-body text-sm text-muted-foreground">
                <span className="text-dona font-bold">42 persone</span> hanno già donato.
                Unisciti a loro.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
