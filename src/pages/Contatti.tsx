import { Link } from "react-router-dom";
import { Heart, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useState } from "react";
import { z } from "zod";

const contactSchema = z.object({
  nome: z.string().trim().min(1, "Campo obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").max(255),
  oggetto: z.string().trim().min(1, "Campo obbligatorio").max(200),
  messaggio: z.string().trim().min(1, "Campo obbligatorio").max(1000),
  privacy: z.literal(true, { errorMap: () => ({ message: "Devi accettare la privacy policy" }) }),
});

export default function Contatti() {
  const [form, setForm] = useState({ nome: "", email: "", oggetto: "", messaggio: "", privacy: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
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
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Contatti</h1>
          <p className="font-body text-primary-foreground/80">Scrivici per qualsiasi informazione</p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-2xl">
          {submitted ? (
            <div className="bg-card rounded-lg p-8 text-center shadow-sm">
              <Mail className="w-12 h-12 text-dona mx-auto mb-4" />
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">Messaggio inviato!</h2>
              <p className="text-muted-foreground font-body">Grazie per averci scritto. Ti risponderemo al più presto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card rounded-lg p-8 shadow-sm space-y-4">
              {[
                { name: "nome", label: "Nome", type: "text" },
                { name: "email", label: "Email", type: "email" },
                { name: "oggetto", label: "Oggetto", type: "text" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-body font-medium text-foreground mb-1">{f.label} *</label>
                  <input
                    type={f.type}
                    value={form[f.name as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors[f.name] && <p className="text-destructive text-xs mt-1 font-body">{errors[f.name]}</p>}
                </div>
              ))}
              <div>
                <label className="block text-sm font-body font-medium text-foreground mb-1">Messaggio *</label>
                <textarea
                  rows={5}
                  value={form.messaggio}
                  onChange={(e) => setForm({ ...form, messaggio: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                {errors.messaggio && <p className="text-destructive text-xs mt-1 font-body">{errors.messaggio}</p>}
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.privacy}
                  onChange={(e) => setForm({ ...form, privacy: e.target.checked })}
                  className="mt-1 rounded border-input"
                />
                <label className="text-sm font-body text-muted-foreground">
                  Acconsento al trattamento dei dati personali ai sensi del GDPR. *
                </label>
              </div>
              {errors.privacy && <p className="text-destructive text-xs font-body">{errors.privacy}</p>}
              <Button type="submit" variant="dona" className="w-full">Invia messaggio</Button>
            </form>
          )}

          <div className="mt-12 text-center">
            <p className="text-muted-foreground font-body text-sm mb-4">Vuoi fare la differenza?</p>
            <Button asChild variant="dona" size="lg">
              <Link to="/dona">
                <Heart className="w-4 h-4 mr-2" />
                DONA ORA
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
