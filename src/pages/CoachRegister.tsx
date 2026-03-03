/**
 * CoachRegister.tsx — Registrazione coach
 * Route: /coach/registrati
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { signUpUser } from "@/lib/auth";

export default function CoachRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signUpUser(form.email, form.password, form.name, "coach");
    if (err) { setError(err); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 mb-4">
            <Dumbbell className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold font-heading mb-2">Account creato!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Controlla la tua email per confermare l'account.<br />
            Poi accedi con le tue credenziali.
          </p>
          <button onClick={() => navigate("/coach-login")}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            Vai al login coach
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 mb-4">
            <Dumbbell className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Registrati come Coach</h1>
          <p className="text-muted-foreground text-sm mt-1">Gratitude Path — Area Coach</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <label className="block">
            <span className="text-xs font-semibold block mb-1">Nome (visibile agli atleti)</span>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" required value={form.name} onChange={set("name")} placeholder="Coach Mario Rossi"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-green-500/40" />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold block mb-1">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" required value={form.email} onChange={set("email")} placeholder="coach@esempio.it"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-green-500/40" />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold block mb-1">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPwd ? "text" : "password"} required minLength={6} value={form.password} onChange={set("password")} placeholder="min 6 caratteri"
                className="w-full pl-9 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-green-500/40" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Creazione account…" : "Crea account coach"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Hai già un account?{" "}
          <a href="/coach-login" className="text-green-600 font-semibold hover:underline">Accedi</a>
          {" · "}
          <a href="/atleta/accedi" className="text-primary font-semibold hover:underline">Sei un atleta?</a>
        </p>
      </div>
    </div>
  );
}
