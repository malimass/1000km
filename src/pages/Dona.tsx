import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Shield, Users, Check, Loader2, CreditCard, Landmark, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { motion } from "framer-motion";
import { loadRaccoltaFondi, subscribeRaccoltaFondi, type RaccoltaFondi } from "@/lib/notizie";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

declare global {
  interface Window { SumUpCard: any; }
}

const donationTiers = [
  { value: 10,  label: "Cammina con noi",      desc: "Un piccolo contributo che trasforma un tratto del nostro cammino in sostegno alla prevenzione del tumore al seno." },
  { value: 25,  label: "Sostieni il cammino",   desc: "Il tuo contributo aiuta a trasformare il cammino dei 1000 km in un aiuto concreto per la prevenzione." },
  { value: 50,  label: "Sostieni la speranza",  desc: "Ogni passo diventa un messaggio di solidarietà e supporto alla ricerca contro il tumore al seno." },
  { value: 100, label: "Sostieni la ricerca",   desc: "Un contributo importante per i programmi di prevenzione e ricerca promossi da Komen Italia." },
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
      <span className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-body text-sm text-foreground font-medium select-all">{value}</span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted active:bg-muted transition-colors"
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
type PayMethod = "card" | "paypal";

export default function Dona() {
  const [raccolta, setRaccolta] = useState<RaccoltaFondi | null>(null);
  const sdkReady = useSumUpSdk();

  useEffect(() => {
    loadRaccoltaFondi().then(r => { if (r) setRaccolta(r); });
    return subscribeRaccoltaFondi(r => setRaccolta(r));
  }, []);

  const importo  = raccolta?.importo_euro ?? 0;
  const donatori = raccolta?.donatori     ?? 0;

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
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [donazioneId, setDonazioneId] = useState<number | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const finalAmount = selected ?? (customAmt ? Number(customAmt) : 0);

  // Refs to keep checkout info across steps
  const checkoutIdRef = useRef<string>("");
  const checkoutRefRef = useRef<string>("");

  const formReady = nome.trim().length > 0 && email.trim().length > 0 && finalAmount > 0;

  // ── Salva donazione e vai al pagamento ──
  async function handlePay(method: PayMethod) {
    if (!formReady) return;
    setPayMethod(method);
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
      setDonazioneId(donazione_id);

      if (payMethod === "paypal") {
        // Per PayPal: vai direttamente allo step pagamento, i pulsanti PayPal gestiranno il resto
        setStep("pagamento");
        setSaving(false);
      } else {
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
      }
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
    setPayMethod("card");
    setDonazioneId(null);
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative min-h-[45vh] flex items-center justify-center bg-primary overflow-hidden py-16">
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
            className="font-body text-primary-foreground/80 max-w-lg mx-auto leading-relaxed"
          >
            Noi camminiamo 1000 km di gratitudine. Tu puoi trasformare ogni passo in sostegno alla prevenzione e alla ricerca contro il tumore al seno.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="font-body text-primary-foreground/50 text-sm mt-3"
          >
            Tutte le donazioni sono destinate a Komen Italia — Comitato Emilia-Romagna.
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
                  {raccolta ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <span className="inline-block h-10 md:h-12 w-40 rounded-lg bg-primary-foreground/10 animate-pulse mb-1" />
                      <span className="inline-block h-4 w-48 rounded bg-primary-foreground/10 animate-pulse mt-1" />
                    </>
                  )}
                </div>
                <div className="border-t border-primary-foreground/10 pt-4 mt-2 text-center">
                  <p className="font-body text-primary-foreground/50 text-xs leading-relaxed">
                    Tutte le donazioni vengono devolute interamente a
                  </p>
                  <p className="font-heading text-primary-foreground font-bold text-sm mt-1">
                    Komen Italia — Comitato Emilia Romagna
                  </p>
                  <p className="font-body text-primary-foreground/40 text-xs mt-1">
                    Per la ricerca e la prevenzione dei tumori al seno
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Tagline forte */}
          {step === "importo" && (
            <AnimatedSection>
              <p className="font-heading text-lg md:text-xl font-bold text-foreground text-center mb-10 max-w-2xl mx-auto leading-relaxed">
                1000 km di cammino. Un unico obiettivo: sostenere la prevenzione e la ricerca contro il tumore al seno.
              </p>
            </AnimatedSection>
          )}

          {/* ══ STEP 1: Scegli importo ══ */}
          {step === "importo" && (
            <AnimatedSection>
              <div className="bg-card rounded-xl p-6 sm:p-8 md:p-12 shadow-lg border border-border/50">
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mb-2 text-center">
                  1. Scegli il tuo contributo
                </h2>
                <p className="text-muted-foreground font-body leading-relaxed mb-8 text-center max-w-lg mx-auto">
                  Tutte le donazioni sono destinate a Komen Italia — Comitato Emilia-Romagna.
                </p>

                {/* Tiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {donationTiers.map((tier) => (
                    <motion.button
                      key={tier.value}
                      type="button"
                      onClick={() => { setSelected(tier.value); setCustomAmt(""); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`rounded-xl border-2 p-5 text-left transition-colors flex items-start gap-4 ${
                        selected === tier.value
                          ? "border-dona bg-dona/10 ring-2 ring-dona/30"
                          : "border-border hover:border-dona bg-card hover:bg-dona/5"
                      }`}
                    >
                      <span className={`font-heading text-2xl font-bold shrink-0 transition-colors ${
                        selected === tier.value ? "text-dona" : "text-foreground"
                      }`}>
                        €{tier.value}
                      </span>
                      <div className="min-w-0">
                        <span className="font-body text-xs font-semibold uppercase tracking-wider text-dona block mb-1">
                          {tier.label}
                        </span>
                        <span className="font-body text-sm text-muted-foreground leading-relaxed block">
                          {tier.desc}
                        </span>
                      </div>
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
              <div className="bg-card rounded-xl p-6 sm:p-8 md:p-12 shadow-lg border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                    2. I tuoi dati
                  </h2>
                  <span className="font-heading text-dona font-bold text-lg">€ {finalAmount}</span>
                </div>
                <p className="text-muted-foreground font-body text-sm mb-6">
                  Progetto: <strong className="text-foreground">{progetto}</strong>
                </p>

                <div className="space-y-4">
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

                  {/* Metodo di pagamento — cliccando si procede direttamente */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      {formReady ? "Scegli come donare" : "Compila i dati per procedere"}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={!formReady || saving || !sdkReady}
                        onClick={() => handlePay("card")}
                        className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 font-body text-sm font-semibold transition-all ${
                          formReady
                            ? "border-dona bg-dona/10 text-dona hover:bg-dona hover:text-white cursor-pointer shadow-sm hover:shadow-md"
                            : "border-border text-muted-foreground/50 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {saving && payMethod === "card" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                        <span>Carta</span>
                      </button>
                      <button
                        type="button"
                        disabled={!formReady || saving}
                        onClick={() => handlePay("paypal")}
                        className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 font-body text-sm font-semibold transition-all ${
                          formReady
                            ? "border-[#0070ba] bg-[#0070ba]/10 text-[#0070ba] hover:bg-[#0070ba] hover:text-white cursor-pointer shadow-sm hover:shadow-md"
                            : "border-border text-muted-foreground/50 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {saving && payMethod === "paypal" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                          </svg>
                        )}
                        <span>PayPal</span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm font-body">{error}</p>
                  )}

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={() => setStep("importo")}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Indietro
                    </Button>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {/* ══ STEP 3: Pagamento ══ */}
          {step === "pagamento" && (
            <AnimatedSection>
              <div className="bg-card rounded-xl p-6 sm:p-8 md:p-12 shadow-lg border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                    3. Pagamento
                  </h2>
                  <span className="font-heading text-dona font-bold text-lg">€ {finalAmount}</span>
                </div>
                <p className="text-muted-foreground font-body text-sm mb-6">
                  Donazione di <strong className="text-foreground">{nome} {cognome}</strong> al progetto <strong className="text-foreground">{progetto}</strong>
                </p>

                {payMethod === "card" ? (
                  /* SumUp Card Widget */
                  <div
                    id="sumup-card"
                    ref={widgetRef}
                    className="min-h-[300px] mb-6"
                  />
                ) : (
                  /* PayPal Buttons */
                  <div className="mb-6">
                    <PayPalScriptProvider options={{
                      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "",
                      currency: "EUR",
                      intent: "capture",
                    }}>
                      <PayPalButtons
                        style={{ layout: "vertical", color: "blue", shape: "rect", label: "donate", height: 50 }}
                        createOrder={async () => {
                          const resp = await fetch("/api/paypal-create-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              donazione_id: donazioneId,
                              amount: finalAmount,
                            }),
                          });
                          if (!resp.ok) {
                            const d = await resp.json();
                            throw new Error(d.error ?? "Errore creazione ordine PayPal");
                          }
                          const { id } = await resp.json();
                          return id;
                        }}
                        onApprove={async (data) => {
                          try {
                            const resp = await fetch("/api/paypal-capture-order", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ order_id: data.orderID }),
                            });
                            if (resp.ok) {
                              setRaccolta(prev => prev ? {
                                ...prev,
                                importo_euro: prev.importo_euro + finalAmount,
                                donatori: prev.donatori + 1,
                              } : prev);
                              setStep("completato");
                            } else {
                              const d = await resp.json();
                              setError(d.error ?? "Errore conferma pagamento PayPal");
                            }
                          } catch {
                            setError("Errore di rete durante la conferma. Il pagamento potrebbe essere stato completato.");
                          }
                        }}
                        onError={() => {
                          setError("Pagamento PayPal non riuscito. Riprova.");
                        }}
                        onCancel={() => {
                          setError("Pagamento annullato.");
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                )}

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
              <div className="bg-card rounded-xl p-6 sm:p-8 md:p-12 shadow-lg border border-border/50 text-center">
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
    </Layout>
  );
}
