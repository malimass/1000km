import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

export default function Dona() {
  return (
    <Layout>
      <section className="relative h-[40vh] flex items-center justify-center bg-primary">
        <div className="text-center px-4">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Dona Ora</h1>
          <p className="font-body text-primary-foreground/80">Ogni contributo conta. Sostieni la ricerca.</p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-2xl text-center">
          <div className="bg-card rounded-lg p-8 md:p-12 shadow-sm border border-border">
            <Heart className="w-16 h-16 text-dona mx-auto mb-6" />
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Sostieni Komen Italia</h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-8">
              La raccolta fondi è interamente destinata a <strong className="text-dona">Komen Italia</strong> per la lotta contro i tumori al seno. Ogni donazione sarà rendicontata pubblicamente con la massima trasparenza.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {["€ 10", "€ 25", "€ 50", "€ 100"].map((amount) => (
                <button
                  key={amount}
                  className="rounded-lg border-2 border-dona/30 hover:border-dona bg-dona/5 hover:bg-dona/10 py-4 font-heading text-xl font-bold text-foreground transition-colors"
                >
                  {amount}
                </button>
              ))}
            </div>

            <p className="text-muted-foreground/60 font-body text-sm mb-8">
              La piattaforma di pagamento sarà attivata a breve. Per donazioni immediate, contattaci direttamente.
            </p>

            <Button asChild variant="outline">
              <Link to="/contatti">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Contattaci per donare
              </Link>
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-12">
            <div className="flex justify-between text-sm font-body mb-2">
              <span className="text-muted-foreground">Raccolta fondi</span>
              <span className="text-dona font-bold">€ 2.500 / € 50.000</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-dona rounded-full" style={{ width: "5%" }} />
            </div>
          </div>
        </div>
      </section>
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
