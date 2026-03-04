/**
 * Accedi.tsx — Login unificato per tutti i ruoli
 * Route: /accedi
 *
 * Dopo il login legge profiles.role e redirige:
 *   athlete  → /atleta
 *   coach    → /coach
 *   altri    → /il-mio-percorso
 *
 * La registrazione community è su /partecipa.
 * Il login admin (PIN) è su /admin-login.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, LogIn, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { signInUser } from "@/lib/auth";

// ─── Icone provider OAuth ─────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 9a9 9 0 10-10.406 8.892V11.61H5.31V9h2.284V7.018C7.594 4.76 8.93 3.52 10.99 3.52c.963 0 1.97.172 1.97.172v2.216h-1.11c-1.093 0-1.434.679-1.434 1.374V9h2.44l-.39 2.61h-2.05v6.282A9.002 9.002 0 0018 9z" fill="#1877F2"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-162-39.3c-76.5 0-103.7 40.8-165.9 40.8s-105.5-57.9-155.5-127.4C46 440.8 43.7 320.3 71.5 247.5c28.5-74.4 90.3-120.7 158.1-120.7 65.9 0 107.7 39.3 161.8 39.3s72.2-39.3 162.1-39.3c57.8 0 123.4 22.2 167.7 83.4zm-97.2-195.2c37.4-44.4 64.1-106.5 64.1-168.5 0-8.5-.6-17.1-2.1-24.1-60.3 2.2-132.3 40.3-175.9 90.7-33.5 38.3-65.6 100.4-65.6 163.3 0 9.1 1.5 18.3 2.1 21.3 3.8.6 10 1.5 16.2 1.5 54.3 0 121.5-36.4 161.2-84.2z"/>
    </svg>
  );
}

// ─── Redirect per ruolo ────────────────────────────────────────────────────────

function redirectForRole(role: string | undefined): string {
  if (role === "athlete") return "/atleta";
  if (role === "coach") return "/coach";
  return "/il-mio-percorso";
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Accedi() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // ── Se già loggato, redirige subito ──
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const { data: profile } = await supabase!
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      navigate(redirectForRole(profile?.role), { replace: true });
    });
  }, [navigate]);

  // ── Login email + password ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { user, error: err } = await signInUser(email, password);
    setLoading(false);

    if (err || !user) {
      const msg = err?.toLowerCase().includes("invalid login")
        ? "Email o password non corretti."
        : (err ?? "Errore durante l'accesso.");
      setError(msg);
      return;
    }

    // Coach: imposta flag localStorage per ProtectedCoachRoute
    if (user.role === "coach") localStorage.setItem("gp_coach_auth", "1");

    navigate(redirectForRole(user.role), { replace: true });
  }

  // ── Login OAuth (Google / Facebook / Apple) ──
  async function handleOAuth(provider: "google" | "facebook" | "apple") {
    if (!supabase) return;
    setOauthLoading(provider);
    setError(null);
    // Dopo l'autenticazione OAuth il provider redirige a /accedi
    // e l'useEffect sopra legge il ruolo e fa il redirect corretto
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/accedi` },
    });
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">
          Supabase non configurato. Aggiungi VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
        </p>
      </div>
    );
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
          <h1 className="font-heading text-3xl font-bold text-foreground mb-1">Accedi</h1>
          <p className="font-body text-muted-foreground text-sm">
            1000km di Gratitudine — entra con il tuo account
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-3 mb-6">
          {(["google", "facebook", "apple"] as const).map((provider) => {
            const labels = { google: "Google", facebook: "Facebook", apple: "Apple" };
            const icons  = { google: <GoogleIcon />, facebook: <FacebookIcon />, apple: <AppleIcon /> };
            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleOAuth(provider)}
                disabled={!!oauthLoading}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
              >
                {oauthLoading === provider
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : icons[provider]
                }
                Continua con {labels[provider]}
              </button>
            );
          })}
        </div>

        {/* Divisore */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground font-body">
              oppure con email
            </span>
          </div>
        </div>

        {/* Form login */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label htmlFor="email" className="font-body text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="tua@email.it"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="font-body text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-body bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="dona"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <LogIn className="w-4 h-4 mr-2" />
            }
            Accedi
          </Button>
        </form>

        {/* Link utili */}
        <div className="mt-8 space-y-2 text-center text-xs text-muted-foreground font-body">
          <p>
            Non hai ancora un account?{" "}
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
