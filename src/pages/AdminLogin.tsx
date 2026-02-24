import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LogIn } from "lucide-react";

// PIN letto da env (VITE_ADMIN_PIN) con fallback sicuro.
// Le credenziali Supabase sono usate solo in background per i permessi RLS.
const ADMIN_PIN   = import.meta.env.VITE_ADMIN_PIN   || "gratitude2026";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";
const ADMIN_PASS  = import.meta.env.VITE_ADMIN_PASS  || "";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pin,     setPin]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (pin !== ADMIN_PIN) {
      setError("PIN non valido. Riprova.");
      return;
    }

    setLoading(true);
    setError(null);

    // Segna accesso nel localStorage (valido per questo dispositivo)
    localStorage.setItem("gp_admin_auth", "1");

    // Auth Supabase in background per mantenere i permessi RLS di scrittura GPS
    if (supabase && ADMIN_EMAIL && ADMIN_PASS) {
      await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    }

    navigate("/admin-live", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 pt-safe">
      <div className="max-w-sm w-full">

        {/* Logo / titolo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dona/10 mb-4">
            <LogIn className="w-7 h-7 text-dona" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Gratitude Path</p>
        </div>

        {/* Form PIN */}
        <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">PIN accesso</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pin}
              onChange={e => setPin(e.target.value)}
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
            <LogIn className="w-4 h-4" />
            {loading ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>

      </div>
    </div>
  );
}
