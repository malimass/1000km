import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Heart, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { tappe } from "@/lib/tappe";

export default function IscrizioneSuccesso() {
  const [searchParams] = useSearchParams();

  const tappaNum = parseInt(searchParams.get("tappa") ?? "0");
  const nome     = searchParams.get("nome") ?? "";
  const tipo     = searchParams.get("tipo") ?? "gratuita"; // gratuita | donazione | bonifico
  const importo  = searchParams.get("importo") ?? "30";

  const tappa = tappe[tappaNum - 1] ?? null;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "1000km di Gratitudine",
          text: `Mi sono iscritto/a alla Tappa ${tappaNum} da ${tappa?.da} a ${tappa?.a}! Partecipa anche tu.`,
          url: window.location.origin + "/il-percorso",
        });
      } catch {
        // utente ha annullato la condivisione
      }
    }
  }

  return (
    <Layout>
      <section className="section-padding bg-background min-h-[70vh] flex items-center">
        <div className="container-narrow max-w-lg text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="mb-6"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Iscrizione confermata!
            </h1>

            {nome && (
              <p className="text-muted-foreground font-body text-lg mb-6">
                Grazie, <strong className="text-foreground">{nome}</strong>!
              </p>
            )}

            {/* Card tappa */}
            {tappa && (
              <div className="bg-card border border-border rounded-xl p-5 mb-6 text-left">
                <div className="flex items-center gap-3 mb-1">
                  <span className="bg-dona/10 text-dona text-xs font-body font-bold px-2 py-0.5 rounded-full">
                    Tappa {tappa.giorno}
                  </span>
                  <span className="text-muted-foreground text-sm font-body">
                    {tappa.data} · {tappa.km} km
                  </span>
                </div>
                <p className="font-heading font-semibold text-foreground text-lg">
                  {tappa.da} → {tappa.a}
                </p>
              </div>
            )}

            {/* Messaggio specifico per tipo */}
            {tipo === "donazione" && (
              <div className="bg-dona/5 border border-dona/20 rounded-xl p-5 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-dona" />
                  <span className="font-heading font-semibold text-foreground text-sm">
                    Sostenitore del Cammino
                  </span>
                </div>
                <p className="text-muted-foreground text-sm font-body leading-relaxed">
                  Grazie per la tua donazione di <strong className="text-foreground">€{importo}</strong>! Con il tuo contributo sostieni la raccolta fondi per Komen Italia &ndash; Comitato Emilia-Romagna.
                  Riceverai una email di conferma con tutti i dettagli.
                </p>
              </div>
            )}

            {tipo === "bonifico" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-yellow-600" />
                  <span className="font-heading font-semibold text-foreground text-sm">
                    Pagamento tramite bonifico
                  </span>
                </div>
                <p className="text-muted-foreground text-sm font-body leading-relaxed mb-3">
                  La piattaforma di pagamento online sarà disponibile a breve. Nel
                  frattempo, per completare la donazione di{" "}
                  <strong className="text-foreground">€{importo}</strong>, effettua un bonifico e{" "}
                  <Link to="/contatti" className="underline hover:text-foreground transition-colors">
                    contattaci
                  </Link>{" "}
                  per i dati bancari.
                </p>
                <p className="text-muted-foreground text-xs font-body">
                  La tua iscrizione è già registrata. Riceverai conferma alla ricezione del pagamento.
                </p>
              </div>
            )}

            {tipo === "gratuita" && (
              <p className="text-muted-foreground font-body text-sm mb-6 leading-relaxed">
                Riceverai una email di conferma all'indirizzo fornito. Se desideri
                supportare la causa, puoi donare in qualsiasi momento.
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="dona" size="lg">
                <Link to="/dona">
                  <Heart className="w-4 h-4 mr-2" />
                  Dona ora
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/il-percorso">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Torna al percorso
                </Link>
              </Button>
              {navigator.share && (
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Condividi
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
