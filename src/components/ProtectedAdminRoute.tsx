import { Navigate } from "react-router-dom";

/**
 * Protegge le route admin.
 * L'accesso è controllato dal flag localStorage "gp_admin_auth"
 * impostato da AdminLogin dopo la verifica del PIN.
 * Ogni dispositivo ha la propria sessione indipendente — nessun conflitto.
 */
export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const isAuth = localStorage.getItem("gp_admin_auth") === "1";
  if (!isAuth) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
}
