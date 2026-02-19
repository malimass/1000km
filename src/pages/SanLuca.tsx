import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import sanLucaImg from "@/assets/san-luca.jpg";

export default function SanLuca() {
  return (
    <Layout>
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <img src={sanLucaImg} alt="Santuario della Madonna di San Luca, Bologna" className="absolute inset-0 w-full h-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">Santuario della Madonna di San Luca</h1>
          <p className="font-body text-primary-foreground/80">Bologna – Il punto di partenza</p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-narrow max-w-3xl">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">La Storia</h2>
          <div className="font-body text-muted-foreground leading-relaxed space-y-4">
            <p>
              Il Santuario della Madonna di San Luca sorge sul Colle della Guardia, a circa 300 metri di altitudine, dominando la città di Bologna. La sua storia risale al XII secolo, quando un eremita greco portò dall'Oriente un'icona della Vergine attribuita a San Luca Evangelista.
            </p>
            <p>
              Il santuario è collegato alla città attraverso il portico più lungo del mondo: quasi 4 km di arcate che, dal 1674, accompagnano i pellegrini nella salita verso il colle. Un capolavoro architettonico di 666 archi che rappresenta un unicum nel patrimonio culturale mondiale.
            </p>
          </div>

          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">L'Icona</h2>
          <div className="font-body text-muted-foreground leading-relaxed space-y-4">
            <p>
              L'icona della Vergine col Bambino, nota come "Madonna di San Luca", è venerata come immagine sacra protettrice di Bologna. La tradizione attribuisce la sua realizzazione all'evangelista Luca, anche se gli studi la datano tra il XII e il XIII secolo.
            </p>
          </div>

          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">I Miracoli</h2>
          <div className="font-body text-muted-foreground leading-relaxed space-y-4">
            <p>
              La tradizione popolare attribuisce alla Madonna di San Luca numerosi miracoli e grazie ricevute. Ogni anno, nel mese di maggio, l'icona viene portata in processione fino alla Cattedrale di San Pietro, un evento che da secoli coinvolge l'intera città.
            </p>
            <p>
              Tra i miracoli più celebri, la tradizione ricorda la fine di piogge torrenziali e carestie, guarigioni inspiegabili e protezioni durante i conflitti bellici.
            </p>
          </div>

          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6 mt-12">Il collegamento con il cammino</h2>
          <div className="font-body text-muted-foreground leading-relaxed space-y-4">
            <p>
              Da questo luogo sacro parte il cammino di 1000 km di gratitudine. Il Santuario rappresenta l'inizio di un viaggio che unisce fede, sport e solidarietà, da nord a sud, attraverso l'Italia.
            </p>
          </div>

          <div className="mt-12 text-center">
            <Button asChild variant="dona" size="lg" className="px-10 py-6">
              <Link to="/dona">
                <Heart className="w-5 h-5 mr-2" />
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
