import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuthToken } from "@/lib/supabase";
import { LogIn } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pin,     setPin]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
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
      localStorage.setItem("gp_admin_auth", "1");
      navigate("/admin-live", { replace: true });
    } catch {
      setError("Errore di rete. Riprova.");
      setLoading(false);
    }
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
