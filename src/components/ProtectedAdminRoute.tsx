import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Status = "loading" | "authenticated" | "unauthenticated";

/**
 * Protegge le route admin.
 * - Se Supabase non è configurato → lascia passare (backward-compat)
 * - Se Supabase configurato → verifica sessione; reindirizza a /admin-login se assente
 */
export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? "loading" : "authenticated",
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Controlla sessione corrente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    // Ascolta cambii di stato (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
}
