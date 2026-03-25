import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Heart, ChevronDown, LogIn, Facebook, Instagram } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Il Percorso", to: "/il-percorso" },
  {
    label: "I Santuari",
    children: [
      { label: "Madonna di San Luca", to: "/madonna-di-san-luca" },
      { label: "SS Crocifisso Nero", to: "/ss-crocifisso-nero" },
    ],
  },
  { label: "Sostenitori", to: "/sostenitori" },
  { label: "Patrocini", to: "/patrocini" },
  { label: "Contatti", to: "/contatti" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [santuariOpen, setSantuariOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-lg pt-safe">
        <div className="container-narrow flex items-center justify-between px-4 py-3 md:py-4">
          <Link to="/" className="shrink-0 font-heading text-lg md:text-xl font-bold text-primary-foreground tracking-wider">
            1000<span className="text-accent">KM</span>DIGRATITUDINE
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-5 ml-6">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label} className="relative group">
                  <button className="whitespace-nowrap text-primary-foreground/80 hover:text-primary-foreground font-body text-sm font-medium tracking-wide transition-colors">
                    {link.label}
                  </button>
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="bg-primary rounded-md shadow-xl border border-primary-foreground/10 min-w-[220px]">
                      {link.children.map((child) => (
                        <Link
                          key={child.to}
                          to={child.to}
                          className="block px-4 py-3 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/5 text-sm font-body transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={link.to}
                  to={link.to!}
                  className={`whitespace-nowrap text-sm font-body font-medium tracking-wide transition-colors ${
                    location.pathname === link.to
                      ? "text-accent"
                      : "text-primary-foreground/80 hover:text-primary-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
            {/* Accedi */}
            <Link
              to="/accedi"
              className={`whitespace-nowrap flex items-center gap-1.5 text-sm font-body font-medium tracking-wide border rounded-md px-3 py-1.5 transition-colors ${
                location.pathname === "/accedi"
                  ? "border-primary-foreground text-primary-foreground"
                  : "border-primary-foreground/40 text-primary-foreground/80 hover:text-primary-foreground hover:border-primary-foreground"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Accedi
            </Link>
            <Button asChild variant="dona" size="lg">
              <Link to="/dona">
                <Heart className="w-4 h-4 mr-2" />
                DONA ORA
              </Link>
            </Button>
          </nav>

          {/* Mobile toggle */}
          <button
            className="lg:hidden text-primary-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden bg-primary border-t border-primary-foreground/10 px-4 overflow-hidden"
            >
              <div className="pb-4">
                {navLinks.map((link) =>
                  link.children ? (
                    <div key={link.label}>
                      <button
                        onClick={() => setSantuariOpen(!santuariOpen)}
                        className="w-full text-left py-3 text-primary-foreground/80 font-body text-sm font-medium flex items-center justify-between"
                      >
                        {link.label}
                        <ChevronDown className={`w-4 h-4 transition-transform ${santuariOpen ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {santuariOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {link.children.map((child) => (
                              <Link
                                key={child.to}
                                to={child.to}
                                onClick={() => setMobileOpen(false)}
                                className="block py-2 pl-4 text-primary-foreground/70 text-sm font-body"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to!}
                      onClick={() => setMobileOpen(false)}
                      className="block py-3 text-primary-foreground/80 font-body text-sm font-medium"
                    >
                      {link.label}
                    </Link>
                  )
                )}
                {/* Accedi mobile */}
                <Link
                  to="/accedi"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-3 mt-1 text-primary-foreground font-body text-sm font-semibold border border-primary-foreground/40 rounded-md px-3"
                >
                  <LogIn className="w-4 h-4" />
                  Accedi
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container-narrow px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-heading text-lg font-bold mb-4">
                1000<span className="text-accent">KM</span>DIGRATITUDINE
              </h3>
              <p className="text-primary-foreground/70 text-sm font-body leading-relaxed">
                Associazione culturale e solidaristica. Un cammino di fede, gratitudine e solidarietà.
              </p>
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold mb-4 uppercase tracking-wider">Link Utili</h4>
              <div className="flex flex-col gap-2">
                {([
                  { to: "/il-percorso",  label: "Il Percorso" },
                  { to: "/notizie",      label: "Notizie" },
                  { to: "/servizi",      label: "Servizi" },
                  { to: "/sostenitori",  label: "Sostenitori del cammino" },
                  { to: "/patrocini",    label: "Patrocini istituzionali" },
                  { to: "/contatti",     label: "Contatti" },
                ] as const).map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="text-primary-foreground/70 hover:text-accent text-sm font-body transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold mb-4 uppercase tracking-wider">Seguici</h4>
              <p className="text-primary-foreground/70 text-sm font-body leading-relaxed mb-4">
                Raccolta fondi solidale per la ricerca. Rendicontazione pubblica e trasparente.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://www.facebook.com/1000kmdigratitudine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/1000kmdigratitudine/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-accent hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center text-primary-foreground/50 text-xs font-body">
            © 2026 1000kmdigratitudine. Tutti i diritti riservati.
          </div>
        </div>
      </footer>

      {/* Mobile sticky DONA — nascosto sulla pagina /dona */}
      {location.pathname !== "/dona" && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe bg-primary/95 backdrop-blur-sm border-t border-primary-foreground/10">
          <Button asChild variant="dona" size="lg" className="w-full">
            <Link to="/dona">
              <Heart className="w-4 h-4 mr-2" />
              DONA ORA
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
