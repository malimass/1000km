/**
 * AtletaAuth.tsx — Registrazione / Login per gli atleti
 * Route: /atleta/accedi
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Footprints } from "lucide-react";
import { signUpUser, signInUser } from "@/lib/auth";

export default function AtletaAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "register") {
      const { error: err } = await signUpUser(form.email, form.password, form.name, "athlete");
      if (err) {
        const msg = err.toLowerCase().includes("already registered")
          ? "Email già registrata. Usa il tab \"Accedi\" per effettuare il login."
          : err;
        setError(msg); setLoading(false); return;
      }
      setInfo("Controlla la tua email per confermare l'account, poi accedi.");
      setMode("login");
    } else {
      const { user, error: err } = await signInUser(form.email, form.password);
      if (err || !user) { setError(err ?? "Errore accesso"); setLoading(false); return; }
      if (user.role !== "athlete") { setError("Questo account non è un atleta."); setLoading(false); return; }
      navigate("/atleta", { replace: true });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Footprints className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Area Atleta</h1>
          <p className="text-muted-foreground text-sm mt-1">Gratitude Path — 1000km di Gratitudine</p>
        </div>

        {/* Tab */}
        <div className="flex bg-muted rounded-xl p-1 mb-5">
          {(["login", "register"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); setInfo(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === m ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
              {m === "login" ? "Accedi" : "Registrati"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="text-xs font-semibold text-foreground block mb-1">Nome e cognome</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" required value={form.name} onChange={set("name")} placeholder="Mario Rossi"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </label>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-foreground block mb-1">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" required value={form.email} onChange={set("email")} placeholder="mario@esempio.it"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-foreground block mb-1">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPwd ? "text" : "password"} required minLength={6} value={form.password} onChange={set("password")} placeholder="min 6 caratteri"
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">{error}</p>}
          {info && <p className="text-xs text-green-600 font-semibold bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">{info}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Attendere…" : mode === "login" ? "Accedi" : "Crea account"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Sei un coach?{" "}
          <a href="/coach/registrati" className="text-primary font-semibold hover:underline">Registrati come coach</a>
          {" · "}
          <a href="/coach-login" className="text-primary font-semibold hover:underline">Accedi come coach</a>
        </p>
      </div>
    </div>
  );
}
