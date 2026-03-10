import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shirt, Heart, Users, Loader2, AlertCircle, CheckCircle2, Check, Footprints, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import AnimatedSection from "@/components/AnimatedSection";
import { apiFetch } from "@/lib/api";
import { tappe } from "@/lib/tappe";

const TAGLIE = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Taglia = (typeof TAGLIE)[number];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

function LandingPage() {
  const [totaleIscritti, setTotaleIscritti] = useState<number | null>(null);

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

            <Button asChild variant="dona" size="lg" className="text-base px-10 py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]">
              <a href="#scegli-tappa">
                <Footprints className="w-5 h-5 mr-2" />
                Scegli la tappa a cui partecipare
              </a>
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
            <Button asChild variant="dona" size="lg" className="text-base px-10 py-6 shadow-[0_0_30px_hsl(340_82%_52%/0.3)]">
              <Link to="/il-percorso#tappe">
                <MapPin className="w-5 h-5 mr-2" />
                Scegli la tua tappa
              </Link>
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
    </Layout>
  );
}


export default function Iscriviti() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tappaNum = parseInt(searchParams.get("tappa") ?? "0");
  const tappa = tappe[tappaNum - 1] ?? null;

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [opzione, setOpzione] = useState<"gratuita" | "maglia">("gratuita");
  const [donazione, setDonazione] = useState(30);
  const [taglia, setTaglia] = useState<Taglia | "">("");
  const [privacy, setPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // Tappa non valida: mostra landing page
  if (!tappa) {
    return <LandingPage />;
  }

  function validate(): string | null {
    if (!nome.trim()) return "Il nome è obbligatorio.";
    if (!cognome.trim()) return "Il cognome è obbligatorio.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Inserisci un indirizzo email valido.";
    if (opzione === "maglia") {
      if (!taglia) return "Seleziona la taglia della maglia.";
      if (donazione < 30) return "La donazione minima per la maglia è €30.";
    }
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
        // Iscrizione con donazione: usa Stripe via API route
        const successUrl = `${window.location.origin}/iscrizione-successo?tappa=${tappa.giorno}&nome=${encodeURIComponent(nome.trim())}&tipo=maglia&importo=${donazione}`;
        const cancelUrl = `${window.location.origin}/iscriviti?tappa=${tappa.giorno}`;

        const res = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tappa_numero: tappa.giorno,
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim().toLowerCase(),
            telefono: telefono.trim() || null,
            taglia_maglia: taglia,
            donazione_euro: donazione,
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          // Fallback: iscrizione con stato "in_attesa_bonifico"
          const fallback = await apiFetch("/api/iscrizioni", {
            method: "POST",
            body: JSON.stringify({
              tappa_numero: tappa.giorno,
              nome: nome.trim(),
              cognome: cognome.trim(),
              email: email.trim().toLowerCase(),
              telefono: telefono.trim() || null,
              vuole_maglia: true,
              taglia_maglia: taglia,
              donazione_euro: donazione,
              pagamento_stato: "in_attesa_bonifico",
            }),
          });
          if (!fallback.ok) {
            const d = await fallback.json();
            throw new Error(d.error ?? "Errore durante l'iscrizione.");
          }
          navigate(
            `/iscrizione-successo?tappa=${tappa.giorno}&nome=${encodeURIComponent(nome.trim())}&tipo=bonifico&importo=${donazione}`
          );
          return;
        }

        // Redirect a Stripe Checkout
        window.location.href = data.url;
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
                      Partecipazione gratuita
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">
                    Cammina con noi, senza alcun costo. Puoi sempre donare in seguito.
                  </p>
                </button>

                {/* Con maglia */}
                <button
                  type="button"
                  onClick={() => setOpzione("maglia")}
                  className={`text-left rounded-xl border-2 p-5 transition-all ${
                    opzione === "maglia"
                      ? "border-dona bg-dona/5 shadow-md"
                      : "border-border bg-card hover:border-dona/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        opzione === "maglia"
                          ? "border-dona bg-dona"
                          : "border-muted-foreground"
                      }`}
                    >
                      {opzione === "maglia" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-heading font-semibold text-foreground">
                      Dona e ricevi la maglia
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-dona text-white text-xs font-body font-bold px-2 py-0.5 rounded-full">
                      min. €30
                    </span>
                    <Shirt className="w-4 h-4 text-dona" />
                  </div>
                  <p className="text-muted-foreground text-sm font-body leading-relaxed">
                    Supporta la raccolta solidale e ricevi la maglia ufficiale
                    dell'evento, consegnata la sera prima della partenza.
                  </p>
                </button>
              </div>

              {/* Campi aggiuntivi per opzione maglia */}
              {opzione === "maglia" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 bg-card border border-border rounded-xl p-5 space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-body font-medium text-foreground mb-1.5">
                      Importo donazione (€){" "}
                      <span className="text-muted-foreground font-normal">min. €30</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={30}
                        step={1}
                        value={donazione}
                        onChange={(e) => setDonazione(Math.max(30, parseInt(e.target.value) || 30))}
                        className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-dona/40"
                      />
                      <div className="flex gap-2">
                        {[30, 50, 100].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDonazione(v)}
                            className={`text-xs font-body px-3 py-1.5 rounded-full border transition-colors ${
                              donazione === v
                                ? "bg-dona text-white border-dona"
                                : "border-border text-muted-foreground hover:border-dona/50"
                            }`}
                          >
                            €{v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-body font-medium text-foreground mb-1.5">
                      Taglia maglia <span className="text-dona">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TAGLIE.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTaglia(t)}
                          className={`w-12 h-10 rounded-md border text-sm font-body font-medium transition-colors ${
                            taglia === t
                              ? "bg-dona text-white border-dona"
                              : "border-border text-foreground hover:border-dona/50"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs font-body mt-2">
                      La maglia sarà consegnata la sera prima della partenza della tappa {tappa.giorno}{" "}
                      ({tappa.da}, {tappa.data}).
                    </p>
                  </div>
                </motion.div>
              )}
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              variant="dona"
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Attendere…
                </>
              ) : opzione === "gratuita" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Iscriviti gratuitamente
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Procedi al pagamento · €{donazione}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground font-body">
              {opzione === "maglia"
                ? "Pagamento sicuro tramite Stripe. I tuoi dati sono protetti."
                : "Nessun pagamento richiesto. Puoi donare in qualsiasi momento."}
            </p>
          </motion.form>
        </div>
      </section>
    </Layout>
  );
}
