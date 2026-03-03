/**
 * Partecipa.tsx
 * ─────────────
 * Pagina pubblica di registrazione / login per la community.
 * Supporta:
 *  - email + password (login e registrazione)
 *  - OAuth: Google, Facebook, Apple
 * Dopo il login l'utente viene reindirizzato a /il-mio-percorso.
 */

import { useState, useEffect } from "react";
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
  loadProfile,
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

const oauthProfileSchema = z.object({
  display_name:  z.string().min(2, "Inserisci il tuo nome (min 2 caratteri)"),
  activity_type: z.enum(["corri", "cammino", "altro"]),
  city:          z.string().optional(),
});

type LoginForm      = z.infer<typeof loginSchema>;
type RegisterForm   = z.infer<typeof registerSchema>;
type OAuthProfileForm = z.infer<typeof oauthProfileSchema>;

const activities: ActivityType[] = ["corri", "cammino", "altro"];

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

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Partecipa() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState<"login" | "register">("register");
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Utente autenticato via OAuth senza profilo → completamento profilo
  const [oauthUser, setOauthUser] = useState<{ id: string; name: string } | null>(null);

  // ── Rileva callback OAuth al mount ──
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const profile = await loadProfile(user.id);
      if (profile) {
        navigate("/il-mio-percorso");
      } else {
        // Nuovo utente OAuth senza profilo: chiede di completarlo
        const name =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          "";
        setOauthUser({ id: user.id, name });
      }
    });
  }, [navigate]);

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

  // ── Form completamento profilo OAuth ──
  const oauthProfileForm = useForm<OAuthProfileForm>({
    resolver: zodResolver(oauthProfileSchema),
    defaultValues: {
      display_name:  oauthUser?.name ?? "",
      activity_type: "cammino",
      city:          "",
    },
  });

  // Aggiorna il campo display_name quando arriva oauthUser
  useEffect(() => {
    if (oauthUser?.name) {
      oauthProfileForm.setValue("display_name", oauthUser.name);
    }
  }, [oauthUser, oauthProfileForm]);

  const selectedActivity = registerForm.watch("activity_type") as ActivityType;
  const selectedOauthActivity = oauthProfileForm.watch("activity_type") as ActivityType;

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

    // Supabase segnala email già registrata in due modi:
    // a) authErr con messaggio "User already registered"
    // b) utente restituito ma con identities vuoto (quando email confirmation è attiva)
    const alreadyRegistered =
      authErr?.message?.toLowerCase().includes("already registered") ||
      (authData?.user && (authData.user.identities?.length ?? 0) === 0);

    if (alreadyRegistered) {
      setLoading(false);
      setError("Questa email è già registrata. Usa il tab «Accedi» per entrare.");
      setTab("login");
      loginForm.setValue("email", data.email);
      return;
    }

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

  // ── Login social OAuth ──
  async function handleOAuth(provider: "google" | "facebook" | "apple") {
    if (!supabase) return;
    setOauthLoading(provider);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/partecipa`,
      },
    });
    // La pagina viene reindirizzata al provider → nessun codice dopo questo punto
  }

  // ── Completa profilo dopo OAuth ──
  async function handleCompleteOAuthProfile(data: OAuthProfileForm) {
    if (!oauthUser) return;
    setLoading(true);
    setError(null);
    const profileErr = await upsertProfile({
      id:            oauthUser.id,
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

  // ── Vista completamento profilo OAuth ──
  if (oauthUser) {
    return (
      <NativeLayout>
        <section className="min-h-[80vh] flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Heart className="w-6 h-6 text-dona" />
                <span className="font-heading text-sm uppercase tracking-widest text-dona font-bold">
                  Quasi fatto!
                </span>
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                Completa il tuo profilo
              </h1>
              <p className="font-body text-muted-foreground text-sm">
                Scegli come partecipi al cammino
              </p>
            </div>

            <form onSubmit={oauthProfileForm.handleSubmit(handleCompleteOAuthProfile)} className="space-y-5">
              <div>
                <Label htmlFor="oauth-name" className="font-body text-sm">Nome visualizzato</Label>
                <Input
                  id="oauth-name"
                  placeholder="Es. Mario Rossi"
                  className="mt-1"
                  {...oauthProfileForm.register("display_name")}
                />
                {oauthProfileForm.formState.errors.display_name && (
                  <p className="text-xs text-destructive mt-1 font-body">
                    {oauthProfileForm.formState.errors.display_name.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="font-body text-sm">La tua attività</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {activities.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => oauthProfileForm.setValue("activity_type", act)}
                      className={`flex flex-col items-center gap-1 rounded-lg py-3 px-1 border-2 transition-all text-xs font-body font-medium ${
                        selectedOauthActivity === act
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
                <Label htmlFor="oauth-city" className="font-body text-sm">Città (opzionale)</Label>
                <Input
                  id="oauth-city"
                  placeholder="Es. Roma"
                  className="mt-1"
                  {...oauthProfileForm.register("city")}
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
                  : <Heart className="w-4 h-4 mr-2" />
                }
                Inizia a partecipare
              </Button>
            </form>
          </motion.div>
        </section>
      </NativeLayout>
    );
  }

  // ── Vista principale login / registrazione ──
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
              Registrati, traccia la tua attività e apparirai sulla mappa in diretta
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

          {/* Bottoni OAuth */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              {oauthLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              Continua con Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("facebook")}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              {oauthLoading === "facebook" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FacebookIcon />}
              Continua con Facebook
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-body font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              {oauthLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <AppleIcon />}
              Continua con Apple
            </button>
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
                <div className="grid grid-cols-3 gap-2 mt-2">
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
