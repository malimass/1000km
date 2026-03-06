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
                  {(() => {
                    const Wrapper = item.siteUrl
                      ? (props: { children: React.ReactNode }) => (
                          <a href={item.siteUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
                            {props.children}
                          </a>
                        )
                      : (props: { children: React.ReactNode }) => <>{props.children}</>;
                    return (
                      <Wrapper>
                        <div className={`bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center text-center gap-4 h-full${item.siteUrl ? " cursor-pointer" : ""}`}>
                          {/* Logo o iniziale */}
                          {item.logoUrl ? (
                            <div className="h-24 flex items-center justify-center">
                              <img
                                src={item.logoUrl}
                                alt={item.nome}
                                className="max-h-24 max-w-[180px] w-auto object-contain"
                              />
                            </div>
                          ) : (
                            <div className="h-24 w-24 rounded-full bg-dona/10 flex items-center justify-center">
                              <span className="text-3xl font-heading font-bold text-dona">
                                {item.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}

                          {/* Nome e testo */}
                          <div className="flex-1">
                            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                              {item.nome}
                            </h3>
                            {item.testo && (
                              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                                {item.testo}
                              </p>
                            )}
                          </div>

                          {item.siteUrl && (
                            <span className="text-xs text-dona font-medium flex items-center gap-1 mt-auto">
                              Visita il sito →
                            </span>
                          )}
                        </div>
                      </Wrapper>
                    );
                  })()}
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
