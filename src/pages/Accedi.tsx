/**
 * Accedi.tsx — Login / Registrazione unificata
 * Route: /accedi
 *
 * Tab "Accedi": email + password → redirect in base al ruolo
 * Tab "Registrati": nome + email + password + scelta ruolo (atleta/coach)
 *
 * Il login admin (PIN) resta su /admin-login.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, LogIn, Loader2, User, Mail, Lock, Eye, EyeOff, Footprints, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { signInUser, signUpUser, getCurrentUser } from "@/lib/auth";

// ─── Redirect per ruolo ────────────────────────────────────────────────────────

function redirectForRole(role: string | undefined): string {
  if (role === "athlete") return "/atleta";
  if (role === "coach") return "/coach";
  return "/il-mio-percorso";
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Accedi() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"athlete" | "coach">("athlete");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Se già loggato, redirige subito ──
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) navigate(redirectForRole(user.role), { replace: true });
    });
  }, [navigate]);

  // ── Login ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { user, error: err } = await signInUser(form.email, form.password);
    setLoading(false);

    if (err || !user) {
      const msg = err?.toLowerCase().includes("invalid login")
        ? "Email o password non corretti."
        : (err ?? "Errore durante l'accesso.");
      setError(msg);
      return;
    }

    // Imposta flag localStorage per le route protette
    if (user.role === "coach") localStorage.setItem("gp_coach_auth", "1");
    navigate(redirectForRole(user.role), { replace: true });
  }

  // ── Registrazione ──
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { user, error: err } = await signUpUser(form.email, form.password, form.name, role);
    setLoading(false);

    if (err) {
      const msg = err.toLowerCase().includes("already registered") || err.toLowerCase().includes("già registrata")
        ? "Email già registrata. Usa il tab \"Accedi\" per effettuare il login."
        : err;
      setError(msg);
      return;
    }

    if (!user) {
      setError("Errore durante la registrazione.");
      return;
    }

    // Imposta flag localStorage per le route protette
    if (user.role === "coach") localStorage.setItem("gp_coach_auth", "1");
    navigate(redirectForRole(user.role), { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 pt-safe">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dona/10 mb-4">
            <Heart className="w-7 h-7 text-dona" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-1">
            {tab === "login" ? "Accedi" : "Registrati"}
          </h1>
          <p className="font-body text-muted-foreground text-sm">
            1000km di Gratitudine — {tab === "login" ? "entra con il tuo account" : "crea il tuo account"}
          </p>
        </div>

        {/* Tab Accedi / Registrati */}
        <div className="flex bg-muted rounded-xl p-1 mb-5">
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setInfo(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                tab === t ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {t === "login" ? "Accedi" : "Registrati"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={tab === "login" ? handleLogin : handleRegister}
          className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4"
        >
          {/* Nome (solo registrazione) */}
          {tab === "register" && (
            <label className="block">
              <span className="text-xs font-semibold text-foreground block mb-1">Nome e cognome</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Mario Rossi"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40"
                />
              </div>
            </label>
          )}

          {/* Email */}
          <label className="block">
            <span className="text-xs font-semibold text-foreground block mb-1">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="tua@email.it"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40"
              />
            </div>
          </label>

          {/* Password */}
          <label className="block">
            <span className="text-xs font-semibold text-foreground block mb-1">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={set("password")}
                placeholder="min 6 caratteri"
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-dona/40"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {/* Scelta ruolo (solo registrazione) */}
          {tab === "register" && (
            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">Mi registro come</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("athlete")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    role === "athlete"
                      ? "border-dona bg-dona/5 text-dona"
                      : "border-border text-muted-foreground hover:border-dona/40"
                  }`}
                >
                  <Footprints className="w-6 h-6" />
                  <span className="text-sm font-semibold">Atleta</span>
                  <span className="text-[10px] leading-tight opacity-70">Traccia i tuoi allenamenti</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("coach")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    role === "coach"
                      ? "border-green-500 bg-green-500/5 text-green-600"
                      : "border-border text-muted-foreground hover:border-green-500/40"
                  }`}
                >
                  <Dumbbell className="w-6 h-6" />
                  <span className="text-sm font-semibold">Coach</span>
                  <span className="text-[10px] leading-tight opacity-70">Gestisci i tuoi atleti</span>
                </button>
              </div>
            </div>
          )}

          {/* Errori / Info */}
          {error && (
            <p className="text-xs text-destructive font-semibold bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs text-green-600 font-semibold bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50 ${
              tab === "register" && role === "coach"
                ? "bg-green-600 text-white hover:opacity-90"
                : "bg-dona text-white hover:opacity-90"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading
              ? "Attendere..."
              : tab === "login"
                ? "Accedi"
                : role === "coach"
                  ? "Crea account coach"
                  : "Crea account atleta"
            }
          </button>
        </form>

        {/* Link utili */}
        <div className="mt-6 text-center text-xs text-muted-foreground font-body space-y-1.5">
          <p>
            <Link to="/partecipa" className="text-primary font-semibold hover:underline">
              Unisciti alla community
            </Link>
          </p>
          <p>
            <Link to="/admin-login" className="text-muted-foreground hover:text-foreground hover:underline">
              Accesso admin
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
