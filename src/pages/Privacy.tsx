import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import Layout from "@/components/Layout";

export default function Privacy() {
  useSEO({
    title: "Privacy Policy",
    description: "Informativa sulla privacy e sul trattamento dei dati personali del sito 1000 km di Gratitudine.",
    noindex: true,
  });
  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-body mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-dona" />
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
              Informativa sulla Privacy
            </h1>
          </div>

          <div className="prose prose-sm md:prose-base max-w-none font-body text-foreground/90 space-y-8">

            <p className="text-muted-foreground text-sm">
              Ultimo aggiornamento: 25 marzo 2026
            </p>

            {/* 1 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground mt-0">
                1. Titolare del trattamento
              </h2>
              <p>
                <strong>Associazione 1000 KM di Gratitudine</strong><br />
                Sede legale: Via Nerio Nannetti 2/3 — 40069 Zola Predosa (BO)<br />
                Codice Fiscale: 91477340375<br />
                Presidente e Legale Rappresentante: Malivindi Annunziato<br />
                Email: <a href="mailto:info@1000kmdigratitudine.it" className="text-dona hover:underline">info@1000kmdigratitudine.it</a>
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                2. Dati raccolti e finalità
              </h2>
              <p>Raccogliamo i seguenti dati personali per le finalità indicate:</p>

              <h3 className="font-heading text-base font-semibold text-foreground">a) Donazioni</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dati:</strong> nome, cognome, email, importo donato</li>
                <li><strong>Finalità:</strong> gestione della donazione, invio ricevuta, rendicontazione trasparente</li>
                <li><strong>Base giuridica:</strong> esecuzione del contratto di donazione e consenso esplicito</li>
              </ul>

              <h3 className="font-heading text-base font-semibold text-foreground">b) Modulo di contatto</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dati:</strong> nome, email, oggetto, messaggio</li>
                <li><strong>Finalità:</strong> rispondere alle richieste</li>
                <li><strong>Base giuridica:</strong> consenso esplicito</li>
              </ul>

              <h3 className="font-heading text-base font-semibold text-foreground">c) Iscrizione alla partecipazione GPS</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dati:</strong> nome, email, posizione GPS in tempo reale</li>
                <li><strong>Finalità:</strong> tracciamento del percorso e visualizzazione sulla mappa pubblica</li>
                <li><strong>Base giuridica:</strong> consenso esplicito</li>
              </ul>

              <h3 className="font-heading text-base font-semibold text-foreground">d) Registrazione atleta/coach</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dati:</strong> nome, email, password (crittografata)</li>
                <li><strong>Finalità:</strong> accesso alla piattaforma di allenamento</li>
                <li><strong>Base giuridica:</strong> esecuzione del contratto di servizio e consenso</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                3. Servizi di terze parti
              </h2>
              <p>Per il funzionamento del sito utilizziamo i seguenti servizi esterni che potrebbero trattare dati personali:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold">Servizio</th>
                      <th className="text-left py-2 pr-4 font-semibold">Finalità</th>
                      <th className="text-left py-2 font-semibold">Paese</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50"><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Hosting del sito</td><td className="py-2">USA</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 pr-4">Neon</td><td className="py-2 pr-4">Database</td><td className="py-2">USA/EU</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 pr-4">SumUp</td><td className="py-2 pr-4">Pagamenti con carta</td><td className="py-2">EU</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 pr-4">PayPal</td><td className="py-2 pr-4">Pagamenti PayPal</td><td className="py-2">USA/EU</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">Invio email transazionali</td><td className="py-2">USA</td></tr>
                    <tr className="border-b border-border/50"><td className="py-2 pr-4">Cloudinary</td><td className="py-2 pr-4">Hosting immagini/video</td><td className="py-2">USA</td></tr>
                    <tr><td className="py-2 pr-4">Google Maps / Geoapify</td><td className="py-2 pr-4">Mappe e percorsi</td><td className="py-2">USA/EU</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                I fornitori con sede negli USA aderiscono al EU-US Data Privacy Framework o offrono clausole contrattuali standard (SCC) per garantire un livello adeguato di protezione dei dati.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                4. Cookie
              </h2>
              <p>
                Questo sito utilizza esclusivamente <strong>cookie tecnici e funzionali</strong> necessari al funzionamento del sito (es. preferenze di layout). Non utilizziamo cookie di profilazione o di marketing.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                5. Conservazione dei dati
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Donazioni:</strong> 10 anni dalla data della donazione (obblighi fiscali e di rendicontazione)</li>
                <li><strong>Contatti:</strong> fino all'evasione della richiesta, poi cancellati entro 12 mesi</li>
                <li><strong>Dati GPS:</strong> per la durata dell'evento, poi anonimizzati entro 30 giorni</li>
                <li><strong>Account atleta/coach:</strong> fino alla cancellazione dell'account da parte dell'utente</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                6. I tuoi diritti
              </h2>
              <p>Ai sensi degli artt. 15-22 del Regolamento UE 2016/679 (GDPR), hai diritto di:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Accesso:</strong> ottenere conferma del trattamento e copia dei tuoi dati</li>
                <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti</li>
                <li><strong>Cancellazione:</strong> richiedere la cancellazione dei tuoi dati ("diritto all'oblio")</li>
                <li><strong>Limitazione:</strong> limitare il trattamento in determinati casi</li>
                <li><strong>Portabilità:</strong> ricevere i tuoi dati in formato strutturato</li>
                <li><strong>Opposizione:</strong> opporti al trattamento per motivi legittimi</li>
                <li><strong>Revoca del consenso:</strong> revocare il consenso in qualsiasi momento</li>
              </ul>
              <p>
                Per esercitare i tuoi diritti, scrivi a:{" "}
                <a href="mailto:info@1000kmdigratitudine.it" className="text-dona hover:underline">
                  info@1000kmdigratitudine.it
                </a>
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                7. Reclami
              </h2>
              <p>
                Se ritieni che il trattamento dei tuoi dati violi il GDPR, hai diritto di proporre reclamo al{" "}
                <strong>Garante per la Protezione dei Dati Personali</strong>:{" "}
                <a
                  href="https://www.garanteprivacy.it"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dona hover:underline"
                >
                  www.garanteprivacy.it
                </a>
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="font-heading text-lg font-bold text-foreground">
                8. Modifiche alla presente informativa
              </h2>
              <p>
                L'Associazione si riserva il diritto di modificare questa informativa in qualsiasi momento. Le modifiche saranno pubblicate su questa pagina con indicazione della data di aggiornamento. Ti invitiamo a consultare periodicamente questa pagina.
              </p>
            </section>

          </div>
        </div>
      </section>
    </Layout>
  );
}
