/**
 * NativeRedirect.tsx
 * ──────────────────
 * Su app nativa (Capacitor), redirige la home "/" verso il flusso community:
 * - se l'utente è loggato → /il-mio-percorso
 * - se non loggato → /partecipa
 *
 * Su browser mostra normalmente la pagina Index.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isNativeApp } from "@/lib/capacitorGeo";
import { getAuthToken } from "@/lib/api";

interface Props {
  children: React.ReactNode;
}

export default function NativeRedirect({ children }: Props) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(() => isNativeApp());

  useEffect(() => {
    if (!isNativeApp()) return;

    // Se c'è un token JWT → utente loggato
    if (getAuthToken()) {
      navigate("/il-mio-percorso", { replace: true });
    } else {
      navigate("/partecipa", { replace: true });
    }
    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-dona mx-auto" />
          <p className="font-heading text-lg font-bold text-foreground">
            1000<span className="text-accent">KM</span>DIGRATITUDINE
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
