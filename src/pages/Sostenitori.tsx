import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import AnimatedSection from "@/components/AnimatedSection";
import { loadSosteniPage, type SosteniPage, SOSTENI_DEFAULTS } from "@/lib/sostenitori";

export default function Sostenitori() {
  const [page, setPage] = useState<SosteniPage>(SOSTENI_DEFAULTS);

  useEffect(() => {
    loadSosteniPage().then(setPage);
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative h-[40vh] flex items-center justify-center bg-primary">
        <div className="text-center px-4">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            {page.title}
          </h1>
          {page.intro && (
            <p className="font-body text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              {page.intro}
            </p>
          )}
        </div>
      </section>

      {/* Griglia sostenitori */}
      <section className="section-padding bg-background">
        <div className="container-narrow">
          {page.items.length === 0 ? (
            <AnimatedSection>
              <p className="text-center text-muted-foreground font-body py-12">
                I sostenitori verranno pubblicati a breve.
              </p>
            </AnimatedSection>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {page.items.map((item, i) => (
                <AnimatedSection key={item.id} delay={i * 0.1}>
                  <div className="bg-muted/40 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
                    {/* Logo area */}
                    <div className="bg-card border-b border-border mx-5 mt-5 rounded-xl flex items-center justify-center p-6 min-h-[160px]">
                      {item.logoUrl ? (
                        <img
                          src={item.logoUrl}
                          alt={item.nome}
                          className="max-h-32 max-w-full w-auto object-contain"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-dona/10 flex items-center justify-center">
                          <span className="text-4xl font-heading font-bold text-dona">
                            {item.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Testo: nome in grassetto inline + descrizione */}
                    <div className="flex-1 px-5 pt-5 pb-3 text-center">
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">{item.nome}</strong>
                        {item.testo ? ` ${item.testo}` : ""}
                      </p>
                    </div>

                    {/* Bottone "Scopri di più" */}
                    {item.siteUrl ? (
                      <div className="px-5 pb-5 pt-2 mt-auto">
                        <a
                          href={item.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-foreground/80 hover:bg-foreground text-background font-semibold text-sm py-3 rounded-full transition-colors"
                        >
                          Scopri di più
                        </a>
                      </div>
                    ) : (
                      <div className="pb-5" />
                    )}
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Spazio per navbar mobile */}
      <div className="h-16 lg:hidden" />
    </Layout>
  );
}
