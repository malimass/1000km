import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Loader2, LogIn } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password: password,
    });

    if (authError) {
      setError("Credenziali non valide. Riprova.");
      setLoading(false);
      return;
    }

    navigate("/admin-live", { replace: true });
  }

  // Se Supabase non è configurato mostra avviso e reindirizza
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-xl p-6 shadow-sm text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Supabase non configurato</p>
          <p className="text-xs text-muted-foreground">
            Aggiungi <code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code> e{" "}
            <code className="bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code> nelle
            variabili d'ambiente per abilitare l'autenticazione.
          </p>
          <button
            onClick={() => navigate("/admin-live")}
            className="text-sm text-dona underline"
          >
            Vai comunque all'admin →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full">

        {/* Logo / titolo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dona/10 mb-4">
            <LogIn className="w-7 h-7 text-dona" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Gratitude Path</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@esempio.it"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-dona/40 bg-background text-foreground"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-semibold">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-dona text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Accesso in corso…</>
              : <><LogIn className="w-4 h-4" />Accedi</>
            }
          </button>
        </form>

      </div>
    </div>
  );
}
