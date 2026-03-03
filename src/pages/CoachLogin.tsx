import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell } from "lucide-react";

const COACH_PIN = import.meta.env.VITE_COACH_PIN || "coach2026";

export default function CoachLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== COACH_PIN) {
      setError("PIN non valido. Riprova.");
      return;
    }
    localStorage.setItem("gp_coach_auth", "1");
    navigate("/coach", { replace: true });
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
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 bg-background text-foreground"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <Dumbbell className="w-4 h-4" />
            Accedi all'area coach
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4 font-body">
          Imposta <code className="bg-muted px-1 rounded">VITE_COACH_PIN</code> nel file <code className="bg-muted px-1 rounded">.env.local</code>
        </p>
      </div>
    </div>
  );
}
