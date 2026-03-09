import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Shield, Users, Check, Loader2, CreditCard, Landmark, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { motion } from "framer-motion";
import { loadRaccoltaFondi, subscribeRaccoltaFondi, type RaccoltaFondi } from "@/lib/notizie";

declare global {
  interface Window { SumUpCard: any; }
}

const donationTiers = [
  { value: 10,  label: "Un passo",     desc: "Sostieni un chilometro del cammino" },
  { value: 25,  label: "Un tratto",    desc: "Copri una tappa della giornata" },
  { value: 50,  label: "Una giornata", desc: "Sostieni un'intera giornata di cammino" },
  { value: 100, label: "Un abbraccio", desc: "Un contributo significativo alla ricerca" },
];

const PROGETTO = "1000km Di Gratitudine";

const trustBadges = [
  { icon: <Shield className="w-5 h-5" />, text: "100% trasparente" },
  { icon: <Heart className="w-5 h-5" />,  text: "100% alla ricerca" },
  { icon: <Users className="w-5 h-5" />,  text: "Rendicontazione pubblica" },
];

function formatEuro(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function BonificoField({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1">
      <span className="font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-body text-sm text-foreground font-medium select-all">{value}</span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Copia"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Load SumUp SDK script once */
function useSumUpSdk() {
  const [ready, setReady] = useState(!!window.SumUpCard);
  useEffect(() => {
    if (window.SumUpCard) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

type Step = "importo" | "dati" | "pagamento" | "completato";

export default function Dona() {
  const [raccolta, setRaccolta] = useState<RaccoltaFondi | null>(null);
  const sdkReady = useSumUpSdk();

  useEffect(() => {
    loadRaccoltaFondi().then(r => { if (r) setRaccolta(r); });
    return subscribeRaccoltaFondi(r => setRaccolta(r));
  }, []);

  const importo  = raccolta?.importo_euro ?? 2500;
  const donatori = raccolta?.donatori     ?? 42;

  // ── Flusso donazione ──
  const [step, setStep]           = useState<Step>("importo");
  const [selected, setSelected]   = useState<number | null>(null);
  const [customAmt, setCustomAmt] = useState("");
  const progetto = PROGETTO;
  const [nome, setNome]           = useState("");
  const [cognome, setCognome]     = useState("");
  const [email, setEmail]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);

  const finalAmount = selected ?? (customAmt ? Number(customAmt) : 0);

  // Refs to keep checkout info across steps
  const checkoutIdRef = useRef<string>("");
  const checkoutRefRef = useRef<string>("");

  // ── Crea checkout SumUp e monta widget ──
  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || finalAmount <= 0) return;
    setSaving(true);
    setError("");

    try {
      // 1. Salva donazione nel nostro DB come "pendente"
      const donRes = await fetch("/api/donazioni", {
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
      if (!donRes.ok) {
        const d = await donRes.json();
        throw new Error(d.error ?? "Errore nel salvataggio");
      }
      const { donazione_id } = await donRes.json();

      // 2. Crea checkout SumUp
      const resp = await fetch("/api/sumup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          progetto,
          donazione_id,
        }),
      });

      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error ?? "Errore creazione pagamento");
      }

      const { id: checkoutId, checkout_reference } = await resp.json();
      checkoutIdRef.current = checkoutId;
      checkoutRefRef.current = checkout_reference;

      // 3. Vai allo step pagamento
      setStep("pagamento");
      setSaving(false);

      // 4. Monta widget SumUp (dopo render)
      setTimeout(() => {
        if (!window.SumUpCard || !widgetRef.current) return;
        if (window.SumUpCard.unmount) {
          try { window.SumUpCard.unmount("sumup-card"); } catch {}
        }
        window.SumUpCard.mount({
          id: "sumup-card",
          checkoutId,
          email: email.trim(),
          locale: "it-IT",
          onResponse: async (type: string, body: any) => {
            if (type === "success") {
              // Conferma pagamento server-side (verifica con SumUp + aggiorna contatore)
              try {
                const confirmRes = await fetch("/api/sumup-confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    checkout_id: checkoutIdRef.current,
                    checkout_reference: checkoutRefRef.current,
                  }),
                });
                if (confirmRes.ok) {
                  // Aggiorna contatore locale solo dopo conferma server
                  setRaccolta(prev => prev ? {
                    ...prev,
                    importo_euro: prev.importo_euro + finalAmount,
                    donatori: prev.donatori + 1,
                  } : prev);
                }
              } catch {
                // Conferma fallita, ma il pagamento è ok — verrà riconciliato
              }
              setStep("completato");
            } else if (type === "error") {
              setError(body?.message ?? "Pagamento non riuscito. Riprova.");
            }
          },
        });
      }, 100);
    } catch (err: any) {
      setError(err.message ?? "Errore di rete. Riprova.");
      setSaving(false);
    }
  }

  function resetForm() {
    setStep("importo");
    setSelected(null);
    setCustomAmt("");
    setNome("");
    setCognome("");
    setEmail("");
    setError("");
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
            <div className="mb-10 rounded-2xl overflow-hidden border border-dona/20 shadow-lg">
              {/* Header gradient */}
              <div className="bg-gradient-to-r from-dona/90 to-dona/70 px-6 py-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-white" />
                <span className="font-heading text-sm uppercase tracking-widest text-white/90 font-bold">
                  Raccolta fondi
                </span>
              </div>
              {/* Body */}
              <div className="bg-primary p-6 md:p-8">
                <div className="text-center mb-4">
                  <motion.span
                    className="font-heading text-4xl md:text-5xl font-bold text-dona block"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    {formatEuro(importo)}
                  </motion.span>
                  <span className="font-body text-primary-foreground/60 text-sm mt-1 block">
                    raccolti grazie a <span className="text-accent font-semibold">{donatori}</span> {donatori === 1 ? "donatore" : "donatori"}
                  </span>
                </div>
                <div className="border-t border-primary-foreground/10 pt-4 mt-2 text-center">
                  <p className="font-body text-primary-foreground/50 text-xs leading-relaxed">
                    Tutte le donazioni vengono devolute interamente a
                  </p>
                  <p className="font-heading text-primary-foreground font-bold text-sm mt-1">
                    Komen Italia — Comitato Emilia Romagna
                  </p>
                  <p className="font-body text-primary-foreground/40 text-[11px] mt-1">
                    Per la ricerca e la prevenzione dei tumori al seno
                  </p>
                </div>
              </div>
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

                <form onSubmit={handlePay} className="space-y-4">
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
                      disabled={saving || !nome.trim() || !email.trim() || !sdkReady}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Procedi al pagamento
                    </Button>
                  </div>
                </form>
              </div>
            </AnimatedSection>
          )}

          {/* ══ STEP 3: Widget SumUp ══ */}
          {step === "pagamento" && (
            <AnimatedSection>
              <div className="bg-card rounded-xl p-8 md:p-12 shadow-lg border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    3. Pagamento
                  </h2>
                  <span className="font-heading text-dona font-bold text-lg">€ {finalAmount}</span>
                </div>
                <p className="text-muted-foreground font-body text-sm mb-6">
                  Donazione di <strong className="text-foreground">{nome} {cognome}</strong> al progetto <strong className="text-foreground">{progetto}</strong>
                </p>

                {/* SumUp Card Widget */}
                <div
                  id="sumup-card"
                  ref={widgetRef}
                  className="min-h-[300px] mb-6"
                />

                {error && (
                  <p className="text-red-500 text-sm font-body mb-4">{error}</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("dati"); setError(""); }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Torna ai dati
                </Button>
              </div>

              {/* Alternativa bonifico */}
              <div className="mt-6 bg-card rounded-xl p-6 border border-border/50 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Landmark className="w-5 h-5 text-dona" />
                  <h3 className="font-heading text-base font-bold text-foreground">Oppure dona tramite bonifico</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <BonificoField label="Intestatario" value="Think Pink Italy ETS" />
                  <BonificoField label="Banca" value="Banca Sella — Agenzia Roma 10" />
                  <BonificoField label="IBAN" value="IT17G0326803210052966541910" copyable />
                  <BonificoField label="Codice SWIFT" value="SELBIT2BXXX" copyable />
                </div>
                <div className="bg-dona/5 border border-dona/20 rounded-lg p-3 mt-3">
                  <p className="font-body text-sm text-foreground">
                    <span className="font-semibold">Causale:</span>{" "}
                    <span className="text-dona font-medium">Donazione Komen Italia Comitato Emilia Romagna</span>
                  </p>
                </div>
                <p className="font-body text-xs text-muted-foreground/70 text-center mt-3">
                  Banca Sella — Via G. Paisiello 35 C, 00198 Roma
                </p>
              </div>
            </AnimatedSection>
          )}

          {/* ══ STEP 4: Completato ══ */}
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
                  La tua donazione di <strong className="text-dona">€ {finalAmount}</strong> al progetto
                  "<strong>{progetto}</strong>" è stata completata con successo.
                </p>
                <p className="text-muted-foreground font-body mb-8">
                  Riceverai una conferma via email a <strong>{email}</strong>.
                  I fondi saranno interamente devoluti a <strong>Komen Italia</strong> — Comitato Emilia Romagna.
                </p>

                <div className="flex flex-col gap-3 max-w-md mx-auto">
                  <div className="border-t border-border pt-4 mt-2">
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" size="sm" onClick={resetForm}>
                        Fai un'altra donazione
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/">Torna alla home</Link>
                      </Button>
                    </div>
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
