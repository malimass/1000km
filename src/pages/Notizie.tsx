/**
 * Notizie.tsx — Feed notizie + comunicazioni in tempo reale.
 * Disponibile su /notizie (web + app nativa).
 */

import { useState, useEffect } from "react";
import { Bell, Megaphone, MapPin, Heart, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NativeLayout from "@/components/NativeLayout";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { isNativeApp } from "@/lib/capacitorGeo";
import { loadNotizie, subscribeNotizie, type Notizia, type Categoria } from "@/lib/notizie";

// ─── Icona e colore per categoria ─────────────────────────────────────────────

const CAT_CONFIG: Record<Categoria, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  generale:   { label: "Generale",   color: "text-primary",     bg: "bg-primary/10",     icon: <Megaphone className="w-4 h-4" /> },
  tappa:      { label: "Tappa",      color: "text-accent",      bg: "bg-accent/10",      icon: <MapPin className="w-4 h-4" /> },
  raccolta:   { label: "Raccolta",   color: "text-dona",        bg: "bg-dona/10",        icon: <Heart className="w-4 h-4" /> },
  emergenza:  { label: "Avviso",     color: "text-red-600",     bg: "bg-red-50",         icon: <AlertCircle className="w-4 h-4" /> },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Componente card notizia ─────────────────────────────────────────────────

function NotiziaCard({ n }: { n: Notizia }) {
  const [open, setOpen] = useState(false);
  const cfg = CAT_CONFIG[n.categoria] ?? CAT_CONFIG.generale;
  const preview = n.corpo.length > 120 ? n.corpo.slice(0, 120) + "…" : n.corpo;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
    >
      {n.immagine_url && (
        <img
          src={n.immagine_url}
          alt={n.titolo}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4">
        {/* Categoria + data */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-body font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
            {n.tappa_num && ` · Tappa ${n.tappa_num}`}
          </span>
          <span className="text-xs text-muted-foreground font-body">{formatDate(n.created_at)}</span>
        </div>

        {/* Titolo */}
        <h3 className="font-heading font-bold text-foreground text-base leading-snug mb-2">
          {n.titolo}
        </h3>

        {/* Corpo */}
        <p className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {open ? n.corpo : preview}
        </p>

        {n.corpo.length > 120 && (
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-body text-dona hover:text-dona/80 transition-colors"
          >
            {open ? (
              <><ChevronUp className="w-3 h-3" /> Mostra meno</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Leggi tutto</>
            )}
          </button>
        )}
      </div>
    </motion.article>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Notizie() {
  const [notizie, setNotizie] = useState<Notizia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Categoria | "tutte">("tutte");
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    loadNotizie().then(data => {
      setNotizie(data);
      setLoading(false);
    });

    const unsub = subscribeNotizie(n => {
      setNotizie(prev => [n, ...prev]);
      setNewCount(c => c + 1);
    });
    return unsub;
  }, []);

  const filtrate = filtro === "tutte"
    ? notizie
    : notizie.filter(n => n.categoria === filtro);

  const FILTRI: { key: Categoria | "tutte"; label: string }[] = [
    { key: "tutte",    label: "Tutte" },
    { key: "tappa",    label: "Tappe" },
    { key: "raccolta", label: "Raccolta" },
    { key: "generale", label: "Generali" },
    { key: "emergenza",label: "Avvisi" },
  ];

  const Wrapper = isNativeApp() ? NativeLayout : Layout;

  return (
    <Wrapper>
      {/* Header */}
      <section className="bg-primary text-primary-foreground py-10 px-4 relative">
        <div className="container-narrow">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-7 h-7 text-dona" />
              <span className="font-heading text-xs uppercase tracking-widest text-dona font-bold">
                Aggiornamenti live
              </span>
              {newCount > 0 && (
                <span className="bg-dona text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {newCount} nuov{newCount === 1 ? "o" : "i"}
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
              Notizie
            </h1>
            <p className="font-body text-primary-foreground/70 text-sm">
              Aggiornamenti in tempo reale sul cammino, le tappe e la raccolta fondi.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Filtri */}
      <section className="bg-secondary border-b border-border py-3 px-4 sticky top-0 z-10">
        <div className="container-narrow">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTRI.map(f => (
              <button
                key={f.key}
                onClick={() => { setFiltro(f.key); setNewCount(0); }}
                className={`flex-shrink-0 text-xs font-body font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  filtro === f.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="section-padding bg-background">
        <div className="container-narrow max-w-2xl">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-full mb-1" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : filtrate.length === 0 ? (
            <AnimatedSection>
              <div className="text-center py-16">
                <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-body text-muted-foreground text-sm">
                  {filtro === "tutte"
                    ? "Nessuna notizia ancora. Torna durante il cammino!"
                    : "Nessuna notizia in questa categoria."}
                </p>
              </div>
            </AnimatedSection>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {filtrate.map(n => (
                  <NotiziaCard key={n.id} n={n} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </section>
    </Wrapper>
  );
}
