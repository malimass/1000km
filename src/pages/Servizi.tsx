/**
 * Servizi.tsx — Informazioni pratiche per i partecipanti.
 * Logistica, numeri utili, FAQ — gestibili dall'admin.
 */

import { useState, useEffect } from "react";
import { Phone, HelpCircle, Truck, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { motion, AnimatePresence } from "framer-motion";
import NativeLayout from "@/components/NativeLayout";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { isNativeApp } from "@/lib/capacitorGeo";
import { apiFetch } from "@/lib/api";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface ServizioItem {
  id:          string;
  domanda?:    string;   // FAQ
  risposta?:   string;   // FAQ
  titolo?:     string;   // logistica / numeri utili
  dettaglio?:  string;
  valore?:     string;   // numero di telefono / indirizzo
  link?:       string;   // URL opzionale
}

interface ServizioSection {
  id:     string;
  titolo: string;
  icona:  string;
  items:  ServizioItem[];
}

interface ServiziPage {
  sections: ServizioSection[];
}

// ─── Dati fallback (se Neon non è configurato o la pagina è vuota) ────────

const FALLBACK: ServiziPage = {
  sections: [
    {
      id:     "logistica",
      titolo: "Logistica",
      icona:  "🚐",
      items: [
        {
          id:       "mezzo-appoggio",
          titolo:   "Mezzo di appoggio",
          dettaglio: "Un furgone seguirà i corridori con acqua, snack e kit di pronto soccorso.",
        },
        {
          id:       "pernottamento",
          titolo:   "Pernottamento",
          dettaglio: "I corridori principali pernottano nelle strutture organizzate dall'equipe. I partecipanti alle singole tappe si organizzano autonomamente.",
        },
        {
          id:       "bagagli",
          titolo:   "Bagagli",
          dettaglio: "Il mezzo di appoggio può trasportare un piccolo zaino (max 10 kg) per i partecipanti che completano la tappa a piedi.",
        },
      ],
    },
    {
      id:     "emergenze",
      titolo: "Numeri utili",
      icona:  "📞",
      items: [
        { id: "emergenze-112",   titolo: "Emergenze",       valore: "112" },
        { id: "ambulanza",       titolo: "Ambulanza",       valore: "118" },
        { id: "carabinieri",     titolo: "Carabinieri",     valore: "112" },
        { id: "organizzazione",  titolo: "Organizzazione",  valore: "+39 XXX XXX XXXX",
          dettaglio: "Massimo (referente principale)" },
      ],
    },
    {
      id:     "faq",
      titolo: "FAQ",
      icona:  "❓",
      items: [
        {
          id:       "faq-iscriviti",
          domanda:  "Come mi iscrivo a una tappa?",
          risposta: "Vai su 'Il Percorso', clicca sulla tappa che ti interessa e poi su 'Iscriviti'. Puoi partecipare gratuitamente o donare e ricevere la maglia ufficiale.",
        },
        {
          id:       "faq-maglia",
          domanda:  "Quando ricevo la maglia?",
          risposta: "La maglia viene consegnata la sera prima della partenza della tappa, nel luogo di ritrovo concordato via email.",
        },
        {
          id:       "faq-allenamento",
          domanda:  "Devo essere allenato/a?",
          risposta: "Le tappe variano da 40 a 90 km. Alcune sono adatte a camminatori con buona resistenza, altre richiedono allenamento specifico. Verifica i km e preparati di conseguenza.",
        },
        {
          id:       "faq-community",
          domanda:  "Come appare la mia posizione sulla mappa?",
          risposta: "Registrati su /partecipa, avvia il tracciamento e la tua posizione apparirà in tempo reale sulla mappa pubblica. Puoi interrompere in qualsiasi momento.",
        },
      ],
    },
  ],
};

// ─── Componente FAQ accordion ─────────────────────────────────────────────────

function FaqItem({ item }: { item: ServizioItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-card hover:bg-muted transition-colors"
      >
        <span className="font-body text-sm font-semibold text-foreground pr-2">
          {item.domanda}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 py-3 text-sm font-body text-muted-foreground leading-relaxed border-t border-border bg-background">
              {item.risposta}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente sezione ───────────────────────────────────────────────────────

function ServizioSectionCard({ section }: { section: ServizioSection }) {
  const isFaq = section.id === "faq";
  const isNumeri = section.id === "emergenze";

  return (
    <AnimatedSection>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{section.icona}</span>
          <h2 className="font-heading text-xl font-bold text-foreground">{section.titolo}</h2>
        </div>

        {isFaq ? (
          <div className="space-y-2">
            {section.items.map(item => <FaqItem key={item.id} item={item} />)}
          </div>
        ) : isNumeri ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.items.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                <p className="font-body text-xs text-muted-foreground mb-1">{item.titolo}</p>
                {item.valore && (
                  <a
                    href={`tel:${item.valore.replace(/\s/g, "")}`}
                    className="flex items-center gap-2 font-heading font-bold text-xl text-primary hover:text-dona transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {item.valore}
                  </a>
                )}
                {item.dettaglio && (
                  <p className="font-body text-xs text-muted-foreground mt-1">{item.dettaglio}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {section.items.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {item.titolo && (
                      <p className="font-body font-semibold text-sm text-foreground mb-1">{item.titolo}</p>
                    )}
                    {item.dettaglio && (
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.dettaglio}</p>
                    )}
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-dona hover:text-dona/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedSection>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Servizi() {
  useSEO({
    title: "Servizi e informazioni pratiche",
    description: "Informazioni pratiche per chi partecipa al cammino: logistica, numeri utili, FAQ e tutto ciò che serve per prepararsi.",
  });
  const [page, setPage] = useState<ServiziPage>(FALLBACK);

  useEffect(() => {
    apiFetch("/api/servizi").then(res => res.ok ? res.json() : null).then(data => {
      if (data?.sections?.length) setPage(data as ServiziPage);
    }).catch(() => {});
  }, []);

  const Wrapper = isNativeApp() ? NativeLayout : Layout;

  const ICON_MAP: Record<string, React.ReactNode> = {
    "🚐": <Truck className="w-7 h-7 text-accent" />,
    "📞": <Phone className="w-7 h-7 text-accent" />,
    "❓": <HelpCircle className="w-7 h-7 text-accent" />,
  };

  return (
    <Wrapper>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-10 px-4">
        <div className="container-narrow">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-7 h-7 text-accent" />
              <span className="font-heading text-xs uppercase tracking-widest text-accent font-bold">
                Info pratiche
              </span>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Servizi</h1>
            <p className="font-body text-primary-foreground/70 text-sm">
              Logistica, numeri utili e risposte alle domande più frequenti.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contenuto */}
      <section className="section-padding bg-background">
        <div className="container-narrow max-w-2xl">
          {page.sections.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-16">
              Le informazioni sui servizi verranno pubblicate a breve.
            </p>
          ) : (
            page.sections.map(s => <ServizioSectionCard key={s.id} section={s} />)
          )}
        </div>
      </section>
    </Wrapper>
  );
}
