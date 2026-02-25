/**
 * Partecipa.tsx
 * ─────────────
 * Pagina pubblica di registrazione / login per la community.
 * Dopo il login l'utente viene reindirizzato a /il-mio-percorso.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, LogIn, UserPlus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import NativeLayout from "@/components/NativeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  upsertProfile,
  ACTIVITY_EMOJI,
  ACTIVITY_LABEL,
  type ActivityType,
} from "@/lib/communityTracking";

// ─── Schema ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Email non valida"),
  password: z.string().min(6, "Almeno 6 caratteri"),
});

const registerSchema = loginSchema.extend({
  display_name:  z.string().min(2, "Inserisci il tuo nome (min 2 caratteri)"),
  activity_type: z.enum(["corri", "cammino", "altro"]),
  city:          z.string().optional(),
});

type LoginForm    = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const activities: ActivityType[] = ["corri", "cammino", "altro"];

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Partecipa() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState<"login" | "register">("register");
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Form login ──
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // ── Form registrazione ──
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email:         "",
      password:      "",
      display_name:  "",
      activity_type: "cammino",
      city:          "",
    },
  });

  const selectedActivity = registerForm.watch("activity_type") as ActivityType;

  // ── Accedi ──
  async function handleLogin(data: LoginForm) {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    });
    setLoading(false);
    if (err) {
      setError(err.message === "Invalid login credentials"
        ? "Email o password errati."
        : err.message);
      return;
    }
    navigate("/il-mio-percorso");
  }

  // ── Registrati ──
  async function handleRegister(data: RegisterForm) {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    // 1. Crea utente Supabase
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email:    data.email,
      password: data.password,
    });
    if (authErr || !authData.user) {
      setLoading(false);
      setError(authErr?.message ?? "Errore durante la registrazione.");
      return;
    }

    // 2. Salva profilo
    const profileErr = await upsertProfile({
      id:            authData.user.id,
      display_name:  data.display_name,
      activity_type: data.activity_type as ActivityType,
      city:          data.city || null,
    });
    setLoading(false);
    if (profileErr) {
      setError(profileErr);
      return;
    }

    navigate("/il-mio-percorso");
  }

  if (!isSupabaseConfigured) {
    return (
      <NativeLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground font-body text-sm">
            Supabase non configurato. Aggiungi VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
          </p>
        </div>
      </NativeLayout>
    );
  }

  return (
    <NativeLayout>
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Heart className="w-6 h-6 text-dona" />
              <span className="font-heading text-sm uppercase tracking-widest text-dona font-bold">
                Community
              </span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Unisciti al cammino
            </h1>
            <p className="font-body text-muted-foreground text-sm">
              Registrati, traccia la tua attività e appariresti sulla mappa in diretta
            </p>
          </div>

          {/* Tab */}
          <div className="flex rounded-lg overflow-hidden border border-border mb-8">
            {(["register", "login"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
                className={`flex-1 py-3 text-sm font-body font-semibold transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "register" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <UserPlus className="w-4 h-4" /> Registrati
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <LogIn className="w-4 h-4" /> Accedi
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Form registrazione */}
          {tab === "register" && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-5">
              <div>
                <Label htmlFor="display_name" className="font-body text-sm">Nome visualizzato</Label>
                <Input
                  id="display_name"
                  placeholder="Es. Mario Rossi"
                  className="mt-1"
                  {...registerForm.register("display_name")}
                />
                {registerForm.formState.errors.display_name && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {registerForm.formState.errors.display_name.message}
                  </p>
                )}
              </div>

              {/* Tipo di attività */}
              <div>
                <Label className="font-body text-sm">La tua attività</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {activities.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => registerForm.setValue("activity_type", act)}
                      className={`flex flex-col items-center gap-1 rounded-lg py-3 px-1 border-2 transition-all text-xs font-body font-medium ${
                        selectedActivity === act
                          ? "border-dona bg-dona/10 text-dona"
                          : "border-border bg-card text-muted-foreground hover:border-dona/40"
                      }`}
                    >
                      <span className="text-xl">{ACTIVITY_EMOJI[act]}</span>
                      <span>{ACTIVITY_LABEL[act]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="city" className="font-body text-sm">Città (opzionale)</Label>
                <Input
                  id="city"
                  placeholder="Es. Roma"
                  className="mt-1"
                  {...registerForm.register("city")}
                />
              </div>

              <div>
                <Label htmlFor="reg-email" className="font-body text-sm">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="tua@email.it"
                  className="mt-1"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="reg-password" className="font-body text-sm">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="Almeno 6 caratteri"
                  className="mt-1"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
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
                  : <UserPlus className="w-4 h-4 mr-2" />
                }
                Iscriviti alla community
              </Button>
            </form>
          )}

          {/* Form login */}
          {tab === "login" && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <div>
                <Label htmlFor="login-email" className="font-body text-sm">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tua@email.it"
                  className="mt-1"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="login-password" className="font-body text-sm">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="La tua password"
                  className="mt-1"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
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
          )}

          <p className="text-center text-xs text-muted-foreground font-body mt-6 leading-relaxed">
            Partecipando accetti che la tua posizione GPS venga mostrata sulla mappa
            pubblica di 1000kmdigratitudine.it durante il tracciamento.
          </p>
        </motion.div>
      </section>
    </NativeLayout>
  );
}
