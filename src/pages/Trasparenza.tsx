import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Download, Building2, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

export default function Trasparenza() {
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
            <FileText className="w-8 h-8 text-dona" />
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
              Trasparenza
            </h1>
          </div>

          <p className="font-body text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            Crediamo nella trasparenza totale. In questa pagina trovi tutti i documenti
            ufficiali dell'Associazione e le informazioni sulla gestione delle donazioni.
          </p>

          {/* Info Associazione */}
          <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <Building2 className="w-5 h-5 text-dona" />
              <h2 className="font-heading text-lg font-bold text-foreground">L'Associazione</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Denominazione</span>
                <span className="text-foreground font-medium">Associazione 1000 KM di Gratitudine</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Natura giuridica</span>
                <span className="text-foreground font-medium">Associazione non riconosciuta</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Sede legale</span>
                <span className="text-foreground font-medium">Via Nerio Nannetti 2/3 — 40069 Zola Predosa (BO)</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Codice Fiscale</span>
                <span className="text-foreground font-medium">91477340375</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Presidente</span>
                <span className="text-foreground font-medium">Malivindi Annunziato</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Data costituzione</span>
                <span className="text-foreground font-medium">13 Febbraio 2026</span>
              </div>
            </div>
          </div>

          {/* Documenti */}
          <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <FileText className="w-5 h-5 text-dona" />
              <h2 className="font-heading text-lg font-bold text-foreground">Documenti ufficiali</h2>
            </div>
            <div className="space-y-3">
              <a
                href="/statuto-associazione.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-dona/50 hover:bg-dona/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-dona transition-colors" />
                  <div>
                    <span className="font-body text-sm font-semibold text-foreground block">Atto Costitutivo e Statuto</span>
                    <span className="font-body text-xs text-muted-foreground">PDF — Registrato il 13/02/2026</span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-dona transition-colors" />
              </a>
            </div>
          </div>

          {/* Finalità */}
          <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <Heart className="w-5 h-5 text-dona" />
              <h2 className="font-heading text-lg font-bold text-foreground">Finalità e destinazione fondi</h2>
            </div>
            <div className="font-body text-sm text-muted-foreground space-y-3 leading-relaxed">
              <p>
                L'Associazione persegue finalità civiche, culturali e solidaristiche.
                È <strong className="text-foreground">apartitica, aconfessionale</strong> e <strong className="text-foreground">non persegue finalità di lucro</strong>.
              </p>
              <p>
                Tutte le donazioni raccolte tramite questo sito sono interamente devolute a{" "}
                <strong className="text-foreground">Komen Italia — Comitato Emilia Romagna</strong>{" "}
                per la ricerca e la prevenzione dei tumori al seno.
              </p>
              <p>
                È vietata la distribuzione, anche indiretta, di utili o avanzi di gestione,
                come previsto dall'Art. 4 dello Statuto.
              </p>
            </div>
          </div>

          {/* Consiglio Direttivo */}
          <div className="bg-card rounded-xl p-6 md:p-8 shadow-sm border border-border/50">
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-5 h-5 text-dona" />
              <h2 className="font-heading text-lg font-bold text-foreground">Consiglio Direttivo</h2>
            </div>
            <div className="space-y-3">
              {[
                { nome: "Malivindi Annunziato", ruolo: "Presidente" },
                { nome: "Malivindi Massimo", ruolo: "Vicepresidente" },
                { nome: "Malivindi Carmela", ruolo: "Consigliere" },
              ].map((m) => (
                <div key={m.nome} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="font-body text-sm font-medium text-foreground">{m.nome}</span>
                  <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">{m.ruolo}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </Layout>
  );
}
