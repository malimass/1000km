import { useEffect, useState, useRef } from "react";
import { Heart, Check, Loader2, CreditCard, ArrowLeft, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { motion } from "framer-motion";
import { loadSosteniPage, type SosteniPage, SOSTENI_DEFAULTS } from "@/lib/sostenitori";
import { getDominantColor } from "@/lib/dominantColor";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

declare global {
  interface Window { SumUpCard: any; }
}

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

const PROGETTO_SPONSOR = "Sponsor Sostenitori del Cammino";

type SponsorStep = "intro" | "form" | "pagamento" | "completato";
type PayMethod = "card" | "paypal";

export default function Sostenitori() {
  const [page, setPage] = useState<SosteniPage>(SOSTENI_DEFAULTS);
  const [colors, setColors] = useState<Record<string, string>>({});
  const sdkReady = useSumUpSdk();

  useEffect(() => { loadSosteniPage().then(setPage); }, []);

  useEffect(() => {
    page.items.forEach((item) => {
      if (item.logoUrl && !colors[item.id]) {
        getDominantColor(item.logoUrl).then((c) =>
          setColors((prev) => ({ ...prev, [item.id]: c })),
        );
      }
    });
  }, [page.items]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sponsor payment flow ──
  const [sponsorStep, setSponsorStep] = useState<SponsorStep>("intro");
  const [amount, setAmount] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [azienda, setAzienda] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [donazioneId, setDonazioneId] = useState<number | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const checkoutIdRef = useRef("");
  const checkoutRefRef = useRef("");

  const finalAmount = Number(amount) || 0;

  async function handleSponsorPay(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || finalAmount <= 0) return;
    setSaving(true);
    setError("");

    try {
      // 1. Salva donazione come pendente
      const donRes = await fetch("/api/donazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: azienda.trim() || nome.trim(),
          cognome: cognome.trim(),
          email: email.trim(),
          importo_euro: finalAmount,
          progetto: PROGETTO_SPONSOR,
        }),
      });
      if (!donRes.ok) {
        const d = await donRes.json();
        throw new Error(d.error ?? "Errore nel salvataggio");
      }
      const { donazione_id } = await donRes.json();
      setDonazioneId(donazione_id);

      if (payMethod === "paypal") {
        setSponsorStep("pagamento");
        setSaving(false);
      } else {
        // 2. Crea checkout SumUp
        const resp = await fetch("/api/sumup-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalAmount,
            nome: azienda.trim() || nome.trim(),
            cognome: cognome.trim(),
            email: email.trim(),
            progetto: PROGETTO_SPONSOR,
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

        // 3. Step pagamento
        setSponsorStep("pagamento");
        setSaving(false);

        // 4. Monta widget
        setTimeout(() => {
          if (!window.SumUpCard || !widgetRef.current) return;
          if (window.SumUpCard.unmount) {
            try { window.SumUpCard.unmount("sumup-sponsor-card"); } catch {}
          }
          window.SumUpCard.mount({
            id: "sumup-sponsor-card",
            checkoutId,
            email: email.trim(),
            locale: "it-IT",
            onResponse: async (type: string, body: any) => {
              if (type === "success") {
                try {
                  await fetch("/api/sumup-confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      checkout_id: checkoutIdRef.current,
                      checkout_reference: checkoutRefRef.current,
                    }),
                  });
                } catch {}
                setSponsorStep("completato");
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

  function resetSponsor() {
    setSponsorStep("intro");
    setAmount("");
    setNome("");
    setCognome("");
    setEmail("");
    setAzienda("");
    setError("");
    setPayMethod("card");
    setDonazioneId(null);
  }

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[40vh] flex items-center justify-center bg-primary">
        <div className="text-center px-4">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            {page.title}
          </h1>
          {page.intro && (
            <p className="font-body text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              {page.intro}
            </p>
          )}
        </div>
      </section>

      {/* Descrizione motivazionale */}
      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          <AnimatedSection>
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-dona/10 mb-5">
                <Handshake className="w-7 h-7 text-dona" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
                Perché sostenere il cammino?
              </h2>
              <div className="font-body text-muted-foreground text-base md:text-lg leading-relaxed space-y-5 text-left max-w-2xl mx-auto">
                <p>
                  <strong className="text-foreground">1000 km di Gratitudine</strong> è molto più di un cammino: è un
                  movimento di solidarietà che unisce sport, fede e impegno sociale nella lotta contro i tumori al seno.
                </p>
                <p>
                  Sostenere questo progetto significa dare <strong className="text-foreground">visibilità alla propria azienda</strong> o
                  attività associandola a valori autentici: <strong className="text-foreground">coraggio, resilienza e generosità</strong>.
                  Il tuo contributo serve a coprire le <strong className="text-foreground">spese sostenute durante il cammino</strong>.
                </p>
                <p>
                  In cambio, la tua azienda e logo appariranno tra i <strong className="text-foreground">sostenitori ufficiali</strong> del progetto,
                  con visibilità su questo <strong className="text-foreground">sito</strong>, sui <strong className="text-foreground">canali social</strong> e
                  sul <strong className="text-foreground">camper</strong> durante tutto il cammino.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* ── CTA + Form Sostieni ── */}
          <AnimatedSection>
            {sponsorStep === "intro" && (
              <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border/50 text-center">
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  Diventa sostenitore del cammino
                </h3>
                <p className="font-body text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                  Con un contributo libero aiuti a rendere possibile questa impresa.
                </p>
                <Button
                  variant="dona"
                  size="lg"
                  className="shadow-[0_0_30px_hsl(340_82%_52%/0.25)]"
                  onClick={() => setSponsorStep("form")}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Sostieni il Cammino
                </Button>
              </div>
            )}

            {sponsorStep === "form" && (
              <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border/50">
                <h3 className="font-heading text-xl font-bold text-foreground mb-6 text-center">
                  Sostieni il Cammino
                </h3>
                <form onSubmit={handleSponsorPay} className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nome azienda / attività <span className="text-muted-foreground/50">(opzionale)</span>
                    </label>
                    <input
                      type="text"
                      value={azienda}
                      onChange={e => setAzienda(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                      placeholder="La Mia Azienda Srl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome *</label>
                      <input
                        required type="text" value={nome} onChange={e => setNome(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                        placeholder="Mario"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Cognome</label>
                      <input
                        type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                        placeholder="Rossi"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Email *</label>
                    <input
                      required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                      placeholder="mario@azienda.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Contributo libero (€) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">€</span>
                      <input
                        required type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:border-dona focus:ring-1 focus:ring-dona outline-none"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  {/* Scelta metodo di pagamento */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Metodo di pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayMethod("card")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          payMethod === "card"
                            ? "border-dona bg-dona/10 text-foreground"
                            : "border-border hover:border-dona/50 text-muted-foreground"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="font-body text-sm font-medium">Carta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayMethod("paypal")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          payMethod === "paypal"
                            ? "border-[#0070ba] bg-[#0070ba]/10 text-foreground"
                            : "border-border hover:border-[#0070ba]/50 text-muted-foreground"
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                        </svg>
                        <span className="font-body text-sm font-medium">PayPal</span>
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-sm font-body">{error}</p>}

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setSponsorStep("intro")}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Indietro
                    </Button>
                    <Button
                      type="submit" variant="dona" size="lg"
                      className="flex-1 shadow-[0_0_30px_hsl(340_82%_52%/0.25)]"
                      disabled={saving || !nome.trim() || !email.trim() || finalAmount <= 0 || (payMethod === "card" && !sdkReady)}
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      Procedi al pagamento
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {sponsorStep === "pagamento" && (
              <div className="space-y-6">
                <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border/50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-heading text-xl font-bold text-foreground">Pagamento</h3>
                    <span className="font-heading text-dona font-bold text-lg">€ {finalAmount}</span>
                  </div>
                  <p className="text-muted-foreground font-body text-sm mb-6">
                    Sponsorizzazione di <strong className="text-foreground">{azienda || nome} {cognome}</strong>
                    {" — "}<strong className="text-dona">{PROGETTO_SPONSOR}</strong>
                  </p>

                  {payMethod === "card" ? (
                    <div id="sumup-sponsor-card" ref={widgetRef} className="min-h-[300px] mb-6" />
                  ) : (
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
                                setSponsorStep("completato");
                              } else {
                                const d = await resp.json();
                                setError(d.error ?? "Errore conferma pagamento PayPal");
                              }
                            } catch {
                              setError("Errore di rete durante la conferma.");
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

                  {error && <p className="text-red-500 text-sm font-body mb-4">{error}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => { setSponsorStep("form"); setError(""); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna ai dati
                  </Button>
                </div>
              </div>
            )}

            {sponsorStep === "completato" && (
              <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border/50 text-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6"
                >
                  <Check className="w-8 h-8" />
                </motion.div>
                <h3 className="font-heading text-2xl font-bold text-foreground mb-3">
                  Grazie, {azienda || nome}!
                </h3>
                <p className="text-muted-foreground font-body mb-2">
                  Il tuo contributo di <strong className="text-dona">€ {finalAmount}</strong> come{" "}
                  <strong>{PROGETTO_SPONSOR}</strong> è stato completato con successo.
                </p>
                <p className="text-muted-foreground font-body mb-8">
                  Riceverai conferma via email a <strong>{email}</strong>.
                  Grazie per rendere possibile questa impresa!
                </p>
                <Button variant="outline" size="sm" onClick={resetSponsor}>
                  Torna ai sostenitori
                </Button>
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* Griglia sostenitori */}
      <section className="section-padding bg-muted/30">
        <div className="container-narrow">
          {page.items.length === 0 ? (
            <AnimatedSection>
              <p className="text-center text-muted-foreground font-body py-12">
                I sostenitori verranno pubblicati a breve.
              </p>
            </AnimatedSection>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {page.items.map((item, i) => (
                <AnimatedSection key={item.id} delay={i * 0.1}>
                  <div
                    className="rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden"
                    style={{ backgroundColor: colors[item.id] || "hsl(var(--muted) / 0.4)" }}
                  >
                    <div
                      className="border-b border-white/30 mx-5 mt-5 rounded-xl flex items-center justify-center p-6 min-h-[160px]"
                      style={{ backgroundColor: colors[item.id]
                        ? colors[item.id].replace("0.18)", "0.35)")
                        : "hsl(var(--card))" }}
                    >
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.nome} className="max-h-32 max-w-full w-auto object-contain" />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-dona/10 flex items-center justify-center">
                          <span className="text-4xl font-heading font-bold text-dona">{item.nome.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 px-5 pt-5 pb-3 text-center">
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">{item.nome}</strong>
                        {item.testo ? ` ${item.testo}` : ""}
                      </p>
                    </div>
                    {item.siteUrl ? (
                      <div className="px-5 pb-5 pt-2 mt-auto">
                        <a
                          href={item.siteUrl} target="_blank" rel="noopener noreferrer"
                          className="block w-full text-center font-semibold text-sm py-3 rounded-full transition-colors text-white"
                          style={{ backgroundColor: colors[item.id] ? colors[item.id].replace("0.18)", "0.9)") : "hsl(var(--foreground) / 0.8)" }}
                        >
                          Scopri di più
                        </a>
                      </div>
                    ) : (
                      <div className="pb-5" />
                    )}
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
