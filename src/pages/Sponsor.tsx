import { Link } from "react-router-dom";
import { Heart, Eye, Award, Download, ArrowRight } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { useState } from "react";
import { z } from "zod";

const sponsorSchema = z.object({
  azienda: z.string().trim().min(1, "Campo obbligatorio").max(100),
  referente: z.string().trim().min(1, "Campo obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").max(255),
  messaggio: z.string().trim().max(1000).optional(),
});

const pacchetti = [
  {
    nome: "Bronze",
    prezzo: "€ 500",
    vantaggi: ["Logo sul sito", "Menzione social", "Certificato partecipazione"],
  },
  {
    nome: "Silver",
    prezzo: "€ 2.000",
    vantaggi: ["Logo sul sito e materiale stampa", "Post social dedicato", "Presenza eventi", "Report finale"],
    evidenziato: false,
  },
  {
    nome: "Gold",
    prezzo: "€ 5.000+",
    vantaggi: ["Massima visibilità su tutti i canali", "Naming partnership tappa", "Interviste e contenuti dedicati", "Report completo con analytics"],
    evidenziato: true,
  },
];

export default function Sponsor() {
  useSEO({
    title: "Diventa Sponsor",
    description: "Sostieni il cammino solidale 1000 km di Gratitudine come sponsor. Visibilità su web, social e durante l'evento per la tua azienda.",
  });
  const [form, setForm] = useState({ azienda: "", referente: "", email: "", messaggio: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = sponsorSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  return (
    <Layout>
      <section className="relative h-[40vh] flex items-center justify-center bg-primary">
        <div className="text-center px-4">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Diventa Sponsor</h1>
          <p className="font-body text-primary-foreground/80">Associa il tuo brand a un progetto di valore</p>
        </div>
      </section>

      {/* Perché */}
      <section className="section-padding bg-secondary">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Perché sponsorizzare</h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Eye className="w-8 h-8" />, title: "Visibilità", text: "Il tuo brand associato a un'impresa seguita da media e social." },
              { icon: <Heart className="w-8 h-8" />, title: "Impatto sociale", text: "Un contributo concreto alla ricerca contro i tumori al seno." },
              { icon: <Award className="w-8 h-8" />, title: "Reputazione", text: "Rafforza i valori aziendali con un progetto autentico e trasparente." },
            ].map((item, i) => (
              <AnimatedSection key={item.title} delay={i * 0.15}>
                <div className="bg-card rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow h-full">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dona/10 text-dona mb-4">{item.icon}</div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground font-body text-sm">{item.text}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pacchetti */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Pacchetti Sponsor</h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pacchetti.map((p, i) => (
              <AnimatedSection key={p.nome} delay={i * 0.15}>
                <div
                  className={`rounded-lg p-8 shadow-sm border-2 transition-all hover:shadow-lg hover:-translate-y-1 h-full flex flex-col ${
                    p.evidenziato ? "border-dona bg-dona/5" : "border-border bg-card"
                  }`}
                >
                  {p.evidenziato && (
                    <span className="inline-block bg-dona text-dona-foreground text-xs font-body font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 self-start">
                      Consigliato
                    </span>
                  )}
                  <h3 className="font-heading text-xl font-bold text-foreground mb-2">{p.nome}</h3>
                  <div className="font-heading text-3xl font-bold text-dona mb-6">{p.prezzo}</div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {p.vantaggi.map((v) => (
                      <li key={v} className="flex items-start gap-2 text-sm font-body text-muted-foreground">
                        <ArrowRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                        {v}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={p.evidenziato ? "dona" : "dona-outline"} className="w-full">
                    <a href="#form-sponsor">Contattaci</a>
                  </Button>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.3}>
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Scarica il Media Kit (PDF)
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Form */}
      <section id="form-sponsor" className="section-padding bg-secondary">
        <div className="container-narrow max-w-xl">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Contattaci</h2>
            {submitted ? (
              <div className="bg-card rounded-lg p-8 text-center shadow-sm">
                <Heart className="w-12 h-12 text-dona mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">Grazie!</h3>
                <p className="text-muted-foreground font-body">Ti ricontatteremo al più presto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card rounded-lg p-8 shadow-sm space-y-4">
                {[
                  { name: "azienda", label: "Azienda", type: "text" },
                  { name: "referente", label: "Referente", type: "text" },
                  { name: "email", label: "Email", type: "email" },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="block text-sm font-body font-medium text-foreground mb-1">{f.label} *</label>
                    <input
                      type={f.type}
                      value={form[f.name as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors[f.name] && <p className="text-destructive text-xs mt-1 font-body">{errors[f.name]}</p>}
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-body font-medium text-foreground mb-1">Messaggio</label>
                  <textarea
                    rows={4}
                    value={form.messaggio}
                    onChange={(e) => setForm({ ...form, messaggio: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <Button type="submit" variant="dona" className="w-full">Invia richiesta</Button>
              </form>
            )}
          </AnimatedSection>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
