import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Users, Loader2, AlertCircle, CheckCircle2, Check, Footprints, MapPin, X, ArrowRight, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { apiFetch } from "@/lib/api";
import { tappe } from "@/lib/tappe";

declare global {
  interface Window { SumUpCard: any; }
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

const DONAZIONE_TIERS = [
  { importo: 30, label: "Sostieni una tappa del cammino" },
  { importo: 50, label: "Aiuti concretamente la raccolta fondi per la ricerca" },
  { importo: 100, label: "Diventi sostenitore del cammino 1000km di Gratitudine" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

function TappeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Blocca scroll body quando aperto
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Modal — bottom sheet su mobile, centrato su desktop */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] md:max-h-[70vh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-2xl rounded-t-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">Scegli la tua tappa</h3>
                <p className="font-body text-xs text-muted-foreground mt-0.5">Seleziona la tappa a cui vuoi partecipare</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {/* Drag handle mobile */}
            <div className="md:hidden flex justify-center pt-0 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            {/* Lista tappe scrollabile */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 space-y-2">
              {tappe.map(t => (
                <Link
                  key={t.giorno}
                  to={`/iscriviti?tappa=${t.giorno}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 hover:border-dona/50 active:border-dona active:bg-dona/5 transition-all group"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dona/10 text-dona flex items-center justify-center font-heading font-bold text-sm">
                    {String(t.giorno).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-foreground truncate">
                      {t.da} → {t.a}
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      {t.data} · {t.km} km
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-dona group-active:text-dona transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LandingPage() {
  const [totaleIscritti, setTotaleIscritti] = useState<number | null>(null);
  const [showTappe, setShowTappe] = useState(false);

  useEffect(() => {
    fetch("/api/iscrizioni-count")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.total) setTotaleIscritti(d.total); })
      .catch(() => {});
  }, []);

  return (
    <Layout>
      {/* HERO */}
      <section className="bg-primary text-primary-foreground py-20 md:py-28 px-4">
        <div className="container-narrow text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block font-body text-xs uppercase tracking-widest text-accent font-bold mb-4">
              Partecipa ai 1000 km di Gratitudine
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-5">
              Cammina con noi nei{" "}
              <span className="text-accent">1000 km di Gratitudine</span>
            </h1>
            <p className="font-body text-primary-foreground/80 text-lg leading-relaxed mb-4">
              Dal <strong className="text-primary-foreground">15 aprile</strong> al <strong className="text-primary-foreground">1 maggio 2026</strong> attraverseremo l'Italia da Bologna alla Calabria.
              Puoi unirti anche tu per uno o più chilometri lungo il percorso.
            </p>
            <p className="font-body text-primary-foreground/60 text-base mb-8">
              Un cammino di fede, gratitudine e solidarietà per sostenere la prevenzione e la ricerca contro il tumore al seno.
            </p>

            {/* Micro badge */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                "Partecipazione gratuita",
                "Puoi camminare anche solo pochi km",
                "Aperto a tutti",
              ].map(badge => (
                <span key={badge} className="inline-flex items-center gap-1.5 bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground/80 text-xs font-body px-3 py-1.5 rounded-full">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  {badge}
                </span>
              ))}
            </div>

            <Button
              variant="dona"
              size="lg"
              className="text-sm sm:text-base px-6 sm:px-10 py-5 sm:py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]"
              onClick={() => setShowTappe(true)}
            >
              <Footprints className="w-5 h-5 mr-2" />
              <span className="sm:hidden">Scegli la tua tappa</span>
              <span className="hidden sm:inline">Scegli la tappa a cui partecipare</span>
            </Button>

            {/* Contatore iscritti */}
            {totaleIscritti != null && totaleIscritti > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 text-primary-foreground/50 text-sm font-body flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span className="text-accent font-semibold">{totaleIscritti}</span>{" "}
                {totaleIscritti === 1 ? "persona sta già camminando" : "persone stanno già camminando"} con noi
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      {/* NON È SOLO UNA CAMMINATA */}
      <section className="section-padding bg-background px-4">
        <div className="container-narrow max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">
              Non è solo una camminata
            </h2>
            <div className="font-body text-muted-foreground text-base leading-relaxed space-y-4">
              <p>Il cammino dei 1000 km di Gratitudine è molto più di una sfida sportiva.</p>
              <p>È un viaggio fatto di fatica, incontri e chilometri condivisi.</p>
              <p>Chiunque si trovi lungo il percorso può unirsi per qualche tratto, camminare insieme a noi e vivere da vicino lo spirito di questo progetto.</p>
              <p className="font-semibold text-foreground">Anche pochi chilometri possono diventare un gesto di solidarietà.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* COME PARTECIPARE */}
      <section className="section-padding bg-secondary px-4">
        <div className="container-narrow max-w-3xl mx-auto">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
              Come partecipare
            </h2>
          </AnimatedSection>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            {[
              {
                num: "1",
                titolo: "Scegli una tappa",
                testo: "Consulta il percorso e seleziona la tappa più vicina a te.",
              },
              {
                num: "2",
                titolo: "Iscriviti gratuitamente",
                testo: "Registrati per camminare con noi lungo quel tratto.",
              },
              {
                num: "3",
                titolo: "Cammina insieme a noi",
                testo: "Puoi partecipare anche solo per pochi chilometri.",
              },
            ].map(step => (
              <motion.div key={step.num} variants={fadeUp} className="bg-card border border-border rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-dona/10 text-dona font-heading font-bold text-lg mb-4">
                  {step.num}
                </div>
                <h3 className="font-heading text-base font-bold text-foreground mb-2">{step.titolo}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.testo}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* APERTO A TUTTI */}
      <section className="section-padding bg-background px-4">
        <div className="container-narrow max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">
              Un cammino aperto a tutti
            </h2>
            <p className="font-body text-muted-foreground text-base leading-relaxed mb-6">
              Non serve essere atleti. Puoi partecipare:
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {["Camminando", "Correndo", "Anche solo per qualche chilometro"].map(item => (
                <span key={item} className="inline-flex items-center gap-2 bg-dona/5 border border-dona/20 text-foreground text-sm font-body px-4 py-2 rounded-full">
                  <Check className="w-4 h-4 text-dona" />
                  {item}
                </span>
              ))}
            </div>
            <p className="font-body text-foreground font-semibold text-base">
              L'importante è condividere il cammino.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA - SCEGLI LA TAPPA */}
      <section id="scegli-tappa" className="section-padding bg-primary text-primary-foreground px-4">
        <div className="container-narrow max-w-2xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
              Scegli la tappa a cui unirti
            </h2>
            <p className="font-body text-primary-foreground/70 text-base leading-relaxed mb-8 max-w-lg mx-auto">
              Il cammino attraverserà diverse città e territori.
              Se ti trovi lungo il percorso puoi camminare con noi per qualche chilometro.
            </p>
            <Button
              variant="dona"
              size="lg"
              className="text-sm sm:text-base px-6 sm:px-10 py-5 sm:py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]"
              onClick={() => setShowTappe(true)}
            >
              <MapPin className="w-5 h-5 mr-2" />
              Scegli la tua tappa
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* FRASE EMOTIVA FINALE */}
      <section className="py-16 bg-background px-4">
        <div className="container-narrow text-center">
          <AnimatedSection>
            <blockquote className="max-w-2xl mx-auto">
              <span className="text-accent text-5xl md:text-6xl font-heading leading-none block mb-4">"</span>
              <p className="font-heading text-lg md:text-xl text-foreground leading-relaxed italic -mt-6">
                1000 km di cammino. Un solo obiettivo: trasformare ogni passo in speranza.
              </p>
            </blockquote>
          </AnimatedSection>
        </div>
      </section>

      <div className="h-16 lg:hidden" />

      {/* Modal scelta tappa */}
      <TappeModal open={showTappe} onClose={() => setShowTappe(false)} />
    </Layout>
  );
}


export default function Iscriviti() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sdkReady = useSumUpSdk();

  const tappaNum = parseInt(searchParams.get("tappa") ?? "0");
  const tappa = tappe[tappaNum - 1] ?? null;

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [opzione, setOpzione] = useState<"donazione" | "gratuita">("donazione");
  const [donazione, setDonazione] = useState(30);
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // SumUp payment state
  const [showPayment, setShowPayment] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const checkoutIdRef = useRef<string>("");
  const checkoutRefRef = useRef<string>("");

  // Tappa non valida: mostra landing page
  if (!tappa) {
    return <LandingPage />;
  }

  function validate(): string | null {
    if (!nome.trim()) return "Il nome è obbligatorio.";
    if (!cognome.trim()) return "Il cognome è obbligatorio.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Inserisci un indirizzo email valido.";
    if (opzione === "donazione" && donazione < 5)
      return "L'importo minimo della donazione è €5.";
    if (!privacy) return "Devi accettare il trattamento dei dati personali.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    const err = validate();
    if (err) { setErrore(err); return; }

    setLoading(true);
    try {
      if (opzione === "gratuita") {
        // Iscrizione gratuita
        const res = await apiFetch("/api/iscrizioni", {
          method: "POST",
          body: JSON.stringify({
            tappa_numero: tappa.giorno,
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            telefono: telefono.trim() || null,
            vuole_maglia: false,
            donazione_euro: 0,
            pagamento_stato: "gratuito",
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Errore durante l'iscrizione.");
        }
        navigate(
          `/iscrizione-successo?tappa=${tappa.giorno}&nome=${encodeURIComponent(nome.trim())}&tipo=gratuita`
        );
      } else {
        // 1. Salva iscrizione nel DB
        const iscRes = await apiFetch("/api/iscrizioni", {
          method: "POST",
          body: JSON.stringify({
            tappa_numero: tappa.giorno,
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            telefono: telefono.trim() || null,
            vuole_maglia: false,
            donazione_euro: donazione,
            pagamento_stato: "in_attesa",
          }),
        });
        if (!iscRes.ok) {
          const d = await iscRes.json();
          throw new Error(d.error ?? "Errore durante l'iscrizione.");
        }

        // 2. Salva donazione nel DB come "pendente"
        const donRes = await fetch("/api/donazioni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            importo_euro: donazione,
            progetto: "1000km Di Gratitudine",
          }),
        });
        if (!donRes.ok) {
          const d = await donRes.json();
          throw new Error(d.error ?? "Errore nel salvataggio donazione.");
        }
        const { donazione_id } = await donRes.json();

        // 3. Crea checkout SumUp
        const resp = await fetch("/api/sumup-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: donazione,
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            progetto: "1000km Di Gratitudine",
            donazione_id,
          }),
        });
        if (!resp.ok) {
          const d = await resp.json();
          throw new Error(d.error ?? "Errore creazione pagamento.");
        }
        const { id: checkoutId, checkout_reference } = await resp.json();
        checkoutIdRef.current = checkoutId;
        checkoutRefRef.current = checkout_reference;

        // 4. Mostra widget SumUp
        setShowPayment(true);
        setLoading(false);

        // 5. Monta widget SumUp (dopo render)
        setTimeout(() => {
          if (!window.SumUpCard || !widgetRef.current) return;
          if (window.SumUpCard.unmount) {
            try { window.SumUpCard.unmount("sumup-card-iscrizione"); } catch {}
          }
          window.SumUpCard.mount({
            id: "sumup-card-iscrizione",
            checkoutId,
            email: email.trim().toLowerCase(),
            locale: "it-IT",
            onResponse: async (type: string, _body: any) => {
              if (type === "success") {
                // Conferma pagamento server-side
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
                navigate(
                  `/iscrizione-successo?tappa=${tappa.giorno}&nome=${encodeURIComponent(nome.trim())}&tipo=donazione&importo=${donazione}`
                );
              } else if (type === "error") {
                setErrore("Pagamento non riuscito. Riprova.");
              }
            },
          });
        }, 100);
        return; // non eseguire finally setLoading(false) — già fatto sopra
      }
    } catch (ex: unknown) {
      setErrore(ex instanceof Error ? ex.message : "Errore imprevisto. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      {/* Hero tappa */}
      <section className="bg-primary text-primary-foreground py-10 px-4">
        <div className="container-narrow">
          <Link
            to="/iscriviti"
            className="inline-flex items-center gap-1.5 text-primary-foreground/60 hover:text-primary-foreground text-sm font-body mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna a Cammina con noi
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-dona/20 text-dona font-heading font-bold text-sm px-3 py-1 rounded-full">
                Tappa {tappa.giorno}
              </span>
              <span className="text-primary-foreground/60 font-body text-sm">
                {tappa.data} · {tappa.km} km
              </span>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold">
              {tappa.da} → {tappa.a}
            </h1>
            <p className="text-primary-foreground/70 font-body mt-2">
              Iscriviti per camminare con noi in questa tappa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form */}
      <section className="section-padding bg-background">
        <div className="container-narrow max-w-2xl">
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            {/* Dati personali */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-1">
                Dati personali
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-body font-medium text-foreground mb-1.5">
                    Nome <span className="text-dona">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Mario"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-dona/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-body font-medium text-foreground mb-1.5">
                    Cognome <span className="text-dona">*</span>
                  </label>
                  <input
                    type="text"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    placeholder="Rossi"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-dona/40"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-body font-medium text-foreground mb-1.5">
                  Email <span className="text-dona">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario.rossi@email.it"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-dona/40"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-body font-medium text-foreground mb-1.5">
                  Telefono{" "}
                  <span className="text-muted-foreground font-normal">(opzionale)</span>
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+39 333 000 0000"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-dona/40"
                />
              </div>
            </div>

            {/* Tipo di partecipazione */}
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
                Tipo di partecipazione
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Donazione — prima scelta */}
                <button
                  type="button"
                  onClick={() => setOpzione("donazione")}
                  className={`text-left rounded-xl border-2 p-5 transition-all ${
                    opzione === "donazione"
                      ? "border-dona bg-dona/5 shadow-md"
                      : "border-border bg-card hover:border-dona/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        opzione === "donazione"
                          ? "border-dona bg-dona"
                          : "border-muted-foreground"
                      }`}
                    >
                      {opzione === "donazione" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-heading font-semibold text-foreground">
                      Partecipo e sostengo la ricerca
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">
                    Fai una donazione libera per sostenere il progetto e la ricerca.
                  </p>
                </button>

                {/* Gratuita */}
                <button
                  type="button"
                  onClick={() => setOpzione("gratuita")}
                  className={`text-left rounded-xl border-2 p-5 transition-all ${
                    opzione === "gratuita"
                      ? "border-dona bg-dona/5 shadow-md"
                      : "border-border bg-card hover:border-dona/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        opzione === "gratuita"
                          ? "border-dona bg-dona"
                          : "border-muted-foreground"
                      }`}
                    >
                      {opzione === "gratuita" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-heading font-semibold text-foreground">
                      Partecipo gratuitamente
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">
                    Cammina con noi, senza alcun costo.
                  </p>
                </button>
              </div>

              {/* Scelta importo donazione */}
              <AnimatePresence>
              {opzione === "donazione" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 bg-card border border-border rounded-xl p-5 space-y-4 overflow-hidden"
                >
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Sostieni la ricerca mentre cammini con noi
                  </h3>
                  <p className="text-sm font-body text-muted-foreground leading-relaxed">
                    Con una donazione aiuti la raccolta fondi per{" "}
                    <strong className="text-foreground">Komen Italia &ndash; Comitato Emilia-Romagna</strong>{" "}
                    a favore della prevenzione e della ricerca sul tumore al seno.
                  </p>
                  <div className="space-y-2">
                    {DONAZIONE_TIERS.map((tier) => (
                      <button
                        key={tier.importo}
                        type="button"
                        onClick={() => setDonazione(tier.importo)}
                        className={`w-full text-left flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                          donazione === tier.importo
                            ? "border-dona bg-dona/5 shadow-sm"
                            : "border-border hover:border-dona/40"
                        }`}
                      >
                        <span className={`font-heading font-bold text-base w-14 shrink-0 ${
                          donazione === tier.importo ? "text-dona" : "text-foreground"
                        }`}>
                          €{tier.importo}
                        </span>
                        <span className="text-sm font-body text-muted-foreground">{tier.label}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-body text-muted-foreground mb-1.5">
                      Oppure inserisci un importo libero (min. €5)
                    </label>
                    <input
                      type="number"
                      min={5}
                      step={1}
                      value={donazione}
                      onChange={(e) => setDonazione(Math.max(5, parseInt(e.target.value) || 5))}
                      className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-dona/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Heart className="w-4 h-4 text-dona flex-shrink-0" />
                    <span className="text-xs font-body text-muted-foreground leading-relaxed">
                      Il 100% delle donazioni sarà destinato a <strong className="text-foreground">Komen Italia – Comitato Emilia-Romagna</strong>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Nudge donazione per chi sceglie gratuita */}
              {opzione === "gratuita" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 bg-dona/5 border border-dona/20 rounded-xl p-5 text-center overflow-hidden"
                >
                  <p className="text-sm font-body text-muted-foreground leading-relaxed mb-3">
                    Se vuoi puoi comunque fare una piccola donazione per sostenere la ricerca.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpzione("donazione")}
                    className="inline-flex items-center gap-2 bg-dona text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Heart className="w-4 h-4" />
                    Fai una donazione
                  </button>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Privacy */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-dona"
              />
              <span className="text-sm font-body text-muted-foreground leading-relaxed">
                Acconsento al trattamento dei dati personali ai sensi del GDPR per la
                gestione dell'iscrizione e delle comunicazioni relative all'evento.{" "}
                <Link to="/contatti" className="underline hover:text-foreground transition-colors">
                  Contattaci
                </Link>{" "}
                per informazioni sulla privacy.
              </span>
            </label>

            {/* Errore */}
            {errore && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm font-body">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {errore}
              </div>
            )}

            {/* Frase emotiva */}
            {!showPayment && (
              <p className="text-center font-body text-sm text-muted-foreground italic leading-relaxed max-w-md mx-auto">
                Questo cammino nasce da una promessa fatta in un momento difficile. Oggi vogliamo trasformarlo in un gesto di speranza per tante altre persone.
              </p>
            )}

            {/* Submit — nascosto durante pagamento SumUp */}
            {!showPayment && (
              <>
                <Button
                  type="submit"
                  disabled={loading || (opzione === "donazione" && !sdkReady)}
                  variant="dona"
                  size="lg"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Attendere…
                    </>
                  ) : opzione === "donazione" ? (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      Partecipa e sostieni la ricerca · €{donazione}
                    </>
                  ) : (
                    <>
                      <Footprints className="w-4 h-4 mr-2" />
                      Partecipa al cammino
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground font-body">
                  {opzione === "donazione"
                    ? "Pagamento sicuro tramite SumUp. I tuoi dati sono protetti."
                    : "Nessun pagamento richiesto. Puoi donare in qualsiasi momento."}
                </p>
              </>
            )}

            {/* Widget SumUp pagamento */}
            {showPayment && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Pagamento
                  </h2>
                  <span className="font-heading text-dona font-bold text-lg">€{donazione}</span>
                </div>
                <p className="text-muted-foreground font-body text-sm">
                  Donazione di <strong className="text-foreground">{nome} {cognome}</strong> per il progetto 1000km Di Gratitudine
                </p>

                <div
                  id="sumup-card-iscrizione"
                  ref={widgetRef}
                  className="min-h-[300px]"
                />

                <button
                  type="button"
                  onClick={() => { setShowPayment(false); setErrore(null); }}
                  className="inline-flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Torna al modulo
                </button>
              </motion.div>
            )}
          </motion.form>
        </div>
      </section>
    </Layout>
  );
}
