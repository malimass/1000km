import { Navigate } from "react-router-dom";

export default function ProtectedCoachRoute({ children }: { children: React.ReactNode }) {
  const isAuth = localStorage.getItem("gp_coach_auth") === "1";
  if (!isAuth) return <Navigate to="/accedi" replace />;
  return <>{children}</>;
}
