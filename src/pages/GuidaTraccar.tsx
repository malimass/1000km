/**
 * GuidaTraccar.tsx — Guida configurazione Traccar Client
 * Route: /guida-traccar
 *
 * Spiega in 3 passi come configurare Traccar Client
 * per il tracciamento GPS affidabile in background.
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Settings, Play, Smartphone, ExternalLink } from "lucide-react";
import NativeLayout from "@/components/NativeLayout";
import { Button } from "@/components/ui/button";

const SERVER_URL = "https://1000kmdigratitudine.it/api/traccar-position";

const STEPS = [
  {
    num: 1,
    icon: <Download className="w-6 h-6" />,
    title: "Scarica Traccar Client",
    body: "Installa l'app gratuita Traccar Client sul tuo telefono.",
    links: [
      { label: "Google Play (Android)", url: "https://play.google.com/store/apps/details?id=org.traccar.client" },
      { label: "App Store (iOS)", url: "https://apps.apple.com/app/traccar-client/id843156974" },
    ],
  },
  {
    num: 2,
    icon: <Settings className="w-6 h-6" />,
    title: "Configura l'app",
    body: "Apri Traccar Client e imposta questi due campi:",
    fields: [
      { label: "Device identifier", value: "il tuo nome (es. mario-rossi)", note: "Scegli un ID unico, senza spazi. Usa trattini o underscore." },
      { label: "Server URL", value: SERVER_URL, copyable: true, note: "Copia e incolla esattamente questo indirizzo." },
    ],
    extra: "Lascia le altre impostazioni predefinite. L'intervallo consigliato è 30 secondi.",
  },
  {
    num: 3,
    icon: <Play className="w-6 h-6" />,
    title: "Avvia il tracciamento",
    body: "Premi il pulsante di avvio nell'app. Traccar Client invierà la tua posizione in background, anche a schermo spento. Apparirai automaticamente sulla mappa live!",
    tip: "Per fermarti, basta premere di nuovo il pulsante nell'app.",
  },
];

export default function GuidaTraccar() {
  const navigate = useNavigate();

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  }

  return (
    <NativeLayout>
      <section className="min-h-[85vh] px-4 py-10 max-w-lg mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-body transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">Traccar Client</h1>
              <p className="text-sm text-muted-foreground font-body">GPS in background affidabile</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Traccar Client è un'app GPS gratuita che funziona in background anche a schermo spento.
            Perfetta per tracciare il tuo percorso durante le tappe senza consumare troppa batteria.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-dona/10 text-dona flex items-center justify-center font-heading font-bold text-sm flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-dona">{step.icon}</span>
                    <h2 className="font-heading font-bold text-foreground">{step.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground font-body mt-1">{step.body}</p>
                </div>
              </div>

              {/* Download links */}
              {"links" in step && step.links && (
                <div className="ml-11 space-y-2">
                  {step.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-body text-dona hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {link.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Config fields */}
              {"fields" in step && step.fields && (
                <div className="ml-11 space-y-3 mt-2">
                  {step.fields.map((field) => (
                    <div key={field.label}>
                      <p className="text-xs font-body font-semibold text-foreground mb-1">{field.label}</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground break-all">
                          {field.value}
                        </code>
                        {"copyable" in field && field.copyable && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-shrink-0"
                            onClick={() => copyToClipboard(field.value)}
                          >
                            Copia
                          </Button>
                        )}
                      </div>
                      {field.note && (
                        <p className="text-xs text-muted-foreground font-body mt-1">{field.note}</p>
                      )}
                    </div>
                  ))}
                  {"extra" in step && step.extra && (
                    <p className="text-xs text-muted-foreground font-body">{step.extra}</p>
                  )}
                </div>
              )}

              {/* Tip */}
              {"tip" in step && step.tip && (
                <p className="ml-11 text-xs text-muted-foreground font-body mt-2 italic">
                  {step.tip}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Vantaggi */}
        <div className="mt-8 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-4 space-y-2">
          <h3 className="font-heading font-bold text-sm text-foreground">Perché Traccar Client?</h3>
          <ul className="text-xs text-muted-foreground font-body space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>GPS in background affidabile, anche a schermo spento</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>Nessun account richiesto: basta URL e ID</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>Basso consumo batteria</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">+</span>
              <span>App gratuita e open source</span>
            </li>
          </ul>
        </div>
      </section>
    </NativeLayout>
  );
}
