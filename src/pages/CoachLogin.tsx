/**
 * CoachLogin.tsx — Accesso coach
 *
 * Supporta due metodi:
 *  1. Email + password — per coach registrati
 *  2. PIN — chiama l'API per ottenere un JWT valido
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInUser } from "@/lib/auth";
import { setAuthToken } from "@/lib/supabase";

export default function CoachLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"email" | "pin">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { user, error: err } = await signInUser(email, password);
    if (err || !user) { setError(err ?? "Credenziali non valide"); setLoading(false); return; }
    if (user.role !== "coach") { setError("Questo account non è un coach. Vai all'area atleti."); setLoading(false); return; }
    localStorage.setItem("gp_coach_auth", "1");
    navigate("/coach", { replace: true });
    setLoading(false);
  }

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "PIN non valido. Riprova.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.token) setAuthToken(data.token);
      localStorage.setItem("gp_coach_auth", "1");
      navigate("/coach", { replace: true });
    } catch {
      setError("Errore di rete. Riprova.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-safe">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 mb-4">
            <Dumbbell className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Area Coach</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Gratitude Path – Analisi Allenamenti</p>
        </div>

        <div className="flex bg-muted rounded-xl p-1 mb-5">
          {(["email", "pin"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === m ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
              {m === "email" ? "Email / Password" : "PIN"}
            </button>
          ))}
        </div>

        {mode === "email" ? (
          <form onSubmit={handleEmailLogin} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <label className="block">
              <span className="text-xs font-semibold block mb-1">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@esempio.it"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-green-500/40" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold block mb-1">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPwd ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-green-500/40" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            {error && <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              <Dumbbell className="w-4 h-4" />
              {loading ? "Accesso…" : "Accedi"}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePinLogin} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">PIN accesso</label>
              <input type="password" required autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••••••"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 bg-background text-foreground" />
            </div>
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              <Dumbbell className="w-4 h-4" />
              {loading ? "Accesso…" : "Accedi con PIN"}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-muted-foreground mt-4 space-y-1">
          <p>Nuovo coach? <a href="/coach/registrati" className="text-green-600 font-semibold hover:underline">Registrati</a></p>
          <p>Sei un atleta? <a href="/atleta/accedi" className="text-primary font-semibold hover:underline">Area atleti</a></p>
        </div>
      </div>
    </div>
  );
}
