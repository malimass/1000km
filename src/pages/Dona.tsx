import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Shield, Users, TrendingUp, ExternalLink, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { motion } from "framer-motion";
import { loadRaccoltaFondi, subscribeRaccoltaFondi, type RaccoltaFondi } from "@/lib/notizie";

const KOMEN_URL = "https://komen.it/sostienici/progetti/";

const donationTiers = [
  { value: 10,  label: "Un passo",     desc: "Sostieni un chilometro del cammino" },
  { value: 25,  label: "Un tratto",    desc: "Copri una tappa della giornata" },
  { value: 50,  label: "Una giornata", desc: "Sostieni un'intera giornata di cammino" },
  { value: 100, label: "Un abbraccio", desc: "Un contributo significativo alla ricerca" },
];

const projects = [
  "Sostieni Komen Italia",
  "Carovana della Prevenzione",
  "Progetto donne al centro",
  "Centro di terapie integrate",
];

const trustBadges = [
  { icon: <Shield className="w-5 h-5" />, text: "100% trasparente" },
  { icon: <Heart className="w-5 h-5" />,  text: "100% alla ricerca" },
  { icon: <Users className="w-5 h-5" />,  text: "Rendicontazione pubblica" },
];

function formatEuro(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

type Step = "importo" | "dati" | "completato";

export default function Dona() {
  const [raccolta, setRaccolta] = useState<RaccoltaFondi | null>(null);

  useEffect(() => {
    loadRaccoltaFondi().then(r => { if (r) setRaccolta(r); });
    return subscribeRaccoltaFondi(r => setRaccolta(r));
  }, []);

  const importo  = raccolta?.importo_euro ?? 2500;
  const target   = raccolta?.target_euro  ?? 50000;
  const donatori = raccolta?.donatori     ?? 42;
  const pct      = Math.min(100, (importo / target) * 100);

  // ── Flusso donazione ──
  const [step, setStep]           = useState<Step>("importo");
  const [selected, setSelected]   = useState<number | null>(null);
  const [customAmt, setCustomAmt] = useState("");
  const [progetto, setProgetto]   = useState(projects[0]);
  const [nome, setNome]           = useState("");
  const [cognome, setCognome]     = useState("");
  const [email, setEmail]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const finalAmount = selected ?? (customAmt ? Number(customAmt) : 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || finalAmount <= 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/donazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          importo_euro: finalAmount,
          progetto,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Errore nel salvataggio");
        setSaving(false);
        return;
      }
      // Aggiorna contatore locale
      setRaccolta(prev => prev ? {
        ...prev,
        importo_euro: prev.importo_euro + finalAmount,
        donatori: prev.donatori + 1,
      } : prev);
      setStep("completato");
    } catch {
      setError("Errore di rete. Riprova.");
    }
    setSaving(false);
  }

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

          {/* Raccolta fondi live */}
          <AnimatedSection>
            <div className="mb-10 bg-primary rounded-xl p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-dona" />
                <span className="font-heading text-sm uppercase tracking-widest text-primary-foreground/70 font-bold">
                  Raccolta fondi in tempo reale
                </span>
              </div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="font-heading text-3xl font-bold text-primary-foreground">
                    {formatEuro(importo)}
                  </span>
                  <span className="font-body text-primary-foreground/50 text-sm ml-2">
                    raccolti su {formatEuro(target)}
                  </span>
                </div>
                <span className="font-heading text-accent font-bold text-lg">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-primary-foreground/10 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(340 82% 52%), hsl(29 87% 67%))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <p className="font-body text-primary-foreground/50 text-xs text-center">
                <span className="text-accent font-semibold">{donatori} donatori</span> hanno già contribuito · Obiettivo: {formatEuro(target)} per la ricerca
              </p>
            </div>
          </AnimatedSection>

          {/* ══ STEP 1: Scegli importo ══ */}
          {step === "importo" && (
            <AnimatedSection>
              <div className="bg-card rounded-xl p-8 md:p-12 shadow-lg border border-border/50">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-2 text-center">
                  1. Scegli il tuo contributo
                </h2>
                <p className="text-muted-foreground font-body leading-relaxed mb-8 text-center max-w-lg mx-auto">
                  La raccolta fondi è interamente destinata alla lotta contro i tumori al seno tramite Komen Italia.
                </p>

                {/* Tiers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {donationTiers.map((tier) => (
                    <motion.button
                      key={tier.value}
                      type="button"
                      onClick={() => { setSelected(tier.value); setCustomAmt(""); }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className={`rounded-xl border-2 p-4 text-left transition-colors ${
                        selected === tier.value
                          ? "border-dona bg-dona/10 ring-2 ring-dona/30"
                          : "border-border hover:border-dona bg-card hover:bg-dona/5"
                      }`}
                    >
                      <span className={`font-heading text-2xl font-bold block mb-1 transition-colors ${
                        selected === tier.value ? "text-dona" : "text-foreground"
                      }`}>
                        € {tier.value}
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

                {/* Importo libero */}
                <div className="flex items-center gap-3 mb-8">
                  <span className="font-body text-sm text-muted-foreground whitespace-nowrap">Oppure:</span>
                  <div className="relative flex-1 max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">€</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Importo libero"
                      value={customAmt}
                      onChange={e => { setCustomAmt(e.target.value); setSelected(null); }}
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                    />
                  </div>
                </div>

                {/* Scegli progetto */}
                <div className="mb-8">
                  <label className="block font-body text-sm font-semibold text-foreground mb-2">
                    Scegli il progetto da sostenere
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {projects.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProgetto(p)}
                        className={`text-left rounded-lg border px-3 py-2.5 font-body text-sm transition-colors ${
                          progetto === p
                            ? "border-dona bg-dona/10 text-dona font-semibold"
                            : "border-border text-muted-foreground hover:border-dona/50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="dona"
                  size="lg"
                  className="w-full shadow-[0_0_30px_hsl(340_82%_52%/0.25)]"
                  disabled={finalAmount <= 0}
                  onClick={() => setStep("dati")}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Avanti — {finalAmount > 0 ? `€ ${finalAmount}` : "Scegli un importo"}
                </Button>
              </div>
            </AnimatedSection>
          )}

          {/* ══ STEP 2: Dati donatore ══ */}
          {step === "dati" && (
            <AnimatedSection>
              <div className="bg-card rounded-xl p-8 md:p-12 shadow-lg border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    2. I tuoi dati
                  </h2>
                  <span className="font-heading text-dona font-bold text-lg">€ {finalAmount}</span>
                </div>
                <p className="text-muted-foreground font-body text-sm mb-6">
                  Progetto: <strong className="text-foreground">{progetto}</strong>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome *</label>
                      <input
                        required
                        type="text"
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                        placeholder="Mario"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Cognome</label>
                      <input
                        type="text"
                        value={cognome}
                        onChange={e => setCognome(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                        placeholder="Rossi"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Email *</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                      placeholder="mario@email.com"
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm font-body">{error}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => setStep("importo")}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Indietro
                    </Button>
                    <Button
                      type="submit"
                      variant="dona"
                      size="lg"
                      className="flex-1 shadow-[0_0_30px_hsl(340_82%_52%/0.25)]"
                      disabled={saving || !nome.trim() || !email.trim()}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className="w-4 h-4 mr-2" />
                      )}
                      Conferma e Dona € {finalAmount}
                    </Button>
                  </div>
                </form>
              </div>
            </AnimatedSection>
          )}

          {/* ══ STEP 3: Completato — redirect a Komen ══ */}
          {step === "completato" && (
            <AnimatedSection>
              <div className="bg-card rounded-xl p-8 md:p-12 shadow-lg border border-border/50 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6"
                >
                  <Check className="w-8 h-8" />
                </motion.div>

                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
                  Grazie, {nome}!
                </h2>
                <p className="text-muted-foreground font-body mb-2">
                  La tua intenzione di donare <strong className="text-dona">€ {finalAmount}</strong> al progetto
                  "<strong>{progetto}</strong>" è stata registrata.
                </p>
                <p className="text-muted-foreground font-body mb-8">
                  Completa ora la donazione direttamente sul sito di <strong>Komen Italia</strong>.
                </p>

                <div className="flex flex-col gap-3 max-w-md mx-auto">
                  <Button
                    variant="dona"
                    size="lg"
                    className="w-full shadow-[0_0_30px_hsl(340_82%_52%/0.25)]"
                    onClick={() => window.open(KOMEN_URL, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Completa la donazione su Komen Italia
                  </Button>
                  <p className="text-muted-foreground/60 font-body text-xs">
                    Verrai reindirizzato su komen.it per completare il pagamento in sicurezza.
                  </p>
                  <div className="border-t border-border pt-4 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStep("importo");
                        setSelected(null);
                        setCustomAmt("");
                        setNome("");
                        setCognome("");
                        setEmail("");
                      }}
                    >
                      Fai un'altra donazione
                    </Button>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
